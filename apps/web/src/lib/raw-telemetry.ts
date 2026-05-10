// Structured telemetry for /raw/* fetches.
//
// Every /raw response funnels through `logRawFetch` so the founder
// can answer questions like:
//   - which hubs are densest (tokens / doc)
//   - what fraction of fetches use ?compact / ?digest
//   - which docs / bundles are hot
//
// We emit a single JSON line per fetch on the server console. Vercel
// log drains aggregate it without any extra infra. If we later want
// queryable analytics we can ship a small Supabase table; for now
// the log line carries everything we'd index.
//
// `[raw]` prefix makes the lines greppable in Vercel logs.

export interface RawFetchEvent {
  route: "doc" | "bundle" | "hub" | "hub_concept";
  resource: string;          // doc id / bundle id / hub slug
  compact: boolean;
  digest?: boolean;
  bytes: number;
  tokens: number;
  status: number;            // HTTP status returned
  permissionReason?: string; // when status !== 200, why
  ua?: string | null;        // truncated user-agent
  referer?: string | null;   // truncated referer
}

const MAX_UA = 120;
const MAX_REFERER = 200;

export function logRawFetch(event: RawFetchEvent): void {
  // Drop the line on the floor in tests / hot paths; Vercel logs are
  // a fire-and-forget surface.
  try {
    const payload = {
      kind: "raw_fetch",
      ts: new Date().toISOString(),
      route: event.route,
      resource: event.resource,
      compact: event.compact,
      digest: event.digest ?? false,
      bytes: event.bytes,
      tokens: event.tokens,
      status: event.status,
      ...(event.permissionReason ? { reason: event.permissionReason } : {}),
      ...(event.ua ? { ua: event.ua.slice(0, MAX_UA) } : {}),
      ...(event.referer ? { referer: event.referer.slice(0, MAX_REFERER) } : {}),
    };
    // Single JSON line per fetch. Stable shape so log queries can
    // grep `kind=raw_fetch` then JSON-parse the rest.
    console.log(`[raw] ${JSON.stringify(payload)}`);
  } catch {
    /* never throw from telemetry */
  }
}

/**
 * Convenience: pull (ua, referer) out of a Request without leaking
 * PII or letting an attacker stuff log lines with newlines.
 */
export function extractRequestSignals(req: Request): { ua: string | null; referer: string | null } {
  const sanitize = (v: string | null) => (v ? v.replace(/[\r\n]+/g, " ") : null);
  return {
    ua: sanitize(req.headers.get("user-agent")),
    referer: sanitize(req.headers.get("referer")),
  };
}
