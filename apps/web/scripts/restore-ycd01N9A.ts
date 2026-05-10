// Targeted restore: ycd01N9A's current body is "# Letta vs Mem0"
// (likely cross-contamination); ycd29v7A appears to be the original
// "Captured: Claude — Memory Layer Discussion" doc with matching
// title and H1 + a clean conversation body.
//
// This script copies ycd29v7A's body into ycd01N9A, snapshots the
// current corrupted state into version history first so the action
// is reversible, and leaves ycd29v7A untouched (it's the source).

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const TARGET_ID = "ycd01N9A";
const SOURCE_ID = "ycd29v7A";

const apply = process.argv.includes("--apply");

(async () => {
  const { data: source } = await supabase
    .from("documents")
    .select("id, title, markdown")
    .eq("id", SOURCE_ID)
    .single();
  const { data: target } = await supabase
    .from("documents")
    .select("id, title, markdown")
    .eq("id", TARGET_ID)
    .single();
  if (!source || !target) {
    console.error("source or target not found");
    process.exit(1);
  }

  console.log("SOURCE:", SOURCE_ID);
  console.log(`  title: ${source.title}`);
  console.log(`  bytes: ${(source.markdown || "").length}`);
  console.log("TARGET:", TARGET_ID);
  console.log(`  title: ${target.title}`);
  console.log(`  bytes: ${(target.markdown || "").length}`);
  console.log(`\nWill copy ${SOURCE_ID} body → ${TARGET_ID} body and set ${TARGET_ID} title from new H1.`);

  if (!apply) {
    console.log("(dry run — pass --apply to write)");
    return;
  }

  // Snapshot current corrupted target into version history.
  const { data: maxV } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", TARGET_ID)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  const nextV = ((maxV?.version_number ?? 0) as number) + 1;
  await supabase.from("document_versions").insert({
    document_id: TARGET_ID,
    markdown: target.markdown,
    title: target.title,
    version_number: nextV,
    change_summary: `pre-recovery snapshot — body copied from ${SOURCE_ID}`,
  });

  // Pull H1 to use as the new title (title invariant — title = H1).
  const newMd = source.markdown || "";
  const h1Match = newMd.match(/^#\s+(.+)/m);
  const newTitle = h1Match ? h1Match[1].trim() : target.title;

  const { error } = await supabase
    .from("documents")
    .update({
      markdown: newMd,
      title: newTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", TARGET_ID);
  if (error) {
    console.error("update failed:", error.message);
    process.exit(1);
  }
  console.log(`\nRestored ${TARGET_ID} from ${SOURCE_ID}.`);
  console.log(`new title: ${newTitle}`);
})();
