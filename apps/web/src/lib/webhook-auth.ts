// Supabase Database Webhook authorisation.
//
// Supabase lets us configure custom HTTP headers per webhook. We use
// `Authorization: Bearer ${WEBHOOK_SECRET}`. Every handler under
// /api/hooks/* runs this check first. Missing / mismatched → 401.
//
// In dev, when WEBHOOK_SECRET isn't set, we allow the request through
// so iterating locally doesn't require maintaining a secret file. The
// equivalent production-hard-fail is in each handler's auth check.

import type { NextRequest } from "next/server";

export function isWebhookAuthorized(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Supabase Database Webhook payload shape (v1).
 *
 * Reference: https://supabase.com/docs/guides/database/webhooks
 *
 * `type` matches the trigger (INSERT / UPDATE / DELETE). `record` is
 * the new row (UPDATE / INSERT). `old_record` is the previous row
 * (UPDATE / DELETE). For deletions, `record` is null.
 */
export interface SupabaseWebhookPayload<T = Record<string, unknown>> {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
}
