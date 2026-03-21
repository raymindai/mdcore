import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, remaining } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } }
    );
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  let body: { markdown?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { markdown, title } = body;
  if (!markdown || typeof markdown !== "string") {
    return NextResponse.json(
      { error: "markdown is required" },
      { status: 400 }
    );
  }
  if (markdown.length > 500_000) {
    return NextResponse.json(
      { error: "Document too large (max 500KB)" },
      { status: 413 }
    );
  }

  const id = nanoid(8);
  const editToken = nanoid(32);

  const { error } = await supabase.from("documents").insert({
    id,
    markdown,
    title: title || null,
    edit_token: editToken,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ id, editToken });
}
