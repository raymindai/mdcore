// One-off inspection: print the current head of each suspect doc
// so we can decide whether the body was actually mutated. Read-only.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const ids = ["5HCYUb9C", "ycd01N9A", "4GQ-gGqW", "eEVnD3V6"];

(async () => {
  for (const id of ids) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id, title, markdown, updated_at, created_at, source")
      .eq("id", id)
      .single();
    if (!doc) {
      console.log(`\n=== ${id} === NOT FOUND`);
      continue;
    }
    const md = (doc.markdown || "").slice(0, 800);
    const lines: string[] = md.split("\n");
    const h1Line = lines.find((l: string) => /^#\s+/.test(l)) || "(no H1)";
    console.log(`\n=== ${id} ===`);
    console.log(`  title:      ${doc.title}`);
    console.log(`  H1 in body: ${h1Line}`);
    console.log(`  source:     ${doc.source}`);
    console.log(`  created:    ${doc.created_at}`);
    console.log(`  updated:    ${doc.updated_at}`);
    console.log(`  ── first 6 lines ──`);
    console.log(lines.slice(0, 6).map((l) => `  ${l}`).join("\n"));

    // Also fetch any version rows we have so we can show change history.
    const { data: versions } = await supabase
      .from("document_versions")
      .select("version_number, title, markdown, created_at, change_summary")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(5);
    console.log(`  ── versions (latest 5) ──`);
    for (const v of versions || []) {
      const vLines: string[] = (v.markdown || "").split("\n");
      const vH1 = vLines.find((l: string) => /^#\s+/.test(l)) || "(no H1)";
      console.log(`    v${v.version_number}  ${v.created_at}  title="${v.title}"  H1="${vH1.slice(0, 80)}"  ${v.change_summary || ""}`);
    }
  }
})();
