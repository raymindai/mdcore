// Print full body of candidate backup docs so the founder can decide
// which (if any) to manually copy back into the corrupted IDs.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const candidates: Array<{ source: "documents" | "document_versions"; id: string; versionId?: number; label: string }> = [
  { source: "documents",          id: "ycd29v7A", label: "candidate for ycd01N9A (Captured: Claude — Memory Layer Discussion)" },
  { source: "documents",          id: "7GE1N3_e", label: "candidate for 4GQ-gGqW (AI Memory Stack — first authored copy)" },
  { source: "documents",          id: "5pDOcoMN", label: "candidate for 4GQ-gGqW (AI Memory Stack — newest authored copy)" },
  { source: "documents",          id: "ycd09uCk", label: "candidate (Project Acme — Architecture)" },
  { source: "documents",          id: "ycd101jA", label: "candidate (Project Acme — API Design v1)" },
  { source: "documents",          id: "nqNbGNzV", label: "candidate for 5HCYUb9C (Project Acme — Full Context, mismatched H1)" },
];

(async () => {
  for (const c of candidates) {
    console.log(`\n══════════════════════════════════════`);
    console.log(`${c.label}`);
    console.log(`source=${c.source}  id=${c.id}`);
    if (c.source === "documents") {
      const { data: doc } = await supabase
        .from("documents")
        .select("id, title, markdown, updated_at, deleted_at")
        .eq("id", c.id)
        .single();
      if (!doc) { console.log("  NOT FOUND"); continue; }
      console.log(`  title:    ${doc.title}`);
      console.log(`  updated:  ${doc.updated_at}`);
      console.log(`  deleted:  ${doc.deleted_at || "no"}`);
      console.log(`  bytes:    ${(doc.markdown || "").length}`);
      console.log(`  ── body (first 800 chars) ──`);
      console.log((doc.markdown || "").slice(0, 800));
    }
  }
})();
