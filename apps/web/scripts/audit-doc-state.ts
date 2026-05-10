// Comprehensive audit of the four reported docs + their potential
// backups. Read-only. Use this output to decide what to manually
// restore from the editor's Versions UI.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

interface DocLite { id: string; title: string | null; markdown: string | null; created_at: string | null; updated_at: string | null; deleted_at: string | null }

const reported = ["5HCYUb9C", "ycd01N9A", "4GQ-gGqW", "eEVnD3V6"];

const summarize = (md: string | null): { h1: string; firstPara: string; bytes: number } => {
  const s = md || "";
  const lines: string[] = s.split("\n");
  const h1 = (lines.find((l: string) => /^#\s+/.test(l)) || "(no H1)").slice(0, 80);
  const firstPara = lines.find((l: string) => l.trim() && !/^#/.test(l)) || "";
  return { h1, firstPara: firstPara.slice(0, 100), bytes: s.length };
};

(async () => {
  for (const id of reported) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id, title, markdown, created_at, updated_at, deleted_at, user_id")
      .eq("id", id)
      .single<DocLite & { user_id: string | null }>();
    if (!doc) {
      console.log(`\n=== ${id} :: NOT FOUND`);
      continue;
    }
    const s = summarize(doc.markdown);
    console.log(`\n=== ${id} ===`);
    console.log(`  CURRENT title: "${doc.title}"`);
    console.log(`  CURRENT body H1: ${s.h1}`);
    console.log(`  CURRENT first paragraph: ${s.firstPara}`);
    console.log(`  bytes: ${s.bytes}  updated: ${doc.updated_at}`);
    const looksLikeWelcome = (doc.markdown || "").includes("**The Markdown Hub.** Collect from anywhere");
    console.log(`  body looks like welcome sample: ${looksLikeWelcome ? "YES (corrupted)" : "no"}`);

    // Versions
    const { data: versions } = await supabase
      .from("document_versions")
      .select("version_number, title, markdown, created_at, change_summary")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(10);
    console.log(`  versions: ${versions?.length || 0}`);
    for (const v of versions || []) {
      const vs = summarize(v.markdown);
      const vWelcome = (v.markdown || "").includes("**The Markdown Hub.** Collect from anywhere");
      console.log(`    v${v.version_number}  ${v.created_at}  title="${v.title}"  ${vs.h1}  ${vWelcome ? "(welcome)" : ""}`);
    }

    // Title-similar docs that might be the original.
    if (doc.title) {
      const { data: byTitle } = await supabase
        .from("documents")
        .select("id, title, markdown, created_at, updated_at, deleted_at")
        .eq("title", doc.title)
        .neq("id", id)
        .order("created_at", { ascending: true })
        .limit(10);
      console.log(`  same-title sibling docs: ${byTitle?.length || 0}`);
      for (const d of byTitle || []) {
        const ds = summarize(d.markdown);
        const dWelcome = (d.markdown || "").includes("**The Markdown Hub.** Collect from anywhere");
        console.log(`    ${d.id}  ${d.created_at}  ${ds.h1}  ${d.deleted_at ? "[deleted]" : ""}  ${dWelcome ? "(welcome body)" : ""}`);
      }
    }
  }
})();
