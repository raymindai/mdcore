// One-shot recovery for the silent-body-mutation regression
// (commit a544ed27 → 0024fbc6).
//
// Restores each listed doc to the most recent document_versions row
// captured BEFORE the bad commit landed, and lists candidate
// Welcome-doc duplicates so the operator can confirm which to delete.
//
// Usage:
//   cd apps/web
//   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  npx tsx scripts/recover-mutated-docs.ts
//
// Pass --apply to actually write. Without it the script prints what
// it WOULD do (dry run) so you can sanity-check before mutating
// anything.
//
// Pass --delete-welcome-dups to additionally soft-delete every
// Welcome-titled doc except the most-recently-updated one PER USER.
// Only runs when --apply is also set.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cutoff for "before the bad commit" — anything with a version row
// captured before this timestamp is considered the pristine pre-
// mutation snapshot. Adjust if you know the exact deployment time.
const REGRESSION_DEPLOYED_AT = "2026-05-10T00:00:00Z";

// IDs the founder explicitly confirmed were mutated.
const KNOWN_MUTATED_DOC_IDS = [
  "5HCYUb9C",
  "ycd01N9A",
  "4GQ-gGqW",
  "eEVnD3V6",
];

// Welcome-dup detection signature. The mutated bodies all converged
// on this exact H1, which is how the founder spotted the problem.
const WELCOME_DUP_TITLE = "Welcome to [mdfy.app](http://mdfy.app)";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const deleteDups = process.argv.includes("--delete-welcome-dups");

const supabase: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface VersionRow {
  id: string;
  document_id: string;
  markdown: string | null;
  title: string | null;
  version_number: number;
  created_at: string;
}

interface DocRow {
  id: string;
  user_id: string | null;
  title: string | null;
  markdown: string | null;
  updated_at: string;
  is_draft: boolean | null;
  deleted_at: string | null;
}

async function restoreDoc(id: string): Promise<{
  id: string;
  status: "skipped" | "would-restore" | "restored" | "error";
  details: string;
}> {
  const { data: doc } = await supabase
    .from("documents")
    .select("id, user_id, title, markdown, updated_at, is_draft, deleted_at")
    .eq("id", id)
    .single<DocRow>();
  if (!doc) return { id, status: "error", details: "doc not found" };

  // Find the newest version row that was captured BEFORE the bad
  // deployment — that's the last good snapshot.
  const { data: versions } = await supabase
    .from("document_versions")
    .select("id, document_id, markdown, title, version_number, created_at")
    .eq("document_id", id)
    .lt("created_at", REGRESSION_DEPLOYED_AT)
    .order("version_number", { ascending: false })
    .limit(1);

  const last = (versions as VersionRow[] | null)?.[0];
  if (!last) {
    return {
      id,
      status: "skipped",
      details: `no pre-regression version; current title="${doc.title}" (cannot restore safely)`,
    };
  }

  if (doc.markdown === last.markdown && doc.title === last.title) {
    return {
      id,
      status: "skipped",
      details: "current state already matches last good version",
    };
  }

  const summary =
    `restore v${last.version_number} from ${last.created_at}: ` +
    `title "${doc.title}" → "${last.title}", body ${doc.markdown?.length ?? 0}B → ${last.markdown?.length ?? 0}B`;

  if (!apply) return { id, status: "would-restore", details: summary };

  // Snapshot the BAD current state into version history before
  // overwriting, so the restore itself is reversible.
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
    markdown: doc.markdown,
    title: doc.title,
    version_number: nextV,
    change_summary: "pre-recovery snapshot of mutated state",
  });

  const { error } = await supabase
    .from("documents")
    .update({
      markdown: last.markdown,
      title: last.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { id, status: "error", details: error.message };
  return { id, status: "restored", details: summary };
}

async function findWelcomeDups() {
  const { data } = await supabase
    .from("documents")
    .select("id, user_id, title, markdown, updated_at, is_draft, deleted_at")
    .eq("title", WELCOME_DUP_TITLE)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const rows = (data as DocRow[] | null) || [];
  // Group by user_id; keep newest per user, mark the rest as candidates.
  const byUser = new Map<string, DocRow[]>();
  for (const r of rows) {
    const k = r.user_id || "anonymous";
    const arr = byUser.get(k) || [];
    arr.push(r);
    byUser.set(k, arr);
  }
  const keep: DocRow[] = [];
  const toDelete: DocRow[] = [];
  Array.from(byUser.values()).forEach((arr) => {
    arr.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    keep.push(arr[0]);
    toDelete.push(...arr.slice(1));
  });
  return { keep, toDelete };
}

async function main() {
  console.log(`Mode: ${apply ? "APPLY (writes will happen)" : "DRY RUN (no writes)"}`);
  console.log(`Regression cutoff: ${REGRESSION_DEPLOYED_AT}\n`);

  console.log("─── Restore mutated docs ────────────────────────────────");
  for (const id of KNOWN_MUTATED_DOC_IDS) {
    const r = await restoreDoc(id);
    console.log(`  ${id.padEnd(10)}  ${r.status.padEnd(13)}  ${r.details}`);
  }

  console.log("\n─── Welcome-dup candidates ─────────────────────────────");
  const { keep, toDelete } = await findWelcomeDups();
  console.log(`  Keep (newest per user): ${keep.length}`);
  for (const d of keep) console.log(`    KEEP   ${d.id}  user=${d.user_id || "anon"}  updated=${d.updated_at}`);
  console.log(`  Candidate deletions:    ${toDelete.length}`);
  for (const d of toDelete) console.log(`    DELETE ${d.id}  user=${d.user_id || "anon"}  updated=${d.updated_at}`);

  if (deleteDups && apply && toDelete.length > 0) {
    console.log("\n─── Soft-deleting Welcome dups ─────────────────────────");
    const ids = toDelete.map((d) => d.id);
    const { error } = await supabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (error) console.error("  delete failed:", error.message);
    else console.log(`  soft-deleted ${ids.length} dup row(s)`);
  } else if (deleteDups && !apply) {
    console.log("\n  (would soft-delete the Candidate Deletions above with --apply)");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Recovery failed:", err);
  process.exit(1);
});
