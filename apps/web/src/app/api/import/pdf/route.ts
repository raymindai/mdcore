import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { ensureAnonymousCookie, readAnonymousCookie } from "@/lib/anonymous-cookie";
import { cleanMarkdownStructure } from "@/lib/llm-clean";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PDF ingest. Two modes:
 *
 * 1. Raw extract (default). multipart/form-data with `file`. Returns
 *    `{ text, pages, title }` for callers that want to do their own
 *    cleanup.
 *
 * 2. End-to-end save (`?save=1`). Same multipart input. Extracts text,
 *    runs the LLM markdown cleaner (provider chain: Anthropic > OpenAI
 *    > Gemini), persists the result as a documents row, and returns
 *    `{ id, editToken, ... }`. This is what the hub UI calls when the
 *    user drops a PDF onto the editor.
 *
 * The save mode honors the same auth ladder as /api/docs: JWT, x-user-id,
 * x-user-email, anonymous body field, x-anonymous-id header, mdfy_anon
 * cookie. Anonymous PDFs get the cookie issued so they can be claimed
 * along with the rest of the user's anonymous captures.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: `PDF too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 4.5 MB. Try compressing or splitting it.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse");
    const data = await pdf(buffer);
    const rawText: string = data.text || "";
    const pages: number = data.numpages || 0;
    const pdfTitle: string | null = data.info?.Title || null;
    const filename = file.name || "document.pdf";

    if (req.nextUrl.searchParams.get("save") !== "1") {
      // Raw mode for back-compat callers.
      return NextResponse.json({ text: rawText, pages, title: pdfTitle });
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "PDF has no extractable text. Scanned PDFs need OCR (not supported yet)." }, { status: 422 });
    }

    // Hand the extracted text to the LLM cleaner so headings, lists, code
    // blocks, etc. survive the round-trip. The cleaner is a no-op when no
    // AI provider is configured — we still save the raw text so the user's
    // PDF lands somewhere.
    let markdown = rawText;
    let cleanedByAi = false;
    try {
      const cleaned = await cleanMarkdownStructure(rawText, {
        filenameHint: filename,
        sourceLabel: "PDF",
      });
      if (cleaned) {
        markdown = cleaned;
        cleanedByAi = true;
      }
    } catch (err) {
      console.warn("PDF AI cleanup failed; saving raw text:", err);
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    // Auth resolution mirrors /api/docs.
    const verified = await verifyAuthToken(req.headers.get("authorization"));
    let userId: string | undefined = verified?.userId;
    if (!userId) userId = req.headers.get("x-user-id") || undefined;
    if (!userId) {
      const email = verified?.email || req.headers.get("x-user-email") || "";
      if (email) {
        try {
          const { data: list } = await supabase.auth.admin.listUsers();
          const user = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (user) userId = user.id;
        } catch { /* ignore */ }
      }
    }

    let anonymousId: string | undefined;
    if (!userId) {
      anonymousId =
        (formData.get("anonymousId") as string | null) ||
        req.headers.get("x-anonymous-id") ||
        readAnonymousCookie(req) ||
        crypto.randomUUID();
    }

    const editToken = nanoid(32);
    const title = (pdfTitle && pdfTitle.trim()) || filename.replace(/\.pdf$/i, "");
    const sourceTag = `pdf:${filename}`;

    let id = "";
    let insertError: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      id = nanoid(8);
      const { error } = await supabase.from("documents").insert({
        id,
        markdown,
        title,
        edit_token: editToken,
        user_id: userId || null,
        anonymous_id: !userId ? anonymousId : null,
        edit_mode: userId ? "account" : "token",
        is_draft: false,
        source: sourceTag,
      });
      if (!error) { insertError = null; break; }
      if (error.code === "23505") { insertError = error; continue; }
      insertError = error; break;
    }
    if (insertError) {
      console.error("PDF doc insert error:", insertError);
      return NextResponse.json({ error: "Failed to save imported PDF" }, { status: 500 });
    }

    const res = NextResponse.json({
      id,
      editToken,
      title,
      pages,
      cleanedByAi,
      source: sourceTag,
    });
    ensureAnonymousCookie(req, res, {
      skip: !!userId,
      explicitId: anonymousId ?? readAnonymousCookie(req),
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("PDF parse error:", msg);
    return NextResponse.json({ error: "PDF parse failed. The file may be corrupted or unsupported." }, { status: 500 });
  }
}
