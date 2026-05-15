// POST /api/import/office
//
// Parses .docx / .pptx / .xlsx uploads. v2 of this endpoint also
// extracts and rehosts every embedded image: mammoth handles DOCX
// (it exposes an imageConverter callback during the HTML render);
// PPTX + XLSX are zip-walked directly since officeparser only
// returns plain text. Images get uploaded to the document-images
// bucket and re-injected into the returned markdown so the caller
// doesn't have to do a second pass.
//
// The endpoint stays open to anonymous callers (file → text without
// signing in is a real wedge), but image rehost is skipped when no
// auth context is present — anonymous uploads can't own storage.

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { uploadImageBuffer, mimeFromExt, type UploadResult } from "@/lib/import-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extOf(name: string): string {
  const last = name.toLowerCase().split(".").pop();
  return last || "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Vercel serverless function body limit is 4.5 MB (not 10).
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 4.5 MB.` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extOf(file.name);

    // Auth context for image rehost. Anonymous callers still get
    // text extraction; they just lose images.
    const supabase = getSupabaseClient();
    const verified = await verifyAuthToken(req.headers.get("authorization"));
    const userId = verified?.userId || req.headers.get("x-user-id") || null;
    const canHostImages = !!(supabase && userId);

    if (ext === "docx") {
      return await handleDocx({ buffer, filename: file.name, canHostImages, userId, supabase });
    }
    if (ext === "pptx" || ext === "xlsx") {
      return await handleOoxmlZip({
        buffer, filename: file.name, kind: ext as "pptx" | "xlsx",
        canHostImages, userId, supabase,
      });
    }

    // Anything else falls back to officeparser text-only (older .doc,
    // .ppt, .xls etc.). These formats predate the OOXML zip shape and
    // we don't unpack their embedded media; the user gets the text.
    // officeparser v6 returns a structured Document object; call
    // .toText() for the flattened plain-text payload.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseOffice } = require("officeparser");
    const parsed = await parseOffice(buffer);
    const text: string = parsed?.toText ? parsed.toText() : "";
    return NextResponse.json({
      text: text || "",
      filename: file.name,
      imagesExtracted: 0,
      imagesNote: "Embedded images are not extracted from legacy .doc / .ppt / .xls. Re-save as the modern format (.docx / .pptx / .xlsx) to preserve images.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Office parse error:", msg);
    return NextResponse.json({ error: "Office file parse failed. The file may be corrupted or unsupported." }, { status: 500 });
  }
}

// ─── DOCX ────────────────────────────────────────────────────────────
async function handleDocx(args: {
  buffer: Buffer;
  filename: string;
  canHostImages: boolean;
  userId: string | null;
  supabase: ReturnType<typeof getSupabaseClient>;
}): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");

  const imageUploads: Array<UploadResult> = [];
  // mammoth's image.read("buffer") tries to use a TextDecoder with
  // encoding "buffer" which crashes on modern Node. Use the no-arg
  // form (returns a Uint8Array) and wrap in Buffer.from instead.
  type MammothImage = { contentType: string; read: () => Promise<Uint8Array> };
  const result = await mammoth.convertToMarkdown(
    { buffer: args.buffer },
    {
      convertImage: mammoth.images.imgElement(async (img: MammothImage) => {
        const raw = await img.read();
        const buf = Buffer.from(raw);
        if (!args.canHostImages || !args.supabase || !args.userId) {
          // No auth — fall back to a data: URL so the user at least
          // sees the image when they preview the result before they
          // decide to sign in. data: URLs blow up the markdown size,
          // so we cap at 200KB; bigger images get a placeholder.
          if (buf.length > 200 * 1024) return { src: "" };
          return { src: `data:${img.contentType};base64,${buf.toString("base64")}` };
        }
        const out = await uploadImageBuffer(buf, "docx-image", img.contentType, {
          supabase: args.supabase,
          ownerId: args.userId,
          trackQuota: false,
        });
        if (!out) return { src: "" };
        imageUploads.push(out);
        return { src: out.url };
      }),
    },
  );

  return NextResponse.json({
    text: result.value || "",
    filename: args.filename,
    imagesExtracted: imageUploads.length,
    warnings: (result.messages || []).slice(0, 5).map((m: { message: string }) => m.message),
  });
}

// ─── PPTX / XLSX zip walker ─────────────────────────────────────────
//
// Both formats are ZIPs of XML files. Embedded images live under
// `ppt/media/` (PPTX) or `xl/media/` (XLSX). We:
//   1. Extract plain text via officeparser (it works fine for both).
//   2. Walk the zip's media/ folder, upload each image, collect URLs.
//   3. Append the rehosted images as a `## Embedded images` section.
//
// We don't try to interleave images at their original positions —
// PPTX slide layout doesn't have a "before this paragraph" anchor,
// and the user can move the images around in the editor after import.
async function handleOoxmlZip(args: {
  buffer: Buffer;
  filename: string;
  kind: "pptx" | "xlsx";
  canHostImages: boolean;
  userId: string | null;
  supabase: ReturnType<typeof getSupabaseClient>;
}): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseOffice } = require("officeparser");
  const parsed = await parseOffice(args.buffer);
  const text: string = parsed?.toText ? parsed.toText() : "";

  if (!args.canHostImages || !args.supabase || !args.userId) {
    // Anonymous path: text only, surface the count so the UI can
    // suggest sign-in.
    return NextResponse.json({
      text: text || "",
      filename: args.filename,
      imagesExtracted: 0,
      imagesNote: "Sign in to extract and rehost images from PPTX/XLSX uploads.",
    });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(args.buffer);
  } catch {
    return NextResponse.json({ text: text || "", filename: args.filename, imagesExtracted: 0 });
  }

  const mediaPrefix = args.kind === "pptx" ? "ppt/media/" : "xl/media/";
  const imageUrls: string[] = [];
  // JSZip.forEach exposes paths via the `relativePath` arg. We collect
  // first, then run uploads sequentially so we don't exceed Vercel's
  // function memory / open-handle limits on a large deck.
  const entries: Array<{ path: string; obj: JSZip.JSZipObject }> = [];
  zip.forEach((relativePath, obj) => {
    if (obj.dir) return;
    if (!relativePath.startsWith(mediaPrefix)) return;
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(relativePath)) return;
    entries.push({ path: relativePath, obj });
  });
  for (const entry of entries) {
    try {
      const buf = Buffer.from(await entry.obj.async("arraybuffer"));
      const ext = entry.path.split(".").pop() || "";
      const out = await uploadImageBuffer(buf, entry.path, mimeFromExt(ext), {
        supabase: args.supabase,
        ownerId: args.userId,
        trackQuota: false,
      });
      if (out) imageUrls.push(out.url);
    } catch (err) {
      console.warn(`office-import (${args.kind}): image ${entry.path} failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Compose the final markdown body: extracted text first, then a
  // gallery section so the images are visible without further work.
  let body = text || "";
  if (imageUrls.length > 0) {
    const gallery = imageUrls.map((u, i) => `![Slide image ${i + 1}](${u})`).join("\n\n");
    body = `${body.trimEnd()}\n\n## Embedded images\n\n${gallery}\n`;
  }

  return NextResponse.json({
    text: body,
    filename: args.filename,
    imagesExtracted: imageUrls.length,
  });
}
