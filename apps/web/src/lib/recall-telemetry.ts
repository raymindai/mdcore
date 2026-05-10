// Structured telemetry for hub-level recall calls.
//
// Each POST /api/hub/<slug>/recall emits one JSON line so we can
// answer questions like:
//   - p50/p95 latency by level (doc / chunk / bundle, hybrid on/off)
//   - how often callers turn rerank on, and what it costs in ms
//   - which hubs are hot, which slug values 404
//
// Vercel log drains aggregate without extra infra. `[recall]` prefix
// is the grep handle. We log query LENGTH (not the question itself)
// so user prompts don't end up in log archives.

export interface RecallTelemetryEvent {
  slug: string;
  questionChars: number;
  level: "doc" | "chunk" | "bundle";
  hybrid: boolean;
  rerankRequested: boolean;
  reranked: boolean;
  k: number;
  fetchK: number;
  resultCount: number;
  embedMs: number;
  searchMs: number;
  rerankMs: number;
  totalMs: number;
  status: number;
  errorCode?: string;
  ua?: string | null;
  referer?: string | null;
}

const MAX_UA = 120;
const MAX_REFERER = 200;

// Related-docs endpoint telemetry. Same shape spirit as the recall
// log line — JSON, ts, durations split by phase — so dashboards can
// treat both endpoints uniformly.
export interface RelatedTelemetryEvent {
  docId: string;
  callerIsOwner: boolean;
  conceptCount: number;       // rows fetched from concept_index
  candidateCount: number;     // distinct other-doc ids found
  resultCount: number;        // rows actually returned (<= limit)
  limit: number;
  conceptFetchMs: number;
  joinMs: number;
  totalMs: number;
  status: number;
  errorCode?: string;
}

export function logRelated(event: RelatedTelemetryEvent): void {
  try {
    const payload = {
      kind: "related_docs",
      ts: new Date().toISOString(),
      doc_id: event.docId,
      owner: event.callerIsOwner,
      concepts: event.conceptCount,
      candidates: event.candidateCount,
      results: event.resultCount,
      limit: event.limit,
      concept_fetch_ms: event.conceptFetchMs,
      join_ms: event.joinMs,
      total_ms: event.totalMs,
      status: event.status,
      ...(event.errorCode ? { error: event.errorCode } : {}),
    };
    console.log(`[related] ${JSON.stringify(payload)}`);
  } catch {
    /* never throw from telemetry */
  }
}

export function logRecall(event: RecallTelemetryEvent): void {
  try {
    const payload = {
      kind: "hub_recall",
      ts: new Date().toISOString(),
      slug: event.slug,
      q_chars: event.questionChars,
      level: event.level,
      hybrid: event.hybrid,
      rerank_req: event.rerankRequested,
      reranked: event.reranked,
      k: event.k,
      fetch_k: event.fetchK,
      results: event.resultCount,
      embed_ms: event.embedMs,
      search_ms: event.searchMs,
      rerank_ms: event.rerankMs,
      total_ms: event.totalMs,
      status: event.status,
      ...(event.errorCode ? { error: event.errorCode } : {}),
      ...(event.ua ? { ua: event.ua.slice(0, MAX_UA) } : {}),
      ...(event.referer ? { referer: event.referer.slice(0, MAX_REFERER) } : {}),
    };
    console.log(`[recall] ${JSON.stringify(payload)}`);
  } catch {
    /* never throw from telemetry */
  }
}
