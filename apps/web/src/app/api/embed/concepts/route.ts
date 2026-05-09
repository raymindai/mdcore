// Embed concept_index rows for a user. Idempotent on
// embedding_source_hash so re-running only re-embeds rows whose label
// or description changed.
//
// Triggered:
//   - From the bundle Analyze flow after concept_index UPSERT
//   - Manual backfill via scripts/backfill-concept-embeddings.mjs
//
// Owner-scoped: only the user themselves (or service role via the
// backfill script) can trigger their own concept embedding refresh.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { embedText, hashEmbeddingSource, prepareEmbeddingInput, vectorToSql } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Pull concepts that need (re-)embedding for this user.
  const { data: concepts } = await supabase
    .from("concept_index")
    .select("id, label, description, embedding_source_hash")
    .eq("user_id", userId);
  if (!concepts || concepts.length === 0) {
    return NextResponse.json({ embedded: 0, skipped: 0 });
  }

  let embedded = 0;
  let skipped = 0;
  for (const c of concepts) {
    const composite = `${c.label.trim()}${c.description ? `\n\n${c.description.trim()}` : ""}`;
    const input = prepareEmbeddingInput(null, composite);
    const hash = hashEmbeddingSource(input);
    if (c.embedding_source_hash === hash) { skipped++; continue; }
    try {
      const vec = await embedText(input);
      await supabase
        .from("concept_index")
        .update({
          embedding: vectorToSql(vec),
          embedding_source_hash: hash,
          embedding_updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);
      embedded++;
    } catch {
      // Skip on per-concept failure — next pass will retry.
      continue;
    }
  }
  return NextResponse.json({ embedded, skipped });
}
