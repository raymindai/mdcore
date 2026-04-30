/* ========================================
   @mdcore/api — Image Upload (Standalone)
   ======================================== */

import { MdfyClient } from "./client.js";
import type { MdfyClientConfig, UploadResult } from "./types.js";

/**
 * Upload an image file to mdfy.app storage.
 *
 * Requires userId or anonymousId in config.
 * Supported formats: JPEG, PNG, GIF, WebP, SVG.
 * Max file size: 5MB.
 *
 * @example
 * ```ts
 * import { upload } from "@mdcore/api";
 * const file = new Blob([...], { type: "image/png" });
 * const result = await upload(file, "screenshot.png", { userId: "..." });
 * console.log(result.url);
 * ```
 */
export async function upload(
  file: Blob,
  filename: string,
  config?: MdfyClientConfig
): Promise<UploadResult> {
  const client = new MdfyClient(config);
  return client.upload(file, filename);
}
