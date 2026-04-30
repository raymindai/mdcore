# @mdcore/api

HTTP client for the [mdfy.app](https://mdfy.app) API -- publish, update, pull, delete, and manage Markdown documents programmatically.

Works in Node.js, Deno, Bun, and browsers (anywhere `fetch` is available).

## Install

```bash
npm install @mdcore/api
```

## Quick Start

Publish a document in 3 lines:

```ts
import { publish } from "@mdcore/api";

const result = await publish("# Hello World");
console.log(result.url); // "https://mdfy.app/abc123"
```

## MdfyClient (Recommended)

The `MdfyClient` class provides all API operations with shared configuration.

```ts
import { MdfyClient } from "@mdcore/api";

const client = new MdfyClient({
  baseUrl: "https://mdfy.app",  // default, can be omitted
  userId: "user_123",          // optional, for authenticated operations
});
```

### Constructor Options

```ts
interface MdfyClientConfig {
  /** Base URL of the mdfy.app API (default: "https://mdfy.app") */
  baseUrl?: string;
  /** Authentication token (for authenticated operations) */
  token?: string;
  /** User ID (for user-scoped operations like ownership) */
  userId?: string;
  /** Anonymous ID (fallback for anonymous operations) */
  anonymousId?: string;
}
```

### publish(markdown, title?, options?)

Publish a new document.

```ts
const result = await client.publish("# Hello World", "My Document", {
  password: "secret",   // optional: password-protect the document
  expiresIn: 168,       // optional: auto-expire after N hours (168 = 7 days)
  editMode: "token",    // optional: "token" (default), "anyone", "authenticated"
});

console.log(result.url);       // "https://mdfy.app/abc123"
console.log(result.id);        // "abc123"
console.log(result.editToken); // save this for future edits/deletes
```

**Returns:** `PublishResult`

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Full URL to the published document |
| `id` | `string` | Document ID (the short code) |
| `editToken` | `string` | Token required for edits and deletion |

### update(id, editToken, markdown, options?)

Update an existing document. Creates a new version in the document's history.

```ts
await client.update("abc123", editToken, "# Updated Content", {
  title: "New Title",            // optional: change the title
  changeSummary: "Fixed typos",  // optional: shows in version history
});
```

### pull(id)

Fetch a document by ID.

```ts
const doc = await client.pull("abc123");

console.log(doc.markdown);      // "# Hello World"
console.log(doc.title);         // "Hello World"
console.log(doc.created_at);    // "2026-03-20T12:00:00Z"
console.log(doc.has_password);  // false
console.log(doc.edit_mode);     // "token"
```

**Returns:** `Document`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Document ID |
| `markdown` | `string` | Markdown content |
| `title` | `string \| null` | Document title |
| `created_at` | `string` | Creation timestamp (ISO 8601) |
| `updated_at` | `string` | Last update timestamp (ISO 8601) |
| `has_password` | `boolean` | Whether password-protected |
| `expires_at` | `string \| null` | Expiration timestamp if set |
| `edit_mode` | `string` | `"token"`, `"anyone"`, or `"authenticated"` |

### delete(id, editToken)

Delete a document permanently.

```ts
await client.delete("abc123", editToken);
```

### versions(id)

List all versions of a document.

```ts
const versionList = await client.versions("abc123");

for (const v of versionList) {
  console.log(`v${v.version_number}: ${v.change_summary} (${v.created_at})`);
}
```

**Returns:** `VersionSummary[]`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Version row ID |
| `version_number` | `number` | Sequential version number |
| `title` | `string \| null` | Title at this version |
| `created_at` | `string` | Timestamp (ISO 8601) |
| `change_summary` | `string \| null` | Change summary |

### version(docId, versionId)

Fetch a specific version with its full markdown content.

```ts
const v = await client.version("abc123", 42);
console.log(v.markdown);  // Markdown at that version
```

**Returns:** `Version` (same as `VersionSummary` plus `markdown: string`)

### upload(file, filename)

Upload an image file. Supported formats: JPEG, PNG, GIF, WebP, SVG. Max 5MB.

```ts
const file = new Blob([imageBuffer], { type: "image/png" });
const upload = await client.upload(file, "screenshot.png");

console.log(upload.url);   // public URL of the uploaded image
console.log(upload.size);  // file size in bytes
console.log(upload.hash);  // content hash for deduplication
```

**Returns:** `UploadResult`

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Public URL of the uploaded image |
| `size` | `number` | File size in bytes |
| `hash` | `string` | Content hash |

### rotateEditToken(id)

Rotate (regenerate) the edit token for a document. Requires `userId` in the client config.

```ts
const newToken = await client.rotateEditToken("abc123");
console.log(newToken); // new edit token (old one is invalidated)
```

### changeEditMode(id, editMode)

Change who can edit a document. Requires `userId` in the client config.

```ts
await client.changeEditMode("abc123", "anyone");       // anyone with the URL can edit
await client.changeEditMode("abc123", "authenticated"); // signed-in users only
await client.changeEditMode("abc123", "token");         // edit token required (default)
```

### setAllowedEmails(id, emails, editors?)

Restrict document access to specific email addresses. Requires `userId` in the client config.

```ts
const result = await client.setAllowedEmails(
  "abc123",
  ["viewer@example.com", "reader@example.com"],  // allowed viewers
  ["editor@example.com"]                          // allowed editors (optional)
);

console.log(result.allowedEmails);   // ["viewer@example.com", "reader@example.com"]
console.log(result.allowedEditors);  // ["editor@example.com"]
```

## Standalone Functions

For quick one-off operations without instantiating a client. Each function creates a temporary `MdfyClient` internally.

```ts
import { publish, pull, update, deleteDocument, versions, version, upload } from "@mdcore/api";

// Publish
const result = await publish("# Quick publish", "Title");
console.log(result.url);

// Pull
const doc = await pull("abc123");

// Update (pass config as last arg for custom baseUrl/userId)
await update("abc123", editToken, "# New content", { changeSummary: "Updated" });

// Delete
await deleteDocument("abc123", editToken);

// Versions
const vList = await versions("abc123");
const v = await version("abc123", vList[0].id);

// Upload (requires userId in config)
const file = new Blob([...], { type: "image/png" });
const uploaded = await upload(file, "image.png", { userId: "user_123" });
```

Every standalone function accepts an optional `MdfyClientConfig` as its last argument:

```ts
await publish("# Hello", "Title", undefined, {
  baseUrl: "https://staging.mdfy.app",
  userId: "user_123",
});
```

## Error Handling

All methods throw `MdfyApiError` on failure:

```ts
import { MdfyClient, MdfyApiError } from "@mdcore/api";

const client = new MdfyClient();

try {
  await client.pull("nonexistent");
} catch (err) {
  if (err instanceof MdfyApiError) {
    console.error(err.message);         // "Document not found"
    console.error(err.status);          // 404
    console.error(err.data?.error);     // "Document not found"
    console.error(err.data?.requiresAuth);   // true if auth needed
    console.error(err.data?.quotaExceeded);  // true if quota exceeded
  }
}
```

### MdfyApiError

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error message |
| `status` | `number` | HTTP status code |
| `data` | `ApiError \| undefined` | Full error response body |

### Common Error Codes

| Status | Meaning |
|--------|---------|
| `400` | Bad request (missing required fields) |
| `401` | Unauthorized (invalid edit token or missing userId) |
| `403` | Forbidden (no permission for this operation) |
| `404` | Document not found |
| `410` | Document expired |
| `429` | Rate limited (max 10 requests/minute per IP) |

## Types Reference

All types are exported from the package root:

```ts
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
} from "@mdcore/api";
```

## Full Example: Publish and Manage

```ts
import { MdfyClient, MdfyApiError } from "@mdcore/api";

async function main() {
  const client = new MdfyClient({ userId: "user_abc" });

  // 1. Publish a document
  const result = await client.publish(
    "# Project Notes\n\nFirst draft of the project plan.",
    "Project Notes",
    { expiresIn: 24 * 7 }  // expires in 7 days
  );
  console.log("Published:", result.url);

  // 2. Update it later
  await client.update(result.id, result.editToken,
    "# Project Notes\n\nUpdated project plan with timeline.",
    { changeSummary: "Added timeline section" }
  );

  // 3. Check version history
  const vers = await client.versions(result.id);
  console.log(`${vers.length} versions`);

  // 4. Fetch latest content
  const doc = await client.pull(result.id);
  console.log("Title:", doc.title);

  // 5. Upload an image and reference it
  const imageBlob = new Blob([/* ... */], { type: "image/png" });
  const upload = await client.upload(imageBlob, "diagram.png");

  await client.update(result.id, result.editToken,
    doc.markdown + `\n\n![Diagram](${upload.url})`,
    { changeSummary: "Added diagram image" }
  );

  // 6. Restrict access
  await client.changeEditMode(result.id, "authenticated");
  await client.setAllowedEmails(result.id, ["team@example.com"]);

  // 7. Clean up
  await client.delete(result.id, result.editToken);
}

main().catch(console.error);
```

## Requirements

- Node.js 18+ (or any runtime with global `fetch`)
- No external dependencies

## License

MIT
