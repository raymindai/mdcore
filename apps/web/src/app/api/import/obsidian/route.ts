// POST /api/import/obsidian
//
// Multipart body with a `file` field containing a ZIP of an Obsidian
// vault (or any folder of `.md` files). Walks every `.md` entry,
// enforces the title invariant, and inserts each as a draft document
// under the caller's hub. Same dedup contract as GitHub / PDF / MCP
// so re-uploading the same vault is idempotent.
//
// Caps mirror the GitHub ingest so a single upload can't blow up
// the hub or burn through anonymous Supabase quota:
//   - max 10MB zipped
//   - max 80 `.md` files
//   - max 200KB per file (post-decompression)
//
// Authenticated only — anonymous callers have no hub to drop docs
// into. Public-write would let strangers stuff strangers' hubs.
//
// We DO NOT preserve Obsidian's [[wikilink]] syntax or attachments
// in v1 — wikilinks render as plain text, and non-`.md` files are
// skipped. The full Obsidian round-trip is a separate task; this
// endpoint is the "give me my notes back" surface.

import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import JSZip from "jszip";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getServerUserId } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { appendHubLog } from "@/lib/hub-log";
import { findRecentDuplicateDoc, isStrictDupLockError } from "@/lib/doc-dedup";
import { enforceTitleInvariant } from "@/lib/extract-title";
import { uploadImageBuffer, rewriteMarkdownImages, mimeFromExt } from "@/lib/import-images";

export const runtime = "nodejs";

const MAX_ZIP_BYTES = 10 * 1024 * 1024;       // 10MB upload cap
const MAX_FILES = 80;                          // mirrors GitHub
const MAX_PER_FILE_BYTES = 200 * 1024;         // 200KB post-decompress

interface ImportedRow {
  id: string;
  title: string;
  path: string;
  deduplicated?: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  deduplicated: number;
  failed: number;
  docs: ImportedRow[];
}

function titleFromPath(path: string): string {
  // "subdir/My Note.md" → "My Note". Obsidian uses the file name as
  // the title by default and the first H1 only as a body heading;
  // we mirror that here.
  const base = path.split(/[\\/]/).pop() || path;
  return base.replace(/\.md$/i, "").trim() || "Untitled";
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id") || (await getServerUserId());
  if (!userId) {
    return NextResponse.json({ error: "Sign in to import an Obsidian vault" }, { status: 401 });
  }

  // Multipart parse
  let file: File | null = null;
  try {
    const formData = await req.formData();
    const entry = formData.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Attach a .zip of your vault in the `file` field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: `Vault too large — ${Math.round(file.size / 1024 / 1024)}MB > ${MAX_ZIP_BYTES / 1024 / 1024}MB cap` }, { status: 413 });
  }

  // Parse ZIP
  let zip: JSZip;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    zip = await JSZip.loadAsync(buf);
  } catch {
    return NextResponse.json({ error: "Couldn't read the ZIP — is it valid?" }, { status: 400 });
  }

  // Collect `.md` entries (skip macOS resource forks and hidden files).
  // While we're walking the zip, also build an image map: every
  // raster / SVG attachment keyed by its vault-relative path so
  // rewriteMarkdownImages can rehost references inside the .md
  // bodies. Anything that isn't a markdown file and isn't an image
  // (PDFs, audio, etc.) is silently skipped — first cut.
  type ZipEntry = { path: string; obj: JSZip.JSZipObject };
  const candidates: ZipEntry[] = [];
  const imageEntries: ZipEntry[] = [];
  zip.forEach((relativePath, obj) => {
    if (obj.dir) return;
    if (relativePath.startsWith("__MACOSX/")) return;
    const segments = relativePath.split(/[\\/]/);
    if (segments.some((s) => s.startsWith("."))) return;
    if (/\.md$/i.test(relativePath)) {
      candidates.push({ path: relativePath, obj });
      return;
    }
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(relativePath)) {
      imageEntries.push({ path: relativePath, obj });
    }
  });

  if (candidates.length === 0) {
    return NextResponse.json({ error: "No .md files found in the vault" }, { status: 400 });
  }

  // Upload all images up front (deduped by content hash in the helper)
  // so each .md scan can rewrite refs in one pass. Bypass quota tracking
  // when the importing user is on the free tier with > 10 images — we
  // could otherwise lock them out mid-import with a partial state. The
  // bucket dedup handles repeated uploads cheaply.
  const imageMap = new Map<string, string>();
  for (const entry of imageEntries) {
    try {
      const buf = Buffer.from(await entry.obj.async("arraybuffer"));
      const ext = entry.path.split(".").pop() || "";
      const res = await uploadImageBuffer(buf, entry.path, mimeFromExt(ext), {
        supabase,
        ownerId: userId,
        trackQuota: false,
      });
      if (res) imageMap.set(entry.path, res.url);
    } catch (err) {
      console.warn(`obsidian-import: image ${entry.path} failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Cap at MAX_FILES — surface the truncation so callers can re-run
  // with a smaller subset if needed.
  let skipped = 0;
  const toProcess = candidates.slice(0, MAX_FILES);
  if (candidates.length > MAX_FILES) skipped += candidates.length - MAX_FILES;

  const result: ImportResult = { imported: 0, skipped, deduplicated: 0, failed: 0, docs: [] };
  const sourceTag = "obsidian";
  // Carry the source filename (e.g. "MyVault.zip") so the hub log
  // entry reads "Imported 12 notes from MyVault.zip" instead of the
  // bare "obsidian" tag.
  const vaultLabel = (file.name || "vault").replace(/\.[^.]+$/, "");
  const insertedMarkdowns: { id: string; title: string; markdown: string; path: string }[] = [];

  for (const entry of toProcess) {
    try {
      const content = await entry.obj.async("string");
      if (content.length > MAX_PER_FILE_BYTES) {
        result.skipped++;
        continue;
      }
      if (!content.trim()) {
        result.skipped++;
        continue;
      }

      const titleGuess = titleFromPath(entry.path);
      // Rewrite vault-relative image refs to the rehosted URLs we just
      // uploaded. Handles both `![](path)` and Obsidian's `![[path]]`
      // embed syntax. Runs before title enforcement so the H1 splice
      // doesn't trip over an image at the very top of the doc.
      const { markdown: withRehosted } = rewriteMarkdownImages(content, imageMap);
      const enforced = enforceTitleInvariant(withRehosted, titleGuess);

      const dupHit = await findRecentDuplicateDoc(supabase, { userId }, enforced.markdown, enforced.title);
      if (dupHit) {
        result.deduplicated++;
        result.docs.push({ id: dupHit.id, title: enforced.title, path: entry.path, deduplicated: true });
        continue;
      }

      let inserted = false;
      let lastError: { code?: string; message?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = nanoid(8);
        const editToken = nanoid(32);
        const { error } = await supabase.from("documents").insert({
          id,
          markdown: enforced.markdown,
          title: enforced.title,
          edit_token: editToken,
          user_id: userId,
          edit_mode: "account",
          is_draft: true,
          source: sourceTag,
          // Mirror github-import: stash the vault-relative path so a
          // future re-sync (or attachments support) can find the
          // original. provider="obsidian" tells UI it's a foreign
          // doc that shouldn't be auto-recompiled.
          compile_from: { external: { provider: "obsidian", vault: vaultLabel, path: entry.path } },
        });
        if (!error) {
          result.imported++;
          result.docs.push({ id, title: enforced.title, path: entry.path });
          insertedMarkdowns.push({ id, title: enforced.title, markdown: enforced.markdown, path: entry.path });
          inserted = true;
          break;
        }
        if (isStrictDupLockError(error)) {
          const survivor = await findRecentDuplicateDoc(supabase, { userId }, enforced.markdown, enforced.title);
          if (survivor) {
            result.deduplicated++;
            result.docs.push({ id: survivor.id, title: enforced.title, path: entry.path, deduplicated: true });
            inserted = true;
            break;
          }
          lastError = error; break;
        }
        if (error.code === "23505") { lastError = error; continue; } // pkey collision, retry
        lastError = error; break;
      }
      if (!inserted) {
        result.failed++;
        if (lastError) console.warn(`obsidian-import: insert failed for ${entry.path}:`, lastError.message);
      }
    } catch (err) {
      result.failed++;
      console.warn(`obsidian-import: file ${entry.path} threw:`, err instanceof Error ? err.message : err);
    }
  }

  // Hub log + ontology refresh — fire after the response.
  if (result.imported > 0) {
    after(async () => {
      try {
        await appendHubLog({
          userId,
          event: "doc.imported",
          targetType: "document",
          targetId: result.docs[0]?.id || null,
          summary: `Imported ${result.imported} note${result.imported === 1 ? "" : "s"} from ${vaultLabel}`,
          metadata: { provider: "obsidian", vault: vaultLabel, fileCount: result.imported },
        });
      } catch { /* best-effort */ }

      try {
        const { enqueueOntologyRefresh } = await import("@/lib/ontology-refresh");
        for (const d of insertedMarkdowns) {
          await enqueueOntologyRefresh({
            supabase, userId, docId: d.id, title: d.title, markdown: d.markdown,
          });
        }
      } catch (err) {
        console.warn("obsidian-import: ontology refresh failed:", err instanceof Error ? err.message : err);
      }
    });
  }

  return NextResponse.json(result);
}
