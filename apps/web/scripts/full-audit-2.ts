// Round-2 audit: look at other write surfaces that might have
// similar race issues — bundles, profiles, suspicious empty bodies,
// and same-content cluster signatures.
//
// Read-only.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

interface DocRow { id: string; user_id: string | null; anonymous_id: string | null; title: string | null; markdown: string | null; created_at: string; updated_at: string; source: string | null }
interface BundleRow { id: string; user_id: string | null; title: string | null; description: string | null; updated_at: string; is_draft: boolean | null }

const summaryHash = (md: string) => {
  // First 200 chars normalised to a coarse signature, so we can
  // cluster docs that share an identical opening.
  return md.replace(/\s+/g, " ").trim().slice(0, 200);
};

(async () => {
  // ── Audit 1: docs whose body opens with the SAME first 200 chars
  //    as another doc owned by the same user. Beyond the welcome
  //    blurb, these are likely cross-contamination from the
  //    tab-switch race.
  console.log("══ Audit 1: same-prefix cluster (excluding welcome) ══\n");
  const allDocs: DocRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("documents")
      .select("id, user_id, anonymous_id, title, markdown, created_at, updated_at, source")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allDocs.push(...(data as DocRow[]));
    if (data.length < 1000) break;
  }
  const byOwnerPrefix = new Map<string, DocRow[]>();
  for (const d of allDocs) {
    const md = d.markdown || "";
    if (md.includes("**The Markdown Hub.** Collect from anywhere")) continue; // already audited
    if (md.length < 50) continue;
    const owner = d.user_id || `anon:${d.anonymous_id || "?"}`;
    const key = `${owner}::${summaryHash(md)}`;
    const arr = byOwnerPrefix.get(key) || [];
    arr.push(d);
    byOwnerPrefix.set(key, arr);
  }
  let prefixHits = 0;
  Array.from(byOwnerPrefix.entries()).forEach(([k, arr]) => {
    if (arr.length < 2) return;
    prefixHits += arr.length;
    console.log(`  cluster size=${arr.length}  owner=${k.split("::")[0]}`);
    console.log(`  prefix: ${k.split("::")[1]}`);
    for (const d of arr) {
      console.log(`    ${d.id}  title="${d.title}"  updated=${d.updated_at}`);
    }
    console.log("");
  });
  console.log(`  total docs in same-prefix clusters: ${prefixHits}\n`);

  // ── Audit 2: bundles whose description / title looks broken.
  console.log("══ Audit 2: bundles with suspicious shape ══\n");
  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, user_id, title, description, updated_at, is_draft")
    .order("updated_at", { ascending: false });
  const bRows = (bundles as BundleRow[] | null) || [];
  const bWelcome = bRows.filter((b) => (b.description || "").includes("**The Markdown Hub.** Collect from anywhere"));
  const bEmpty = bRows.filter((b) => (!b.title || b.title.trim().length === 0) && !b.is_draft);
  const bDupTitle = (() => {
    const byUserTitle = new Map<string, BundleRow[]>();
    for (const b of bRows) {
      if (!b.user_id || !b.title) continue;
      const k = `${b.user_id}::${b.title.trim().toLowerCase()}`;
      const arr = byUserTitle.get(k) || [];
      arr.push(b);
      byUserTitle.set(k, arr);
    }
    const dups: BundleRow[][] = [];
    Array.from(byUserTitle.values()).forEach((arr) => {
      if (arr.length > 1) dups.push(arr);
    });
    return dups;
  })();
  console.log(`  bundles total:               ${bRows.length}`);
  console.log(`  welcome-blurb in description: ${bWelcome.length}`);
  console.log(`  empty-title published:        ${bEmpty.length}`);
  console.log(`  same-title same-user dups:    ${bDupTitle.length} cluster(s)`);
  for (const cluster of bDupTitle) {
    console.log(`    cluster: "${cluster[0].title}"  user=${cluster[0].user_id}`);
    for (const b of cluster) console.log(`      ${b.id}  updated=${b.updated_at}  draft=${b.is_draft}`);
  }
  console.log("");

  // ── Audit 3: docs that exist but have IDENTICAL markdown md5 to
  //    another doc by the same user. Migration 029 prevents new
  //    inserts but pre-existing dups remain.
  console.log("══ Audit 3: identical-content dups (same user) ══\n");
  const byOwnerExact = new Map<string, DocRow[]>();
  for (const d of allDocs) {
    if (!d.user_id) continue;
    const md = (d.markdown || "").trim();
    if (md.length < 50) continue;
    const key = `${d.user_id}::${md.length}::${md.slice(0, 60)}::${md.slice(-60)}`;
    const arr = byOwnerExact.get(key) || [];
    arr.push(d);
    byOwnerExact.set(key, arr);
  }
  let exactHits = 0;
  Array.from(byOwnerExact.entries()).forEach(([, arr]) => {
    if (arr.length < 2) return;
    exactHits += arr.length;
    console.log(`  ${arr.length}× identical body — user=${arr[0].user_id}  title="${arr[0].title}"`);
    for (const d of arr) console.log(`    ${d.id}  updated=${d.updated_at}`);
    console.log("");
  });
  console.log(`  total docs with an identical-body sibling: ${exactHits}\n`);

  // ── Audit 4: docs with empty markdown but is_draft=false (i.e.,
  //    "published" but no content). These are the ghost-save
  //    failure mode where a save fired before content loaded.
  console.log("══ Audit 4: ghost-empty published docs ══\n");
  const { data: ghosts } = await supabase
    .from("documents")
    .select("id, user_id, title, markdown, updated_at, created_at, is_draft")
    .is("deleted_at", null)
    .eq("is_draft", false)
    .or("markdown.is.null,markdown.eq.");
  console.log(`  empty-but-published: ${ghosts?.length || 0}`);
  for (const d of (ghosts || []).slice(0, 30)) {
    console.log(`    ${d.id}  user=${d.user_id || "anon"}  title="${d.title}"  updated=${d.updated_at}`);
  }

  // ── Audit 5: source distribution of welcome-corrupted docs to
  //    prove which write paths produced them.
  console.log("\n══ Audit 5: source field of welcome-corrupted docs ══\n");
  const welcomeSrc = allDocs.filter((d) => (d.markdown || "").includes("**The Markdown Hub.** Collect from anywhere"));
  const srcCount: Record<string, number> = {};
  for (const d of welcomeSrc) {
    const k = d.source || "(null)";
    srcCount[k] = (srcCount[k] || 0) + 1;
  }
  for (const [k, n] of Object.entries(srcCount)) console.log(`  source="${k}": ${n}`);
})();
