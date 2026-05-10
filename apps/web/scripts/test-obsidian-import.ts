// Live regression test for POST /api/import/obsidian.
//
// Builds a tiny in-memory ZIP with two .md files + one non-.md file
// (+ a hidden dotfile that should be skipped), POSTs it, asserts:
//   - imported === 2 (the two real .md files)
//   - non-.md ignored
//   - dotfile ignored
//   - source field = "obsidian"
//   - compile_from.external.provider === "obsidian"
//   - second POST of same ZIP deduplicates (no new rows)
//
// Cleans up created rows. Requires SUPABASE creds + dev server on
// MDFY_BASE_URL (default http://localhost:3002).

import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.MDFY_BASE_URL || "http://localhost:3002";
const TEST_USER_ID = process.env.MDFY_TEST_USER_ID || "4040031b-9fff-467e-a6ba-6656acc4fd92";

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0; let fail = 0;
const check = (label: string, cond: boolean, detail?: string) => {
  if (cond) { console.log("PASS —", label); pass++; }
  else      { console.log("FAIL —", label, detail || ""); fail++; }
};

function nanoid(n = 8): string {
  const alpha = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let s = ""; for (let i = 0; i < n; i++) s += alpha[Math.floor(Math.random() * alpha.length)]; return s;
}

async function buildVaultZip(uniqueTag: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("notes/Daily Note.md", `# Daily Note ${uniqueTag}\n\nToday I did things. ${uniqueTag}\n\n${"Lorem ipsum ".repeat(20)}`);
  zip.file("ideas/Roadmap.md", `# Roadmap ${uniqueTag}\n\nPlans:\n- Ship.\n- Iterate. ${uniqueTag}\n\n${"Dolor sit amet ".repeat(20)}`);
  zip.file("README.txt", "not a markdown file");                       // ignored
  zip.file(".obsidian/workspace.md", "# hidden config\nshould skip");  // dotfile parent, base starts with "." → skipped
  zip.file("__MACOSX/notes/._Daily Note.md", "garbage");              // macOS resource fork → skipped
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

async function callImport(zipBuf: Buffer, headers: Record<string, string> = {}): Promise<{ status: number; json: { imported?: number; skipped?: number; deduplicated?: number; failed?: number; docs?: Array<{ id: string; title: string; path: string; deduplicated?: boolean }>; error?: string } }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(zipBuf)], { type: "application/zip" }), "TestVault.zip");
  const res = await fetch(`${baseUrl}/api/import/obsidian`, {
    method: "POST",
    headers: { "x-user-id": TEST_USER_ID, ...headers },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  const created: string[] = [];
  const tag = nanoid();

  try {
    // 1) Auth gate
    const noAuthRes = await fetch(`${baseUrl}/api/import/obsidian`, { method: "POST", body: new FormData() });
    check("no auth → 401", noAuthRes.status === 401, `got ${noAuthRes.status}`);

    // 2) Empty form (no file)
    const emptyForm = await fetch(`${baseUrl}/api/import/obsidian`, {
      method: "POST",
      headers: { "x-user-id": TEST_USER_ID },
      body: new FormData(),
    });
    check("missing file field → 400", emptyForm.status === 400, `got ${emptyForm.status}`);

    // 3) Build vault + first upload
    const zipBuf = await buildVaultZip(tag);
    const first = await callImport(zipBuf);
    check("first import responds 200", first.status === 200, `got ${first.status}: ${JSON.stringify(first.json).slice(0,200)}`);
    check("imported === 2 (.md files only)", first.json.imported === 2, `imported=${first.json.imported}`);
    check("docs[] has 2 entries", (first.json.docs?.length || 0) === 2);

    for (const d of first.json.docs || []) if (!d.deduplicated && d.id) created.push(d.id);

    // 4) Inspect a row
    const sample = first.json.docs?.[0];
    if (sample) {
      const { data: row } = await supabase
        .from("documents")
        .select("id, source, compile_from, is_draft, user_id, title")
        .eq("id", sample.id)
        .single();
      check("row exists in DB", !!row);
      if (row) {
        check("source === 'obsidian'", row.source === "obsidian", `got ${row.source}`);
        check("compile_from.external.provider === 'obsidian'",
          (row.compile_from as { external?: { provider?: string } } | null)?.external?.provider === "obsidian");
        check("row.is_draft === true", row.is_draft === true);
        check("row.user_id matches caller", row.user_id === TEST_USER_ID);
      }
    }

    // 5) Idempotency — same ZIP re-uploaded
    const second = await callImport(zipBuf);
    check("second import responds 200", second.status === 200);
    check("second import deduplicated === 2", second.json.deduplicated === 2,
      `imp=${second.json.imported} dedup=${second.json.deduplicated}`);
    check("second import imported === 0", second.json.imported === 0);

    // 6) Hidden / non-md / macOS files were ignored (not in docs[])
    const paths = (first.json.docs || []).map(d => d.path);
    check("README.txt was ignored", !paths.includes("README.txt"));
    check(".obsidian/* dotfile was ignored", !paths.some(p => p.includes(".obsidian/")));
    check("__MACOSX/* resource fork was ignored", !paths.some(p => p.startsWith("__MACOSX/")));
  } finally {
    if (created.length > 0) {
      await supabase.from("documents").delete().in("id", created);
      console.log(`\nCleaned up ${created.length} test doc${created.length === 1 ? "" : "s"}.`);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();

export {};
