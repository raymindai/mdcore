/**
 * URL-based Markdown sharing
 *
 * Compresses Markdown text into a URL-safe hash fragment.
 * No server needed — the entire document lives in the URL.
 *
 * Flow:
 *   1. User clicks "Share" → MD is compressed → URL with #hash is generated
 *   2. Recipient opens URL → hash is decompressed → MD is rendered
 *
 * Uses CompressionStream API (native in modern browsers) with base64url encoding.
 * Falls back to raw base64 if CompressionStream is unavailable.
 */

// Compress string → base64url
async function compress(text: string): Promise<string> {
  try {
    // Use native CompressionStream (gzip)
    const stream = new Blob([text])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const compressed = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64Url(compressed);
  } catch {
    // Fallback: plain base64 (no compression)
    return btoa(unescape(encodeURIComponent(text)));
  }
}

// Decompress base64url → string
async function decompress(encoded: string): Promise<string> {
  try {
    const buffer = base64UrlToArrayBuffer(encoded);
    const stream = new Blob([buffer])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch {
    // Fallback: try plain base64
    try {
      return decodeURIComponent(escape(atob(encoded)));
    } catch {
      return "";
    }
  }
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a shareable URL from Markdown content
 */
export async function createShareUrl(markdown: string): Promise<string> {
  const compressed = await compress(markdown);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://mdfy.cc";
  return `${baseUrl}/#md=${compressed}`;
}

/**
 * Extract Markdown content from a share URL hash
 * Returns null if no shared content found
 */
export async function extractFromUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash.startsWith("#md=")) return null;

  const encoded = hash.slice(4); // Remove "#md="
  if (!encoded) return null;

  const markdown = await decompress(encoded);
  return markdown || null;
}

// ─── Server-side short URL sharing ───

interface ShortUrlResult {
  url: string;
  editToken: string;
}

export async function createShortUrl(
  markdown: string,
  title?: string
): Promise<ShortUrlResult> {
  const res = await fetch("/api/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, title }),
  });

  if (!res.ok) throw new Error("Failed to create short URL");

  const { id, editToken } = await res.json();
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://mdfy.cc";

  return { url: `${baseUrl}/${id}`, editToken };
}

export async function updateDocument(
  id: string,
  editToken: string,
  markdown: string,
  title?: string
): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, title, editToken }),
  });
  if (!res.ok) throw new Error("Failed to update document");
}

export async function deleteDocument(
  id: string,
  editToken: string
): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ editToken }),
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

// ─── Edit token management (localStorage) ───

const TOKEN_STORAGE_KEY = "mdfy-edit-tokens";

export function saveEditToken(id: string, token: string): void {
  const tokens = getEditTokens();
  tokens[id] = token;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function getEditToken(id: string): string | null {
  return getEditTokens()[id] || null;
}

function getEditTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  }
}
