// Hunts for any pre-corruption copy of the four mutated docs in
// auxiliary tables (document_versions, document_chunks,
// concept_index doc_ids, hub_log) so we can recover the original
// content if any subsystem cached it before the welcome-overwrite.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const ids = ["5HCYUb9C", "ycd01N9A", "4GQ-gGqW", "eEVnD3V6"];
const titleHints: Record<string, string> = {
  "5HCYUb9C": "Project Acme",
  "ycd01N9A": "Captured: Claude",
  "4GQ-gGqW": "AI Memory Stack",
  "eEVnD3V6": "AI Bundle Generation",
};

(async () => {
  for (const id of ids) {
    console.log(`\n=== ${id} (title hint: "${titleHints[id]}") ===`);

    // 1) Versions for this id (any).
    const { data: versions } = await supabase
      .from("document_versions")
      .select("version_number, title, markdown, created_at, change_summary")
      .eq("document_id", id)
      .order("version_number", { ascending: true });
    console.log(`  document_versions: ${versions?.length || 0} row(s)`);
    for (const v of versions || []) {
      const lines: string[] = (v.markdown || "").split("\n");
      const h1 = lines.find((l: string) => /^#\s+/.test(l)) || "(no H1)";
      console.log(`    v${v.version_number}  ${v.created_at}  title="${v.title}"  H1="${h1.slice(0, 60)}"  bytes=${(v.markdown || "").length}  ${v.change_summary || ""}`);
    }

    // 2) Chunks for this id.
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("chunk_index, content, created_at")
      .eq("document_id", id)
      .order("chunk_index", { ascending: true })
      .limit(5);
    console.log(`  document_chunks (first 5): ${chunks?.length || 0} row(s)`);
    for (const c of chunks || []) {
      const head = (c.content || "").slice(0, 80).replace(/\n/g, " ");
      console.log(`    chunk[${c.chunk_index}]  ${c.created_at}  "${head}…"`);
    }

    // 3) Search version table by title hint — maybe the original
    //    survives under a different document_id (e.g. auto-synthesis
    //    or duplicate before the corruption).
    const hint = titleHints[id];
    if (hint) {
      const { data: byTitle } = await supabase
        .from("document_versions")
        .select("document_id, version_number, title, markdown, created_at")
        .ilike("title", `%${hint.slice(0, 20)}%`)
        .order("created_at", { ascending: true })
        .limit(10);
      console.log(`  versions matching title hint "${hint}": ${byTitle?.length || 0}`);
      for (const v of byTitle || []) {
        const lines: string[] = (v.markdown || "").split("\n");
        const h1 = lines.find((l: string) => /^#\s+/.test(l)) || "(no H1)";
        console.log(`    doc=${v.document_id} v${v.version_number}  ${v.created_at}  title="${v.title}"  H1="${h1.slice(0, 60)}"`);
      }
    }
  }
})();
