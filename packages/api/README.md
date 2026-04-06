# @mdcore/api

API client for mdfy.cc — publish, update, pull, and delete Markdown documents.

## Install

```bash
npm install @mdcore/api
```

## Usage

### Client (recommended)

```ts
import { MdfyClient } from "@mdcore/api";

const client = new MdfyClient({
  baseUrl: "https://mdfy.cc", // default
  userId: "user_123",         // optional, for authenticated operations
});

// Publish a new document
const result = await client.publish("# Hello World", "My Document", {
  password: "secret",   // optional
  expiresIn: 168,       // optional, hours
});
console.log(result.url);       // "https://mdfy.cc/abc123"
console.log(result.editToken); // save this for future edits

// Update
await client.update(result.id, result.editToken, "# Updated Content", {
  changeSummary: "Fixed typo",
});

// Pull (fetch)
const doc = await client.pull(result.id);
console.log(doc.markdown);

// Versions
const versions = await client.versions(result.id);
const v1 = await client.version(result.id, versions[0].id);

// Delete
await client.delete(result.id, result.editToken);

// Upload image
const file = new Blob([imageBuffer], { type: "image/png" });
const upload = await client.upload(file, "screenshot.png");
console.log(upload.url);
```

### Standalone functions

```ts
import { publish, pull, update, deleteDocument } from "@mdcore/api";

const result = await publish("# Quick publish");
const doc = await pull(result.id);
```

## Error Handling

```ts
import { MdfyApiError } from "@mdcore/api";

try {
  await client.publish(markdown);
} catch (err) {
  if (err instanceof MdfyApiError) {
    console.error(err.message, err.status);
  }
}
```

## License

MIT
