// Backfill bundle embeddings for all yc-demo bundles.
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const HUB_SLUG = "yc-demo";

const { data: profile } = await s
  .from("profiles")
  .select("id")
  .eq("hub_slug", HUB_SLUG)
  .single();
if (!profile) {
  console.error("hub not found");
  process.exit(1);
}

const { data: bundles } = await s
  .from("bundles")
  .select("id, title")
  .eq("user_id", profile.id)
  .eq("is_draft", false);

console.log(`Backfilling ${bundles.length} bundles...`);
let ok = 0, fail = 0, skip = 0;
for (const b of bundles) {
  const res = await fetch(`http://localhost:3002/api/embed/bundle/${b.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": profile.id },
  });
  const json = await res.json();
  if (!res.ok) {
    console.log(`✗ ${b.id} ${b.title} :: ${res.status} ${JSON.stringify(json)}`);
    fail++;
  } else if (json.embedded) {
    console.log(`✓ ${b.id} ${b.title} :: members=${json.member_count}`);
    ok++;
  } else {
    console.log(`- ${b.id} ${b.title} :: ${json.reason || "?"}`);
    skip++;
  }
}
console.log(`\nDone. embedded=${ok}, skipped=${skip}, failed=${fail}`);
