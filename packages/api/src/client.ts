/* ========================================
   @mdcore/api — Base HTTP Client
   ======================================== */

import type {
  MdfyClientConfig,
  PublishOptions,
  PublishResult,
  UpdateOptions,
  Document,
  Version,
  VersionSummary,
  UploadResult,
  ApiError,
} from "./types.js";

const DEFAULT_BASE_URL = "https://mdfy.cc";

/**
 * mdfy.cc API client.
 *
 * Provides methods to publish, update, pull, delete documents,
 * manage versions, upload images, and control access.
 *
 * @example
 * ```ts
 * import { MdfyClient } from "@mdcore/api";
 *
 * const client = new MdfyClient({ baseUrl: "https://mdfy.cc" });
 * const result = await client.publish("# Hello World");
 * console.log(result.url); // "https://mdfy.cc/abc123"
 * ```
 */
export class MdfyClient {
  private baseUrl: string;
  private token?: string;
  private userId?: string;
  private anonymousId?: string;

  constructor(config: MdfyClientConfig = {}) {
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.token = config.token;
    this.userId = config.userId;
    this.anonymousId = config.anonymousId;
  }

  // ─── Internal helpers ───

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.userId) {
      headers["x-user-id"] = this.userId;
    }
    if (this.anonymousId) {
      headers["x-anonymous-id"] = this.anonymousId;
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorData: ApiError;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
      }
      throw new MdfyApiError(errorData.error, res.status, errorData);
    }

    return res.json();
  }

  // ─── Documents ───

  /**
   * Publish a new document.
   *
   * @param markdown - Markdown content
   * @param title - Optional document title
   * @param options - Optional publish settings (password, expiration, edit mode)
   * @returns Published document URL, ID, and edit token
   */
  async publish(
    markdown: string,
    title?: string,
    options?: PublishOptions
  ): Promise<PublishResult> {
    const data = await this.request<{ id: string; editToken: string }>(
      "/api/docs",
      {
        method: "POST",
        body: JSON.stringify({
          markdown,
          title,
          password: options?.password,
          expiresIn: options?.expiresIn,
          editMode: options?.editMode,
          userId: this.userId,
          anonymousId: this.anonymousId,
        }),
      }
    );

    return {
      url: `${this.baseUrl}/${data.id}`,
      id: data.id,
      editToken: data.editToken,
    };
  }

  /**
   * Update an existing document.
   *
   * @param id - Document ID
   * @param editToken - Edit token (received from publish)
   * @param markdown - New markdown content
   * @param options - Optional update settings
   */
  async update(
    id: string,
    editToken: string,
    markdown: string,
    options?: UpdateOptions
  ): Promise<void> {
    await this.request(`/api/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        markdown,
        title: options?.title,
        editToken,
        userId: this.userId,
        anonymousId: this.anonymousId,
        changeSummary: options?.changeSummary,
      }),
    });
  }

  /**
   * Pull (fetch) a document by ID.
   *
   * @param id - Document ID
   * @returns Document data
   */
  async pull(id: string): Promise<Document> {
    return this.request<Document>(`/api/docs/${id}`);
  }

  /**
   * Delete a document.
   *
   * @param id - Document ID
   * @param editToken - Edit token
   */
  async delete(id: string, editToken: string): Promise<void> {
    await this.request(`/api/docs/${id}`, {
      method: "DELETE",
      body: JSON.stringify({
        editToken,
        userId: this.userId,
        anonymousId: this.anonymousId,
      }),
    });
  }

  // ─── Versions ───

  /**
   * List all versions of a document.
   *
   * @param id - Document ID
   * @returns Array of version summaries
   */
  async versions(id: string): Promise<VersionSummary[]> {
    const data = await this.request<{ versions: VersionSummary[] }>(
      `/api/docs/${id}/versions`
    );
    return data.versions;
  }

  /**
   * Fetch a specific version of a document.
   *
   * @param docId - Document ID
   * @param versionId - Version row ID
   * @returns Full version data including markdown
   */
  async version(docId: string, versionId: number): Promise<Version> {
    const data = await this.request<{ version: Version }>(
      `/api/docs/${docId}/versions/${versionId}`
    );
    return data.version;
  }

  // ─── Upload ───

  /**
   * Upload an image file.
   *
   * @param file - File blob to upload
   * @param filename - Original filename
   * @returns Upload result with public URL
   */
  async upload(file: Blob, filename: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file, filename);

    const url = `${this.baseUrl}/api/upload`;
    const headers: Record<string, string> = {};

    if (this.userId) {
      headers["x-user-id"] = this.userId;
    }
    if (this.anonymousId) {
      headers["x-anonymous-id"] = this.anonymousId;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errorData: ApiError;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
      }
      throw new MdfyApiError(errorData.error, res.status, errorData);
    }

    return res.json();
  }

  // ─── Access Management ───

  /**
   * Rotate the edit token for a document (owner only).
   *
   * @param id - Document ID
   * @returns New edit token
   */
  async rotateEditToken(id: string): Promise<string> {
    if (!this.userId) {
      throw new MdfyApiError("userId required to rotate token", 400);
    }
    const data = await this.request<{ editToken: string }>(
      `/api/docs/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          action: "rotate-token",
          userId: this.userId,
        }),
      }
    );
    return data.editToken;
  }

  /**
   * Change the edit mode of a document (owner only).
   *
   * @param id - Document ID
   * @param editMode - New edit mode: "token", "anyone", "authenticated"
   */
  async changeEditMode(id: string, editMode: string): Promise<void> {
    if (!this.userId) {
      throw new MdfyApiError("userId required to change edit mode", 400);
    }
    await this.request(`/api/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "change-edit-mode",
        userId: this.userId,
        editMode,
      }),
    });
  }

  /**
   * Set allowed email addresses for a document (owner only).
   *
   * @param id - Document ID
   * @param emails - Array of allowed viewer emails
   * @param editors - Array of allowed editor emails
   * @returns Updated allowed lists
   */
  async setAllowedEmails(
    id: string,
    emails: string[],
    editors?: string[]
  ): Promise<{ allowedEmails: string[]; allowedEditors: string[] }> {
    if (!this.userId) {
      throw new MdfyApiError("userId required to set allowed emails", 400);
    }
    const data = await this.request<{
      allowedEmails: string[];
      allowedEditors: string[];
    }>(`/api/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "set-allowed-emails",
        userId: this.userId,
        allowedEmails: emails,
        allowedEditors: editors,
      }),
    });
    return {
      allowedEmails: data.allowedEmails || [],
      allowedEditors: data.allowedEditors || [],
    };
  }
}

// ─── Error class ───

/**
 * Error thrown by the mdfy.cc API client.
 */
export class MdfyApiError extends Error {
  /** HTTP status code */
  status: number;
  /** Full error response data */
  data?: ApiError;

  constructor(message: string, status: number, data?: ApiError) {
    super(message);
    this.name = "MdfyApiError";
    this.status = status;
    this.data = data;
  }
}
