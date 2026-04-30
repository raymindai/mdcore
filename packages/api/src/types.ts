/* ========================================
   @mdcore/api — Shared Types
   ======================================== */

/** Configuration for the MdfyClient */
export interface MdfyClientConfig {
  /** Base URL of the mdfy.app API (default: "https://mdfy.app") */
  baseUrl?: string;
  /** Authentication token (for authenticated operations) */
  token?: string;
  /** User ID (for user-scoped operations) */
  userId?: string;
  /** Anonymous ID (for anonymous operations, fallback) */
  anonymousId?: string;
}

/** Options when publishing a new document */
export interface PublishOptions {
  /** Password-protect the document */
  password?: string;
  /** Auto-expire after N hours */
  expiresIn?: number;
  /** Edit mode: "token" (default), "anyone", "authenticated" */
  editMode?: string;
}

/** Result of publishing a document */
export interface PublishResult {
  /** Full URL to the published document (e.g., "https://mdfy.app/abc123") */
  url: string;
  /** Document ID (the short code) */
  id: string;
  /** Edit token for future modifications */
  editToken: string;
}

/** Options when updating a document */
export interface UpdateOptions {
  /** Updated title */
  title?: string;
  /** Human-readable change summary (for version history) */
  changeSummary?: string;
}

/** A published document */
export interface Document {
  /** Document ID */
  id: string;
  /** Markdown content */
  markdown: string;
  /** Document title (extracted or user-set) */
  title: string | null;
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  /** Last update timestamp (ISO 8601) */
  updated_at: string;
  /** Whether the document is password-protected */
  has_password: boolean;
  /** Expiration timestamp if set (ISO 8601) */
  expires_at: string | null;
  /** Edit mode: "token", "anyone", "authenticated" */
  edit_mode: string;
}

/** Summary of a document (from list endpoint) */
export interface DocumentSummary {
  /** Document ID */
  id: string;
  /** Document title */
  title: string | null;
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  /** Last update timestamp (ISO 8601) */
  updated_at: string;
  /** View count */
  view_count: number;
  /** Whether this is a draft (private) */
  is_draft: boolean;
  /** Edit mode */
  edit_mode: string;
  /** Allowed viewer emails */
  allowed_emails: string[];
}

/** A version snapshot of a document */
export interface Version {
  /** Version row ID */
  id: number;
  /** Sequential version number */
  version_number: number;
  /** Markdown content at this version */
  markdown: string;
  /** Title at this version */
  title: string | null;
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  /** Change summary */
  change_summary: string | null;
}

/** Summary of a version (without markdown body) */
export interface VersionSummary {
  /** Version row ID */
  id: number;
  /** Sequential version number */
  version_number: number;
  /** Title at this version */
  title: string | null;
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  /** Change summary */
  change_summary: string | null;
}

/** Result of uploading an image */
export interface UploadResult {
  /** Public URL of the uploaded image */
  url: string;
  /** File size in bytes */
  size: number;
  /** Content hash (for deduplication) */
  hash: string;
}

/** API error response */
export interface ApiError {
  /** Error message */
  error: string;
  /** Whether authentication is required */
  requiresAuth?: boolean;
  /** Whether storage quota was exceeded */
  quotaExceeded?: boolean;
}
