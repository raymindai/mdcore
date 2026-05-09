// Hardcoded recovery for docs whose pre-backfill titles are known from
// the script run's dry-run output (titles that document_versions didn't
// capture because rename via auto-save title-only PATCHes don't snapshot).
//
// This is a one-shot, explicit list. Re-run with --apply to commit.

import { createClient } from "@supabase/supabase-js";

const recovery = [
  // hi@raymind.ai — duplicates of "Welcome to mdfy.app" template that
  // had user-set custom titles before the backfill.
  { id: "L-DiAVLu", oldTitle: "Untitled Bundle" },
  { id: "p5-iP1-G", oldTitle: "test 01" },
  { id: "P7woAio_", oldTitle: "Share Config" },
  { id: "5FXOVy6E", oldTitle: "mdfy Karparthy Wiki" },
  { id: "DIPtdsI2", oldTitle: "test 01" },
  { id: "kz4EowYC", oldTitle: "mdfy Karparthy Wiki" },
  { id: "WKlIRJfb", oldTitle: "Bundle Test 001" },
  { id: "A4-IYgHM", oldTitle: "Bundle Test 001" },
  { id: "Ak35Q0mB", oldTitle: "test 01" },
  // yc@mdfy.app — same scenario, semantic titles overwritten by template H1
  { id: "5pDOcoMN", oldTitle: "AI Memory Stack" },
  { id: "OAo327bz", oldTitle: "mdfy Launch Pack" },
  { id: "fcUSBezL", oldTitle: "AI Memory Stack" },
  { id: "eEVnD3V6", oldTitle: "Project Acme — Full Context" },
  { id: "7GE1N3_e", oldTitle: "AI Memory Stack" },
];

function rewriteH1(md, t) {
  if (!md) return `# ${t}\n`;
  const lines = md.split("\n");
  const idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (idx >= 0) { lines[idx] = `# ${t}`; return lines.join("\n"); }
  return `# ${t}\n\n${md}`;
}

const apply = process.argv.includes("--apply");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("env missing"); process.exit(1); }
const s = createClient(url, key);

console.log(`${apply ? "APPLY" : "DRY-RUN"} — ${recovery.length} items`);
let done = 0, failed = 0, skipped = 0;
for (const r of recovery) {
  const { data: doc } = await s
    .from("documents")
    .select("id, title, markdown, deleted_at")
    .eq("id", r.id)
    .maybeSingle();
  if (!doc) { console.log(`  ✗ ${r.id} not found`); skipped++; continue; }
  if (doc.deleted_at) { console.log(`  - ${r.id} is in trash, skipping`); skipped++; continue; }
  if (doc.title === r.oldTitle) { console.log(`  - ${r.id} already "${r.oldTitle}"`); skipped++; continue; }
  console.log(`  ${r.id}  "${(doc.title || "").slice(0, 40)}" → "${r.oldTitle}"`);
  if (!apply) continue;
  const newMd = rewriteH1(doc.markdown || "", r.oldTitle);
  const { error } = await s
    .from("documents")
    .update({ title: r.oldTitle, markdown: newMd })
    .eq("id", r.id);
  if (error) { failed++; console.log(`    ✗ ${error.message}`); continue; }
  done++;
}
console.log("");
console.log(`done=${done} / failed=${failed} / skipped=${skipped}`);
