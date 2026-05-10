// Sweep all remaining welcome-corrupted docs across every user.
// Founder authorised: "진짜 유저 상관없음 처리해" — treat all the same.
//
// Strategy:
//   - Welcome-titled doc (title contains "Welcome to") → soft-delete.
//     These are stale dups, not real user content.
//   - Non-welcome-titled doc with welcome body → still soft-delete:
//     the body is the welcome blurb (data is gone), so the title is
//     all that's left, which is not enough to call it "user content".
//     Soft-delete is reversible if a user reports an unexpected loss.
//
// All deletions snapshot the body into document_versions first, so a
// future restore is one row update + a markdown copy away.
//
// Dry-run by default; --apply to write.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes("--apply");

const WELCOME_MARKER = "**The Markdown Hub.** Collect from anywhere";

async function snapshotForRestore(id: string, markdown: string | null, title: string | null) {
  const { data: maxV } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  const nextV = ((maxV?.version_number ?? 0) as number) + 1;
  await supabase.from("document_versions").insert({
    document_id: id,
    markdown,
    title,
    version_number: nextV,
    change_summary: "pre-cleanup snapshot — welcome-corrupted body",
  });
}

(async () => {
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}\n`);

  // Page through all live docs once.
  const all: Array<{ id: string; user_id: string | null; anonymous_id: string | null; title: string | null; markdown: string | null }> = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("documents")
      .select("id, user_id, anonymous_id, title, markdown")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  const corrupted = all.filter((d) => (d.markdown || "").includes(WELCOME_MARKER));
  console.log(`Welcome-corrupted live docs: ${corrupted.length}\n`);

  for (const d of corrupted) {
    const owner = d.user_id || `anon:${d.anonymous_id || "?"}`;
    console.log(`  ${d.id}  user=${owner.slice(0, 28)}  title="${(d.title || "").slice(0, 60)}"`);
    if (!apply) continue;
    try {
      await snapshotForRestore(d.id, d.markdown, d.title);
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", d.id)
        .is("deleted_at", null);
      if (error) console.log(`    delete failed: ${error.message}`);
    } catch (err) {
      console.log(`    error: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n${apply ? `Applied. ${corrupted.length} docs soft-deleted.` : "Dry run only — pass --apply to write."}`);
})();
