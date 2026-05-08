// Backfill chunk-level embeddings for all yc-demo docs.
// Calls /api/embed/<id> for each doc with the owner's auth, which now
// also refreshes document_chunks.

import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const HUB_SLUG = "yc-demo";

const { data: profile } = await s
  .from("profiles")
  .select("id, email")
  .eq("hub_slug", HUB_SLUG)
  .single();

if (!profile) {
  console.error("hub not found:", HUB_SLUG);
  process.exit(1);
}

const { data: docs } = await s
  .from("documents")
  .select("id, title")
  .eq("user_id", profile.id)
  .eq("is_draft", false)
  .is("deleted_at", null)
  .is("password_hash", null)
  .order("updated_at", { ascending: false })
  .limit(50);

console.log(`Backfilling ${docs.length} docs...`);

// Service-role JWT can't be the supabase user JWT for /api/embed.
// Instead pass x-user-id header directly (the route accepts it).
let totalChunks = 0;
let totalEmbedded = 0;
let totalDeleted = 0;
let docFailed = 0;

for (const doc of docs) {
  try {
    const res = await fetch(`http://localhost:3002/api/embed/${doc.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": profile.id,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      console.log(`✗ ${doc.id} ${doc.title} :: ${res.status} ${json.error}`);
      docFailed++;
      continue;
    }
    if (json.chunks) {
      totalChunks += json.chunks.chunks;
      totalEmbedded += json.chunks.embedded;
      totalDeleted += json.chunks.deleted;
      console.log(
        `✓ ${doc.id} ${doc.title?.slice(0, 50)} :: chunks=${json.chunks.chunks} embedded=${json.chunks.embedded} deleted=${json.chunks.deleted}`,
      );
    } else {
      console.log(`- ${doc.id} ${doc.title?.slice(0, 50)} :: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    console.log(`✗ ${doc.id} :: ${err.message}`);
    docFailed++;
  }
}

console.log(
  `\nDone. docs_failed=${docFailed}, total_chunks=${totalChunks}, total_embedded=${totalEmbedded}, total_deleted=${totalDeleted}`,
);
