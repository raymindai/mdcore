/**
 * Authenticated fetch — sends Authorization: Bearer token when available,
 * falls back to x-user-id/x-user-email headers for anonymous users.
 */
export function buildAuthHeaders(context: {
  accessToken?: string | null;
  userId?: string;
  userEmail?: string;
  anonymousId?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (context.accessToken) {
    headers["Authorization"] = `Bearer ${context.accessToken}`;
  }
  // Always send identity headers as fallback (anonymous users, transition period)
  if (context.userId) headers["x-user-id"] = context.userId;
  if (context.userEmail) headers["x-user-email"] = context.userEmail;
  if (context.anonymousId) headers["x-anonymous-id"] = context.anonymousId;
  return headers;
}
