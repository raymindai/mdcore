import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verify-auth";
import { readHubSchema, writeHubSchema, DEFAULT_HUB_SCHEMA_MD } from "@/lib/hub-schema";

export const runtime = "nodejs";

/**
 * GET  /api/user/hub/schema  — return the user's hub schema (or default)
 * PATCH /api/user/hub/schema  — update the schema; empty body resets to default
 *
 * Auth required. The schema is private to its owner — synthesis reads
 * it server-side; we never expose it to other users.
 */

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  return verified?.userId || req.headers.get("x-user-id") || null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const schema = await readHubSchema(userId);
  return NextResponse.json({
    markdown: schema.markdown,
    updatedAt: schema.updatedAt,
    isDefault: schema.isDefault,
    defaultMarkdown: DEFAULT_HUB_SCHEMA_MD,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { markdown?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await writeHubSchema(userId, body.markdown ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Return the now-current schema so the caller doesn't need a second fetch.
  const refreshed = await readHubSchema(userId);
  return NextResponse.json({
    markdown: refreshed.markdown,
    updatedAt: refreshed.updatedAt,
    isDefault: refreshed.isDefault,
  });
}
