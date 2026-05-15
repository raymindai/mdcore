// /api/cron/lifecycle-sweep
//
// Periodic backfill that fires every doc + bundle through the same
// lifecycle endpoints that the user-facing creation routes already
// hit (embedding, graph analyse, ontology / concept extraction).
//
// Why this exists: content arrives via many paths — the editor's
// POST /api/docs, /api/import/*, MCP server, GitHub Action sync,
// direct Supabase REST calls in scripts, anywhere a future
// integration writes a row. Wiring auto-queue into each creation
// site is fragile and easy to forget. A periodic sweep catches every
// row regardless of origin and converges them to the "ready to
// fetch" state.
//
// Idempotency: every downstream endpoint already keys on a hash
// (embeddings → embedding_source_hash; graph → graph_generated_at +
// member doc set), so a row that's already in the right shape is a
// no-op. Safe to run aggressively.
//
// Scheduling: vercel.json declares this at "*/5 * * * *". Each run
// is bounded so it finishes well inside Vercel's 300s function
// timeout even when LLM latency is unfriendly.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

// Per-run caps — keep total wall time inside the function timeout
// even when downstream LLMs are slow.
const DOC_EMBED_LIMIT = 20;          // ~2s each, parallel
const BUNDLE_EMBED_LIMIT = 20;       // ~2s each
const BUNDLE_GRAPH_LIMIT = 3;        // ~60-90s each, serial-ish
const ONTOLOGY_LIMIT = 10;           // ~10-30s each
const MAX_AGE_DAYS = 30;             // ignore rows older than this — assume
                                      // they're intentionally degraded or
                                      // there's a real bug we'd rather see.

interface SweepResult {
  ok: true;
  docs_embedded: number;
  bundles_embedded: number;
  bundles_graphed: number;
  ontology_refreshed: number;
  duration_ms: number;
  notes: string[];
}

async function authorize(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  // Production must have CRON_SECRET set. Without it the endpoint is
  // public and every anonymous request would trigger LLM calls
  // (cost amplification attack). Open path only in dev where someone
  // is iterating locally on the sweep logic.
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  const header = req.headers.get("authorization");
  return header === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  return runSweep(req);
}

export async function POST(req: NextRequest) {
  return runSweep(req);
}

async function runSweep(req: NextRequest): Promise<NextResponse> {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const startedAt = Date.now();
  const origin = req.nextUrl.origin;
  const notes: string[] = [];
  const cutoffIso = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // ─── 1. Docs missing embeddings ────────────────────────────────
  // Authenticated docs only — anonymous docs can be embedded but the
  // owner_id header path needs an authenticated identity. The embed
  // endpoint is fine with anon, but we'd be running LLM calls on
  // doc bodies that will get cleaned up by the existing
  // /api/cleanup cron anyway. Skip to keep work bounded.
  let docsEmbedded = 0;
  try {
    const { data: pendingDocs } = await supabase
      .from("documents")
      .select("id, user_id")
      .is("embedding", null)
      .is("deleted_at", null)
      .not("user_id", "is", null)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(DOC_EMBED_LIMIT);

    const tasks = (pendingDocs || []).map(async (d) => {
      try {
        const res = await fetch(`${origin}/api/embed/${d.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": d.user_id as string,
          },
        });
        if (res.ok) docsEmbedded++;
      } catch (err) {
        notes.push(`doc-embed ${d.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    await Promise.all(tasks);
  } catch (err) {
    notes.push(`doc-embed query failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── 2. Bundles missing embeddings ─────────────────────────────
  let bundlesEmbedded = 0;
  try {
    const { data: pendingBundles } = await supabase
      .from("bundles")
      .select("id, user_id")
      .is("embedding", null)
      .not("user_id", "is", null)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(BUNDLE_EMBED_LIMIT);

    const tasks = (pendingBundles || []).map(async (b) => {
      try {
        const res = await fetch(`${origin}/api/embed/bundle/${b.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": b.user_id as string,
          },
        });
        if (res.ok) bundlesEmbedded++;
      } catch (err) {
        notes.push(`bundle-embed ${b.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    await Promise.all(tasks);
  } catch (err) {
    notes.push(`bundle-embed query failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── 3. Bundles missing graph_data (and have ≥2 members) ───────
  // The LLM call is the long pole. Cap aggressively and serial-ish
  // so a single run can't run out of memory holding many in-flight
  // analyses at once.
  let bundlesGraphed = 0;
  try {
    const { data: bundlesWithoutGraph } = await supabase
      .from("bundles")
      .select("id, user_id")
      .is("graph_data", null)
      .not("user_id", "is", null)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(BUNDLE_GRAPH_LIMIT * 3); // over-fetch then filter by member count

    for (const b of bundlesWithoutGraph || []) {
      if (bundlesGraphed >= BUNDLE_GRAPH_LIMIT) break;
      const { count: memberCount } = await supabase
        .from("bundle_documents")
        .select("document_id", { count: "exact", head: true })
        .eq("bundle_id", b.id);
      if ((memberCount || 0) < 2) continue;
      try {
        const res = await fetch(`${origin}/api/bundles/${b.id}/graph`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": b.user_id as string,
          },
          body: JSON.stringify({}),
        });
        if (res.ok) bundlesGraphed++;
      } catch (err) {
        notes.push(`bundle-graph ${b.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    notes.push(`bundle-graph query failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── 4. Docs needing ontology refresh ──────────────────────────
  // A doc has been "ontology-extracted" when there's at least one
  // concept_index row whose `doc_ids` array contains the doc id.
  // We can't easily LEFT JOIN against a JSONB array index in PostgREST,
  // so the pattern is: pull recent docs lacking embeddings → after
  // they get embedded above, the next sweep catches them here. Two-
  // pass design avoids a complex single-pass query.
  let ontologyRefreshed = 0;
  try {
    // Find candidate docs: recent + has embedding (so the analyser
    // has something to work with) + not represented in concept_index.
    // Use an RPC if available, otherwise fall back to a tractable
    // approximation: look at docs without a corresponding hub_log entry
    // for "concept.extracted". For now, just pick recent embedded
    // docs that have NEVER been touched by the concept passes — the
    // ontology-refresh endpoint is idempotent so re-running is safe.
    const { data: recentEmbedded } = await supabase
      .from("documents")
      .select("id, user_id, title, markdown")
      .not("embedding", "is", null)
      .not("user_id", "is", null)
      .is("deleted_at", null)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(ONTOLOGY_LIMIT);

    const tasks = (recentEmbedded || []).map(async (d) => {
      try {
        const { enqueueOntologyRefresh } = await import("@/lib/ontology-refresh");
        await enqueueOntologyRefresh({
          supabase,
          userId: d.user_id as string,
          docId: d.id as string,
          title: (d.title as string) || "",
          markdown: (d.markdown as string) || "",
        });
        ontologyRefreshed++;
      } catch (err) {
        notes.push(`ontology ${d.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    await Promise.all(tasks);
  } catch (err) {
    notes.push(`ontology query failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const out: SweepResult = {
    ok: true,
    docs_embedded: docsEmbedded,
    bundles_embedded: bundlesEmbedded,
    bundles_graphed: bundlesGraphed,
    ontology_refreshed: ontologyRefreshed,
    duration_ms: Date.now() - startedAt,
    notes,
  };
  return NextResponse.json(out);
}
