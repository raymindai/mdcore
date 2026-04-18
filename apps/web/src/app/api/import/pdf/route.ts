import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Vercel serverless function body limit is 4.5 MB. Bigger PDFs need a
    // direct-upload-to-storage flow which we don't have yet.
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: `PDF too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 4.5 MB. Try compressing or splitting it.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Use require to avoid webpack static analysis of pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse");
    const data = await pdf(buffer);

    return NextResponse.json({
      text: data.text || "",
      pages: data.numpages,
      title: data.info?.Title || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("PDF parse error:", msg);
    return NextResponse.json({ error: "PDF parse failed. The file may be corrupted or unsupported." }, { status: 500 });
  }
}
