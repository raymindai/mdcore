// Owner-only bulk ontology build for a hub.
//
// Iterates the user's documents and runs extractDocOntology on each,
// merging into concept_index + concept_relations. Idempotent — repeat
// calls converge on the same set of concepts.
//
// Returns progress as a JSON response (not streaming yet — for the
// initial build size, a single POST is fine; we'll stream if hubs
// regularly exceed a few hundred docs).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getServerUserId } from "@/lib/supabase-server";
import { extractDocOntology } from "@/lib/extract-doc-ontology";
import { appendHubLog } from "@/lib/hub-log";

type RouteParams = { params: Promise<{ slug: string }> };

const MAX_DOCS_PER_CALL = 50;
const MIN_CHARS = 200;

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "service unavailable" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const callerUserId = verified?.userId || req.headers.get("x-user-id") || (await getServerUserId());
  if (!callerUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("hub_slug", slug)
    .single();
  if (!profile || profile.id !== callerUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Optional caller hint: only re-extract docs newer than this
  // timestamp. Lets the client poll for incremental updates without
  // re-running the LLM on docs we already covered.
  let sinceIso: string | null = null;
  let limitOverride: number | null = null;
  try {
    const body = await req.json();
    if (typeof body?.since === "string") sinceIso = body.since;
    if (typeof body?.limit === "number" && body.limit > 0) {
      limitOverride = Math.min(body.limit, MAX_DOCS_PER_CALL);
    }
  } catch { /* no body — use defaults */ }

  const limit = limitOverride ?? MAX_DOCS_PER_CALL;

  let query = supabase
    .from("documents")
    .select("id, title, markdown, updated_at")
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (sinceIso) query = query.gt("updated_at", sinceIso);
  const { data: docs, error: docsError } = await query;
  if (docsError) {
    return NextResponse.json({ error: "failed_to_load_docs" }, { status: 500 });
  }

  const eligible = (docs || []).filter((d) => (d.markdown || "").trim().length >= MIN_CHARS);
  if (eligible.length === 0) {
    return NextResponse.json({
      processed: 0,
      conceptsWritten: 0,
      relationsWritten: 0,
      remaining: 0,
      lastUpdatedAt: null,
    });
  }

  let totalConcepts = 0;
  let totalRelations = 0;
  const failures: string[] = [];

  for (const d of eligible) {
    try {
      const r = await extractDocOntology({
        supabase,
        userId: profile.id,
        docId: d.id,
        title: d.title || "Untitled",
        markdown: d.markdown || "",
      });
      totalConcepts += r.conceptsWritten;
      totalRelations += r.relationsWritten;
      if (r.skipped === "extract_failed") failures.push(d.id);
    } catch (err) {
      console.warn("ontology/build: doc failed", d.id, err);
      failures.push(d.id);
    }
  }

  // Hub log entry — gives the in-editor activity feed one line per
  // bulk build instead of N per-doc lines. Reuses the existing
  // schema.updated event since ontology is the hub's schema layer.
  try {
    await appendHubLog({
      userId: profile.id,
      event: "schema.updated",
      targetType: "schema",
      summary: `Built ontology over ${eligible.length} doc${eligible.length === 1 ? "" : "s"} — ${totalConcepts} concepts, ${totalRelations} relations`,
    });
  } catch { /* best-effort */ }

  // Refresh concept embeddings so the digest endpoint and chat
  // grounding pick up new vectors right away. Fire-and-forget.
  try {
    const auth = req.headers.get("authorization");
    fetch(`${req.nextUrl.origin}/api/embed/concepts`, {
      method: "POST",
      headers: auth ? { Authorization: auth } : { "x-user-id": profile.id },
    }).catch(() => { /* best-effort */ });
  } catch { /* ignore */ }

  return NextResponse.json({
    processed: eligible.length,
    conceptsWritten: totalConcepts,
    relationsWritten: totalRelations,
    failures,
    remaining: docs?.length === limit ? "more" : 0,
    lastUpdatedAt: eligible[eligible.length - 1]?.updated_at || null,
  });
}
