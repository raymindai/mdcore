import { NextRequest, NextResponse } from "next/server";
import { importShare, ShareImportError } from "@/lib/share-importers";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/import/share
 * Body: { url: string }
 *
 * Server fetches the share page, extracts the conversation, and returns
 * clean markdown the client can persist via /api/docs. We do NOT save
 * the document here — keeping save behind /api/docs preserves a single
 * auth path (anonymous-id, JWT, x-user-email all keep working) and lets
 * the client preview before commit.
 *
 * MVP scope (W1): ChatGPT only. Claude + Gemini fall through to a 501.
 */
export async function POST(req: NextRequest) {
  // IP rate limit. Share imports do an outbound fetch, so abuse is more
  // expensive than a normal POST.
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const { allowed } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const result = await importShare(url);
    return NextResponse.json({
      provider: result.provider,
      sourceUrl: result.sourceUrl,
      title: result.title,
      markdown: result.markdown,
      turns: result.turns,
    });
  } catch (err) {
    if (err instanceof ShareImportError) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status });
    }
    console.error("share import unexpected error:", err);
    return NextResponse.json(
      { error: "Couldn't import this share. Try again, or paste the conversation manually." },
      { status: 500 }
    );
  }
}
