/* ========================================
   @mdcore/api — Document Functions (Standalone)

   Standalone functions for quick usage without
   instantiating MdfyClient. Each function creates
   a temporary client under the hood.
   ======================================== */

import { MdfyClient } from "./client.js";
import type {
  MdfyClientConfig,
  PublishOptions,
  PublishResult,
  UpdateOptions,
  Document,
  Version,
  VersionSummary,
} from "./types.js";

/**
 * Publish markdown as a new document.
 *
 * @example
 * ```ts
 * import { publish } from "@mdcore/api";
 * const result = await publish("# Hello", "My Doc");
 * console.log(result.url);
 * ```
 */
export async function publish(
  markdown: string,
  title?: string,
  options?: PublishOptions,
  config?: MdfyClientConfig
): Promise<PublishResult> {
  const client = new MdfyClient(config);
  return client.publish(markdown, title, options);
}

/**
 * Update an existing document.
 */
export async function update(
  id: string,
  editToken: string,
  markdown: string,
  options?: UpdateOptions,
  config?: MdfyClientConfig
): Promise<void> {
  const client = new MdfyClient(config);
  return client.update(id, editToken, markdown, options);
}

/**
 * Pull (fetch) a document by ID.
 */
export async function pull(
  id: string,
  config?: MdfyClientConfig
): Promise<Document> {
  const client = new MdfyClient(config);
  return client.pull(id);
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  id: string,
  editToken: string,
  config?: MdfyClientConfig
): Promise<void> {
  const client = new MdfyClient(config);
  return client.delete(id, editToken);
}

/**
 * List all versions of a document.
 */
export async function versions(
  id: string,
  config?: MdfyClientConfig
): Promise<VersionSummary[]> {
  const client = new MdfyClient(config);
  return client.versions(id);
}

/**
 * Fetch a specific version of a document.
 */
export async function version(
  docId: string,
  versionId: number,
  config?: MdfyClientConfig
): Promise<Version> {
  const client = new MdfyClient(config);
  return client.version(docId, versionId);
}
