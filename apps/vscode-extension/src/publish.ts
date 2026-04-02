import * as vscode from "vscode";
import { getApiBaseUrl } from "./extension";
import { AuthManager } from "./auth";

interface PublishResult {
  id: string;
  editToken: string;
}

interface PullResult {
  markdown: string;
  title: string | null;
  updated_at: string;
}

/**
 * Publish a new document to mdfy.cc.
 * POST /api/docs → { id, editToken }
 */
export async function publishDocument(
  markdown: string,
  title: string,
  authManager?: AuthManager
): Promise<PublishResult> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/docs`;

  const body: Record<string, unknown> = { markdown, title };

  // Attach userId if logged in
  const userId = await authManager?.getUserId();
  if (userId) {
    body.userId = userId;
  }

  const token = await authManager?.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as PublishResult;
  return data;
}

/**
 * Update an existing document on mdfy.cc.
 * PATCH /api/docs/{id} → { ok: true }
 */
export async function updateDocument(
  id: string,
  editToken: string,
  markdown: string,
  title: string,
  authManager?: AuthManager
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/docs/${id}`;

  const body: Record<string, unknown> = {
    editToken,
    markdown,
    title,
    action: "auto-save",
  };

  const userId = await authManager?.getUserId();
  if (userId) {
    body.userId = userId;
  }

  const token = await authManager?.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `HTTP ${response.status}: ${response.statusText}`
    );
  }
}

/**
 * Pull the latest document content from mdfy.cc.
 * GET /api/docs/{id} → { markdown, title, updated_at, ... }
 */
export async function pullDocument(
  id: string,
  authManager?: AuthManager
): Promise<PullResult> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/docs/${id}`;

  const headers: Record<string, string> = {};
  const token = await authManager?.getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const userId = await authManager?.getUserId();
  if (userId) {
    headers["x-user-id"] = userId;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as PullResult;
  return data;
}

/**
 * Check if the server document has been updated since last sync.
 * Returns the updated_at timestamp from the server.
 */
export async function checkServerUpdatedAt(
  id: string,
  authManager?: AuthManager
): Promise<string | undefined> {
  try {
    const data = await pullDocument(id, authManager);
    return data.updated_at;
  } catch {
    return undefined;
  }
}
