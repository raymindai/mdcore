import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verify-auth";
import { readHubLog } from "@/lib/hub-log";

/**
 * GET /api/user/hub/log
 *
 * Returns the authenticated user's hub log, newest first. Pagination
 * via ?limit (1–500, default 200). Owner-only.
 *
 * The Karpathy-shaped public surface is /hub/<slug>/log.md — that's
 * what AI fetchers read alongside the hub URL. This JSON endpoint
 * powers the in-app activity feed.
 */
export async function GET(req: NextRequest) {
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 200)) : 200;
  const rows = await readHubLog(userId, limit);
  return NextResponse.json({ entries: rows, count: rows.length });
}
