/**
 * ChatGPT share-link extractor.
 *
 * Public ChatGPT shares live at:
 *   https://chatgpt.com/share/<id>
 *   https://chat.openai.com/share/<id>     (legacy domain, still resolves)
 *
 * Two server-render formats observed in production. We try both:
 *
 * (A) __NEXT_DATA__ JSON blob (older Next.js Pages Router).
 *     A single <script id="__NEXT_DATA__"> tag with a structured payload
 *     containing `mapping` + `current_node` or `linear_conversation`.
 *
 * (B) React Router 7 turbo-stream (current 2026 format).
 *     window.__reactRouterContext.streamController.enqueue("[...]") calls
 *     embed a graph-encoded payload where strings, objects and primitives
 *     are deduplicated into a flat array and referenced by integer index.
 *     Object keys are encoded as `_<keyIndex>` and the conversation lives
 *     under loaderData → route data → serverResponse → data.
 *
 * Neither schema is a public contract, so this code is defensive: it tries
 * each in order and falls back to a deep-search for any object that has
 * `mapping` or `linear_conversation`. If both fail, it errors with a
 * user-friendly message rather than silently producing bad output.
 */

import { ShareImportError, type ShareImportResult } from "./types";

// Realistic browser UA. Without this ChatGPT often returns a stub page.
const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5 MB cap

interface ChatGPTMessageContent {
  content_type?: string;
  parts?: unknown[];
  text?: string;
}

interface ChatGPTMessage {
  id?: string;
  author?: { role?: string; name?: string | null };
  content?: ChatGPTMessageContent;
  create_time?: number | null;
  metadata?: {
    is_visually_hidden_from_conversation?: boolean;
    is_redacted?: boolean;
    [k: string]: unknown;
  };
}

interface ChatGPTMappingNode {
  id?: string;
  message?: ChatGPTMessage | null;
  parent?: string | null;
  children?: string[];
}

/**
 * `linear_conversation` may contain either raw messages (older
 * __NEXT_DATA__ shape) or mapping-node wrappers with `.message` (current
 * turbo-stream shape). We accept both at the type level and unwrap on read.
 */
type LinearItem = ChatGPTMessage | ChatGPTMappingNode;

interface ChatGPTConversationData {
  title?: string | null;
  mapping?: Record<string, ChatGPTMappingNode>;
  current_node?: string;
  linear_conversation?: LinearItem[];
}

export async function extractChatGPTShare(rawUrl: string): Promise<ShareImportResult> {
  const url = canonicalizeChatGPTUrl(rawUrl);
  const html = await fetchShareHtml(url);

  // Try formats in order. Each returns null if the format isn't present;
  // they only throw on hard parse failures we want to surface.
  const data =
    extractNextDataConversation(html) ?? extractTurboStreamConversation(html);

  if (!data) {
    throw new ShareImportError(
      "Couldn't read the conversation from this ChatGPT share. The share may be private, deleted, or the page format may have changed.",
      { status: 502 }
    );
  }

  const messages = collectOrderedMessages(data);
  if (messages.length === 0) {
    throw new ShareImportError("This ChatGPT share has no readable messages.", {
      status: 502,
    });
  }

  const title = pickTitle(data, messages);
  const markdown = formatMarkdown(title, messages, url);

  return {
    provider: "chatgpt",
    sourceUrl: url,
    title,
    markdown,
    turns: countTurns(messages),
  };
}

// ─── helpers ───

function canonicalizeChatGPTUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new ShareImportError("That doesn't look like a valid URL.", { status: 400 });
  }
  if (!/^chat(gpt)?\.(openai\.)?com$/i.test(u.hostname) && u.hostname !== "chatgpt.com" && u.hostname !== "chat.openai.com") {
    throw new ShareImportError("Not a ChatGPT share URL.", { status: 400 });
  }
  if (!u.pathname.startsWith("/share/")) {
    throw new ShareImportError(
      "ChatGPT URL must be a share link (https://chatgpt.com/share/...).",
      { status: 400 }
    );
  }
  // Drop tracking params, normalize to chatgpt.com
  u.hostname = "chatgpt.com";
  u.search = "";
  u.hash = "";
  return u.toString();
}

async function fetchShareHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new ShareImportError(
      "Couldn't reach ChatGPT. Check your network and try again.",
      { status: 502, cause: err }
    );
  }
  clearTimeout(timer);

  if (res.status === 404) {
    throw new ShareImportError("This ChatGPT share doesn't exist or has been deleted.", {
      status: 404,
    });
  }
  if (res.status === 403 || res.status === 401) {
    throw new ShareImportError("This ChatGPT share is private.", { status: 403 });
  }
  if (!res.ok) {
    throw new ShareImportError(`ChatGPT returned ${res.status}.`, { status: 502 });
  }

  // Read with size cap. Avoids OOM on a malicious or huge page.
  const reader = res.body?.getReader();
  if (!reader) {
    return await res.text();
  }
  const decoder = new TextDecoder();
  let html = "";
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_HTML_BYTES) {
      throw new ShareImportError("Share page is too large to import.", { status: 413 });
    }
    html += decoder.decode(value, { stream: true });
  }
  html += decoder.decode();
  return html;
}

/**
 * Pull the conversation JSON out of the __NEXT_DATA__ blob.
 * Tries multiple known paths because OpenAI has moved this around.
 */
function extractNextDataConversation(html: string): ChatGPTConversationData | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return null;

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }

  // Known paths, ordered by recency of observed schemas.
  const candidates: string[] = [
    "props.pageProps.serverResponse.data",
    "props.pageProps.sharedConversation",
    "props.pageProps.conversation",
    "props.pageProps.data",
  ];
  for (const path of candidates) {
    const node = pluck(data, path);
    if (node && typeof node === "object" && (hasMapping(node) || hasLinear(node))) {
      return node as ChatGPTConversationData;
    }
  }

  // Last-ditch: deep-search for any object with `mapping` + `current_node`.
  const found = deepFindConversation(data);
  return found;
}

function pluck(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function hasMapping(node: unknown): boolean {
  return !!node && typeof node === "object" && "mapping" in (node as Record<string, unknown>);
}

function hasLinear(node: unknown): boolean {
  return (
    !!node &&
    typeof node === "object" &&
    Array.isArray((node as Record<string, unknown>).linear_conversation)
  );
}

/**
 * Pull the conversation out of the React Router 7 turbo-stream payload.
 *
 * Format (observed 2026-05):
 *   window.__reactRouterContext.streamController.enqueue("[<json>]")
 *
 * The decoded JSON is a flat array. Composite values reference each other
 * via integer indexes. Object keys are encoded as `"_<keyIndex>": valueIndex`.
 * Negative integers are sentinels (we treat as null).
 */
function extractTurboStreamConversation(html: string): ChatGPTConversationData | null {
  // Each enqueue call carries one chunk. The first chunk is the full route
  // tree; later chunks are streaming continuations we can ignore for share
  // pages (the conversation arrives in the first chunk).
  const re = /window\.__reactRouterContext\.streamController\.enqueue\("((?:[^"\\]|\\.)*)"\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    let payload: unknown;
    try {
      // Two-step decode: the regex captured the JS string body. Re-add the
      // surrounding quotes so JSON.parse can decode the JS escapes; the result
      // is the JSON text the page is encoding. JSON.parse it again to get the
      // structured payload.
      const jsonText = JSON.parse('"' + match[1] + '"');
      payload = JSON.parse(jsonText);
    } catch {
      continue;
    }
    if (!Array.isArray(payload)) continue;

    const root = resolveTurboStreamGraph(payload);
    if (!root || typeof root !== "object") continue;

    // Look for any object in the resolved graph that has a conversation shape.
    const found = deepFindConversation(root);
    if (found) return found;
  }
  return null;
}

/**
 * Resolve the turbo-stream graph by chasing integer indexes.
 *
 * Conventions inferred from production data:
 * - `payload` is a flat array of slots.
 * - An integer value (in any field or array element) is a reference into
 *   the slot array.
 * - Negative integers are sentinels — we collapse them to null.
 * - Object keys prefixed with `_<n>` mean: real key is the string at slot n.
 * - Cycle-safe via a per-call cache.
 *
 * Floats (e.g. unix timestamps as 1768604763.44) and very large integers
 * that exceed array bounds are returned as-is.
 */
function resolveTurboStreamGraph(payload: unknown[]): unknown {
  const cache = new Map<number, unknown>();
  const len = payload.length;

  const get = (idx: unknown): unknown => {
    if (typeof idx !== "number") return idx;
    if (!Number.isFinite(idx)) return idx;
    if (idx < 0) return null; // turbo-stream sentinel codes (we don't need to distinguish)
    if (!Number.isInteger(idx)) return idx; // float primitive, return as-is
    if (idx >= len) return idx; // out-of-range integer — treat as primitive
    if (cache.has(idx)) return cache.get(idx);

    const raw = payload[idx];
    if (raw === null || typeof raw === "boolean" || typeof raw === "string") {
      cache.set(idx, raw);
      return raw;
    }
    if (typeof raw === "number") {
      // Primitive number at this slot. Don't dereference further.
      cache.set(idx, raw);
      return raw;
    }
    if (Array.isArray(raw)) {
      const out: unknown[] = [];
      cache.set(idx, out);
      for (const v of raw) out.push(get(v));
      return out;
    }
    if (typeof raw === "object") {
      const out: Record<string, unknown> = {};
      cache.set(idx, out);
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (k.startsWith("_")) {
          const keyIdx = Number(k.slice(1));
          if (Number.isFinite(keyIdx)) {
            const realKey = get(keyIdx);
            if (typeof realKey === "string") {
              out[realKey] = get(v);
            }
          }
        } else {
          out[k] = get(v);
        }
      }
      return out;
    }
    cache.set(idx, raw);
    return raw;
  };

  return get(0);
}

function deepFindConversation(root: unknown): ChatGPTConversationData | null {
  const stack: unknown[] = [root];
  const seen = new WeakSet<object>();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (seen.has(cur as object)) continue;
    seen.add(cur as object);
    if (hasMapping(cur) || hasLinear(cur)) {
      return cur as ChatGPTConversationData;
    }
    for (const v of Object.values(cur as Record<string, unknown>)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

/**
 * Walk the conversation. Prefer `linear_conversation` if present (already
 * ordered, no tree traversal needed). Otherwise descend the mapping from
 * `current_node` toward the root and reverse.
 *
 * Both shapes can return mapping-node wrappers; we unwrap to the inner
 * `.message` when present.
 */
function collectOrderedMessages(data: ChatGPTConversationData): ChatGPTMessage[] {
  if (Array.isArray(data.linear_conversation) && data.linear_conversation.length) {
    return data.linear_conversation
      .map(unwrapMessage)
      .filter(isContentMessage);
  }

  const mapping = data.mapping;
  if (!mapping || typeof mapping !== "object") return [];

  // Walk from current_node up, then reverse.
  const path: ChatGPTMessage[] = [];
  let cursor = data.current_node;
  const safety = 5000; // mapping shouldn't exceed this; guard against cycles
  let i = 0;
  while (cursor && i++ < safety) {
    const node = mapping[cursor];
    if (!node) break;
    const msg = unwrapMessage(node);
    if (msg && isContentMessage(msg)) path.push(msg);
    cursor = node.parent || undefined;
  }
  return path.reverse();
}

function unwrapMessage(item: LinearItem | null | undefined): ChatGPTMessage | null {
  if (!item || typeof item !== "object") return null;
  // Mapping-node wrapper: has a `.message` property (may be null for the synthetic root node)
  if ("message" in item) {
    const msg = (item as ChatGPTMappingNode).message;
    return msg ?? null;
  }
  // Raw message
  return item as ChatGPTMessage;
}

function isContentMessage(msg: ChatGPTMessage | null | undefined): msg is ChatGPTMessage {
  if (!msg || !msg.author) return false;
  const role = (msg.author.role || "").toLowerCase();
  // Only surface human-relevant turns. ChatGPT's payload mixes in `system`
  // (custom-instruction stubs) and `tool` (chain-of-thought / scratchpad)
  // messages we want to drop.
  if (role !== "user" && role !== "assistant") return false;
  // Hidden system / context-priming messages are flagged; skip them.
  if (msg.metadata?.is_visually_hidden_from_conversation === true) return false;
  if (msg.metadata?.is_redacted === true) return false;
  const text = extractText(msg).trim();
  return text.length > 0;
}

function extractText(msg: ChatGPTMessage): string {
  const c = msg.content;
  if (!c) return "";
  if (typeof c.text === "string") return c.text;
  if (Array.isArray(c.parts)) {
    return c.parts
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          const part = p as Record<string, unknown>;
          if (typeof part.text === "string") return part.text;
          // multimodal parts have shape { content_type: "image_asset_pointer", ... }
          if (part.content_type === "image_asset_pointer") return "*[image]*";
          if (part.content_type && typeof part.content_type === "string") {
            return `*[${part.content_type}]*`;
          }
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function pickTitle(data: ChatGPTConversationData, messages: ChatGPTMessage[]): string {
  const t = (data.title || "").trim();
  if (t) return t;
  const first = messages.find((m) => (m.author?.role || "") === "user");
  if (first) {
    const snippet = extractText(first).replace(/\s+/g, " ").trim().slice(0, 60);
    if (snippet) return snippet;
  }
  return "Captured ChatGPT conversation";
}

function countTurns(messages: ChatGPTMessage[]): number {
  return messages.filter((m) => (m.author?.role || "") === "user").length;
}

function formatMarkdown(
  title: string,
  messages: ChatGPTMessage[],
  sourceUrl: string
): string {
  const lines: string[] = [];
  lines.push(`# ${escapeMdHeading(title)}`);
  lines.push("");
  lines.push(`> Captured from ${sourceUrl}`);
  lines.push("");
  for (const msg of messages) {
    const role = (msg.author?.role || "").toLowerCase();
    const heading = role === "user" ? "You" : "ChatGPT";
    const body = extractText(msg).trim();
    if (!body) continue;
    lines.push(`## ${heading}`);
    lines.push("");
    lines.push(body);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function escapeMdHeading(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}
