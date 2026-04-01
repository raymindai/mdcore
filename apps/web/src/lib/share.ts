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
  title?: string,
  options?: { password?: string; expiresIn?: number; userId?: string; anonymousId?: string; editMode?: string }
): Promise<ShortUrlResult> {
  const res = await fetch("/api/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      markdown,
      title,
      password: options?.password,
      expiresIn: options?.expiresIn,
      userId: options?.userId,
      anonymousId: options?.anonymousId,
      editMode: options?.editMode,
    }),
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
  title?: string,
  options?: { userId?: string; anonymousId?: string; changeSummary?: string }
): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      markdown,
      title,
      editToken,
      userId: options?.userId,
      anonymousId: options?.anonymousId,
      changeSummary: options?.changeSummary,
    }),
  });
  if (!res.ok) throw new Error("Failed to update document");
}

export async function fetchVersions(id: string): Promise<{
  versions: { id: number; version_number: number; title: string | null; created_at: string; change_summary: string | null }[];
}> {
  const res = await fetch(`/api/docs/${id}/versions`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export async function fetchVersion(docId: string, versionId: number): Promise<{
  version: { id: number; markdown: string; title: string | null; version_number: number; created_at: string };
}> {
  const res = await fetch(`/api/docs/${docId}/versions/${versionId}`);
  if (!res.ok) throw new Error("Failed to fetch version");
  return res.json();
}

export async function rotateEditToken(id: string, userId: string): Promise<string> {
  const res = await fetch(`/api/docs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rotate-token", userId }),
  });
  if (!res.ok) throw new Error("Failed to rotate token");
  const { editToken } = await res.json();
  return editToken;
}

export async function changeEditMode(id: string, userId: string, editMode: string): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "change-edit-mode", userId, editMode }),
  });
  if (!res.ok) throw new Error("Failed to change edit mode");
}

export async function deleteDocument(
  id: string,
  editToken: string,
  options?: { userId?: string; anonymousId?: string }
): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      editToken,
      userId: options?.userId,
      anonymousId: options?.anonymousId,
    }),
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
