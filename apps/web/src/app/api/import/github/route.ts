// POST /api/import/github
//
// Body: { url: string }
//
// Imports every .md file under the given GitHub URL into the
// caller's hub as draft documents. Single-file URLs create one
// doc; repo / tree URLs create N. Each doc lands with
// source = "github:<owner>/<repo>" and a compile_from-style
// `external` field carrying the original GitHub URL so we can
// re-sync later (separate task).
//
// Rules:
//  - Authenticated callers only — anonymous users have no hub to
//    drop the docs into.
//  - Public repos only for v1.
//  - Same dedup contract as docs/PDF/MCP (findRecentDuplicateDoc +
//    isStrictDupLockError) so re-running an import is idempotent.

import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { getServerUserId } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { appendHubLog } from "@/lib/hub-log";
import { findRecentDuplicateDoc, isStrictDupLockError } from "@/lib/doc-dedup";
import { enforceTitleInvariant } from "@/lib/extract-title";
import { uploadImageBuffer, rewriteMarkdownImages, mimeFromMagic } from "@/lib/import-images";
import { parseGithubUrl, importFromGithub, GithubImportError } from "@/lib/github-import";

interface ImportResult {
  imported: number;
  skipped: number;
  deduplicated: number;
  failed: number;
  docs: Array<{ id: string; title: string; path: string; sourceUrl: string; deduplicated?: boolean }>;
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
    return NextResponse.json({ error: "Sign in to import from GitHub" }, { status: 401 });
  }

  let body: { url?: string };
  try { body = await req.json(); } catch { body = {}; }
  const url = (body.url || "").trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const loc = parseGithubUrl(url);
  if (!loc) {
    return NextResponse.json({
      error: "Couldn't parse that URL. Paste a github.com repo, tree, or .md file URL.",
    }, { status: 400 });
  }

  // Fetch the file set from GitHub.
  type GithubFile = Awaited<ReturnType<typeof importFromGithub>>[number];
  let files: GithubFile[];
  try {
    files = await importFromGithub(loc);
  } catch (err) {
    if (err instanceof GithubImportError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
    }
    return NextResponse.json({ error: "GitHub import failed" }, { status: 502 });
  }

  // Insert each as a draft doc, with dedup.
  const sourceTag = `github:${loc.owner}/${loc.repo}`;
  const result: ImportResult = { imported: 0, skipped: 0, deduplicated: 0, failed: 0, docs: [] };

  /**
   * Pull every image reference inside one fetched `.md` file and
   * rehost it into our document-images bucket so the doc no longer
   * depends on the original repo being public / the branch staying
   * named the way it is. Handles two cases:
   *
   *   1. Relative refs (`./img.png`, `images/foo.png`). Resolved
   *      against the file's repo path → raw.githubusercontent.com URL.
   *   2. Absolute refs that already point at raw.githubusercontent.com.
   *      Pulled as-is (likely points at the same repo).
   *
   * External absolute URLs (`https://i.imgur.com/...`) are left alone —
   * we don't want to silently mirror third-party content the user
   * didn't ask us to host.
   */
  async function rehostImagesForFile(file: GithubFile): Promise<string> {
    // The outer guards (supabase / userId both non-null before we
    // reach this point) don't narrow through closure scope — capture
    // them in locals so TS sees them as definite.
    const sb = supabase;
    const uid = userId;
    if (!sb || !uid) return file.markdown;
    const rawUrlBase = file.rawUrl.replace(/\/[^/]+$/, "/"); // strip the .md filename
    const refs = new Set<string>();
    const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.markdown)) !== null) {
      const target = m[1];
      if (/^data:/i.test(target)) continue;
      refs.add(target);
    }
    if (refs.size === 0) return file.markdown;

    const map = new Map<string, string>();
    for (const ref of refs) {
      try {
        let resolved: string;
        if (/^https?:\/\/raw\.githubusercontent\.com\//i.test(ref)) {
          resolved = ref;
        } else if (/^https?:\/\//i.test(ref)) {
          // Skip third-party hosts on import; leave the user's
          // explicit external link in place.
          continue;
        } else {
          const cleaned = ref.replace(/^\.\//, "");
          resolved = new URL(cleaned, rawUrlBase).toString();
        }
        const res = await fetch(resolved);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const declared = res.headers.get("content-type");
        const mime = declared?.startsWith("image/") ? declared : mimeFromMagic(buf);
        if (!mime) continue;
        const filename = resolved.split("?")[0].split("/").pop() || "image";
        const out = await uploadImageBuffer(buf, filename, mime, {
          supabase: sb, ownerId: uid, trackQuota: false,
        });
        if (out) map.set(ref, out.url);
      } catch (err) {
        console.warn(`github-import: image rehost failed for ${ref}:`, err instanceof Error ? err.message : err);
      }
    }
    return rewriteMarkdownImages(file.markdown, map).markdown;
  }

  for (const file of files) {
    try {
      const rehostedMd = await rehostImagesForFile(file);
      const enforced = enforceTitleInvariant(rehostedMd, file.title);

      const dupHit = await findRecentDuplicateDoc(supabase, { userId }, enforced.markdown, enforced.title);
      if (dupHit) {
        result.deduplicated++;
        result.docs.push({ id: dupHit.id, title: enforced.title, path: file.path, sourceUrl: file.sourceUrl, deduplicated: true });
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
          // Reuse compile_from to record the GitHub origin without
          // adding a new column. Read paths can detect external
          // sources via the `external` key. compile_kind stays null
          // (this isn't a synthesis doc).
          compile_from: { external: { provider: "github", url: file.sourceUrl, rawUrl: file.rawUrl, path: file.path } },
        });
        if (!error) {
          result.imported++;
          result.docs.push({ id, title: enforced.title, path: file.path, sourceUrl: file.sourceUrl });
          inserted = true;
          break;
        }
        if (isStrictDupLockError(error)) {
          const survivor = await findRecentDuplicateDoc(supabase, { userId }, enforced.markdown, enforced.title);
          if (survivor) {
            result.deduplicated++;
            result.docs.push({ id: survivor.id, title: enforced.title, path: file.path, sourceUrl: file.sourceUrl, deduplicated: true });
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
        if (lastError) console.warn(`github-import: insert failed for ${file.path}:`, lastError.message);
      }
    } catch (err) {
      result.failed++;
      console.warn(`github-import: file ${file.path} threw:`, err instanceof Error ? err.message : err);
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
          summary: `Imported ${result.imported} markdown file${result.imported === 1 ? "" : "s"} from ${loc.owner}/${loc.repo}`,
          metadata: { provider: "github", owner: loc.owner, repo: loc.repo, path: loc.path },
        });
      } catch { /* best-effort */ }

      try {
        const { enqueueOntologyRefresh } = await import("@/lib/ontology-refresh");
        for (const d of result.docs.filter((x) => !x.deduplicated)) {
          await enqueueOntologyRefresh({
            supabase,
            userId,
            docId: d.id,
            title: d.title,
            // refetch markdown? we already have it locally — pass via cache
            markdown: files.find((f) => f.sourceUrl === d.sourceUrl)?.markdown || "",
          });
        }
      } catch (err) {
        console.warn("github-import: ontology refresh failed:", err instanceof Error ? err.message : err);
      }
    });
  }

  return NextResponse.json(result);
}
