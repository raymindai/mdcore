/* ========================================
   @mdcore/api — Public API
   ======================================== */

// Client
export { MdfyClient, MdfyApiError } from "./client.js";

// Standalone functions
export {
  publish,
  update,
  pull,
  deleteDocument,
  versions,
  version,
} from "./documents.js";

export { upload } from "./upload.js";

// Types
export type {
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
