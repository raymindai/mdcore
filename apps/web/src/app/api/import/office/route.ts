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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const officeparser = require("officeparser");
    const text: string = await officeparser.parseOfficeAsync(buffer);

    return NextResponse.json({
      text: text || "",
      filename: file.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Office parse error:", msg);
    return NextResponse.json({ error: `Office parse failed: ${msg}` }, { status: 500 });
  }
}
