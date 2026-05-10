// Full corruption audit across the documents table.
//
// Two failure modes detected:
//   1. Body is the welcome blurb (the SAMPLE_WELCOME race) — body
//      contains "**The Markdown Hub.** Collect from anywhere".
//   2. Title↔H1 mismatch beyond the welcome case — body H1 differs
//      meaningfully from the stored title (cross-contamination
//      from another doc).
//
// Scope: every non-deleted, non-readonly user doc.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

interface DocRow {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  title: string | null;
  markdown: string | null;
  created_at: string;
  updated_at: string;
}

const WELCOME_MARKER = "**The Markdown Hub.** Collect from anywhere";

function extractH1(md: string | null): string | null {
  if (!md) return null;
  const m = md.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, " ").trim();
}

function similarity(a: string, b: string): number {
  // Cheap ratio: count matching whitespace-separated tokens.
  const sa = new Set(normalize(a).split(" ").filter(Boolean));
  const sb = new Set(normalize(b).split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let hit = 0;
  for (const t of sa) if (sb.has(t)) hit++;
  return hit / Math.max(sa.size, sb.size);
}

(async () => {
  // Page through to avoid the 1000-row default limit.
  const all: DocRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, user_id, anonymous_id, title, markdown, created_at, updated_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...(data as DocRow[]));
    if (data.length < pageSize) break;
  }
  console.log(`Total live docs: ${all.length}\n`);

  const welcomeBodied: DocRow[] = [];
  const titleBodyMismatch: { doc: DocRow; h1: string; sim: number }[] = [];
  const noH1AtAll: DocRow[] = [];

  for (const doc of all) {
    const md = doc.markdown || "";
    const isWelcome = md.includes(WELCOME_MARKER);
    if (isWelcome) {
      welcomeBodied.push(doc);
      continue;
    }
    const h1 = extractH1(md);
    if (!h1) {
      if (md.trim().length > 50) noH1AtAll.push(doc);
      continue;
    }
    const t = (doc.title || "").trim();
    if (!t) continue;
    const sim = similarity(t, h1);
    // Heuristic: if title and H1 share less than 30% of tokens AND
    // length ratio is reasonable, flag as mismatch.
    if (sim < 0.3) {
      titleBodyMismatch.push({ doc, h1, sim });
    }
  }

  console.log(`── (1) Welcome-bodied docs: ${welcomeBodied.length} ──`);
  const byUserWelcome = new Map<string, DocRow[]>();
  for (const d of welcomeBodied) {
    const k = d.user_id || `anon:${d.anonymous_id || "?"}`;
    const arr = byUserWelcome.get(k) || [];
    arr.push(d);
    byUserWelcome.set(k, arr);
  }
  Array.from(byUserWelcome.entries()).forEach(([k, docs]) => {
    console.log(`  user=${k}  count=${docs.length}`);
    for (const d of docs) console.log(`    ${d.id}  "${d.title}"  updated=${d.updated_at}`);
  });

  console.log(`\n── (2) Title↔H1 strong mismatch: ${titleBodyMismatch.length} ──`);
  const byUserMismatch = new Map<string, typeof titleBodyMismatch>();
  for (const m of titleBodyMismatch) {
    const k = m.doc.user_id || `anon:${m.doc.anonymous_id || "?"}`;
    const arr = byUserMismatch.get(k) || [];
    arr.push(m);
    byUserMismatch.set(k, arr);
  }
  Array.from(byUserMismatch.entries()).forEach(([k, ms]) => {
    console.log(`  user=${k}  count=${ms.length}`);
    for (const { doc, h1, sim } of ms) {
      console.log(`    ${doc.id}  sim=${sim.toFixed(2)}  title="${doc.title}"  H1="${h1.slice(0, 70)}"`);
    }
  });

  console.log(`\n── (3) No H1 in body (title can't be H1-derived): ${noH1AtAll.length} ──`);
  for (const d of noH1AtAll.slice(0, 30)) {
    const head = (d.markdown || "").slice(0, 80).replace(/\n/g, " ");
    console.log(`  ${d.id}  user=${d.user_id || "anon"}  title="${d.title}"  body="${head}…"`);
  }
  if (noH1AtAll.length > 30) console.log(`  …and ${noH1AtAll.length - 30} more`);

  // Aggregate severity
  const totalAffected = welcomeBodied.length + titleBodyMismatch.length;
  console.log(`\n── Summary ──`);
  console.log(`  Welcome-corrupted:        ${welcomeBodied.length}`);
  console.log(`  Title↔H1 mismatch:        ${titleBodyMismatch.length}`);
  console.log(`  Total likely-corrupted:   ${totalAffected} of ${all.length} (${Math.round(totalAffected / all.length * 100)}%)`);
  console.log(`  Docs with no H1:          ${noH1AtAll.length}`);
})();
