export const dynamic = "force-static";

const CONTENT = `# mdfy.cc API Reference
Base URL: https://mdfy.cc
Rate Limit: 10 requests/min per IP
Max Document Size: 500KB

## Authentication

mdfy.cc uses progressive authentication:
- No auth required for basic publish and read
- Edit tokens for updates/deletes (returned at creation)
- User identity via x-user-id or Authorization: Bearer JWT headers
- MCP and CLI use JWT from \`mdfy login\` (stored in ~/.mdfy/config.json)

## Endpoints

### POST /api/docs
Create a new document.

Parameters:
- markdown (string, required): Markdown content
- title (string, optional): Document title
- isDraft (boolean, default false): Draft status
- source (string, optional): Source identifier ("api", "web", "vscode", "mcp", "cli")
- password (string, optional): Password-protect the document
- expiresIn (string, optional): Expiration time ("1h", "1d", "7d", "30d")
- editMode (string, optional): "token" (default), "anyone", "authenticated"
- folderId (string, optional): Folder to place document in
- userId (string, optional): User UUID for ownership

Request:
\`\`\`
curl -X POST https://mdfy.cc/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "# Hello World", "isDraft": false}'
\`\`\`

Response 200:
\`\`\`json
{
  "id": "abc123",
  "editToken": "tok_aBcDeFgHiJkLmNoP",
  "created_at": "2026-04-15T00:00:00Z"
}
\`\`\`

### GET /api/docs/{id}
Read a document by ID.

Headers (optional):
- x-user-id: User UUID for ownership verification
- x-document-password: Password for protected documents
- x-user-email: User email for identification
- x-anonymous-id: Anonymous user ID
- Authorization: Bearer <token>

Request:
\`\`\`
curl https://mdfy.cc/api/docs/abc123
\`\`\`

Response 200:
\`\`\`json
{
  "id": "abc123",
  "title": "My Document",
  "markdown": "# Hello World",
  "created_at": "2026-04-15T00:00:00Z",
  "updated_at": "2026-04-15T01:00:00Z",
  "view_count": 42,
  "is_draft": false,
  "editMode": "token",
  "isOwner": true,
  "editToken": "tok_...",
  "hasPassword": false
}
\`\`\`

### PATCH /api/docs/{id}
Update a document. Requires edit token or owner authentication.

Parameters:
- editToken (string, required for token mode): Edit token from creation
- markdown (string, optional): New Markdown content
- title (string, optional): New title
- isDraft (boolean, optional): Toggle draft/published
- action (string, optional): "soft-delete" or "rotate-token"
- changeSummary (string, optional): Version note
- editMode (string, optional): Change edit mode

Request (update content):
\`\`\`
curl -X PATCH https://mdfy.cc/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{"editToken": "tok_...", "markdown": "# Updated", "changeSummary": "Fixed typos"}'
\`\`\`

Request (soft delete):
\`\`\`
curl -X PATCH https://mdfy.cc/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{"editToken": "tok_...", "action": "soft-delete"}'
\`\`\`

Response 200:
\`\`\`json
{
  "success": true,
  "id": "abc123",
  "updated_at": "2026-04-15T02:00:00Z"
}
\`\`\`

### HEAD /api/docs/{id}
Check when a document was last updated. Returns x-updated-at header.

Request:
\`\`\`
curl -I https://mdfy.cc/api/docs/abc123
\`\`\`

Response Headers:
- x-updated-at: 2026-04-15T01:00:00Z
- x-content-length: 1234

### GET /api/user/documents
List all documents owned by a user.

Headers (one required):
- x-user-id: User UUID
- x-user-email: User email
- Authorization: Bearer <token>

Request:
\`\`\`
curl https://mdfy.cc/api/user/documents \\
  -H "x-user-id: user-uuid"
\`\`\`

Response 200:
\`\`\`json
{
  "documents": [
    {
      "id": "abc123",
      "title": "My Document",
      "created_at": "2026-04-15T00:00:00Z",
      "updated_at": "2026-04-15T01:00:00Z",
      "is_draft": false,
      "view_count": 42
    }
  ]
}
\`\`\`

### POST /api/upload
Upload an image. Returns a public URL.

Request:
\`\`\`
curl -X POST https://mdfy.cc/api/upload \\
  -F "file=@screenshot.png"
\`\`\`

Response 200:
\`\`\`json
{
  "url": "https://storage.mdfy.cc/uploads/screenshot.png"
}
\`\`\`

## Error Codes

- 400: Bad Request - Missing required fields or invalid parameters
- 401: Unauthorized - Invalid or missing edit token / credentials
- 403: Forbidden - Password required or wrong password
- 404: Not Found - Document does not exist or deleted
- 410: Gone - Document has expired
- 429: Too Many Requests - Rate limit exceeded (Retry-After header included)
- 500: Internal Server Error

Error response format:
\`\`\`json
{
  "error": "Document not found",
  "status": 404
}
\`\`\`

## CLI

Install: npm install -g mdfy-cli

Commands:
- mdfy publish <file>: Publish a file or stdin
- mdfy update <id> <file>: Update existing document
- mdfy pull <id>: Download document content
- mdfy delete <id>: Soft-delete a document
- mdfy list: List your documents
- mdfy open <id>: Open in browser
- mdfy capture: Capture tmux pane and publish
- mdfy login: Authenticate
- mdfy logout: Clear credentials
- mdfy whoami: Show current user

Pipe examples:
- echo "# Hello" | mdfy publish
- pbpaste | mdfy publish
- cat file.md | mdfy publish
- tmux capture-pane -p | mdfy publish

## JavaScript SDK

Install: npm install @mdcore/api

\`\`\`typescript
import { MdfyClient, publish, pull, update, deleteDocument } from "@mdcore/api";

// Quick publish
const { id, editToken, url } = await publish("# Hello");

// Client with config
const client = new MdfyClient({ userId: "uuid", email: "user@example.com" });
const result = await client.publish("# Hello", { title: "Doc", isDraft: false });
const doc = await client.pull(id);
await client.update(id, "# Updated", { editToken });
await client.delete(id, editToken);
const docs = await client.list();
\`\`\`

## MCP Server

Two ways to connect:

### Option A: Hosted HTTP MCP (Claude Web, Cursor, etc.)

URL: https://mdfy.cc/api/mcp

In Claude.ai: Settings → Integrations → Add custom MCP server → paste the URL.
In Cursor: Settings → MCP → Add server with { "url": "https://mdfy.cc/api/mcp" }.

### Option B: Local stdio MCP (Claude Desktop, Claude Code)

Prerequisites: npm install -g mdfy-cli && mdfy login

Config (.mcp.json or claude_desktop_config.json):
\`\`\`json
{
  "mcpServers": {
    "mdfy": {
      "command": "npx",
      "args": ["mdfy-mcp"]
    }
  }
}
\`\`\`

### Tools (hosted HTTP MCP exposes 25)

Core CRUD:
- mdfy_create(markdown, title?, draft?): Create document, returns url/id
- mdfy_read(id): Read document content
- mdfy_update(id, markdown, title?): Update document
- mdfy_delete(id): Delete document
- mdfy_list(): List user's documents (auth)
- mdfy_search(query): Full-text search (auth)

Append/Prepend:
- mdfy_append(id, content, separator?): Append content
- mdfy_prepend(id, content): Prepend content

Sections:
- mdfy_outline(id): Get heading-based outline / TOC
- mdfy_extract_section(id, heading): Extract content of a section
- mdfy_replace_section(id, heading, newContent): Replace a section

Duplicate/Import:
- mdfy_duplicate(id, title?): Duplicate as new document
- mdfy_import_url(url, title?): Fetch URL → markdown → save

Sharing:
- mdfy_publish(id, published): Toggle public/private
- mdfy_set_password(id, password): Set/remove password
- mdfy_set_expiry(id, expiresInHours): Set/clear expiration
- mdfy_set_allowed_emails(id, emails): Restrict to email allowlist
- mdfy_get_share_url(id): Get URL + access metadata

Versions:
- mdfy_versions(id): List version history
- mdfy_restore_version(id, versionId): Restore previous version
- mdfy_diff(id, fromVersionId, toVersionId): Line-level diff

Stats/Folders:
- mdfy_stats(id): View count, dates, status
- mdfy_recent(): Recently visited (auth)
- mdfy_folder_list(): List folders (auth)
- mdfy_folder_create(name, parentId?): Create folder (auth)
- mdfy_move_to_folder(documentId, folderId): Move doc to folder

The local stdio package (mdfy-mcp v1.3.0) currently exposes the 6 core tools.
For the full 25, use the hosted HTTP endpoint.

## npm Packages

- @mdcore/api: HTTP client, publish/read/update/delete, zero deps
- @mdcore/engine: WASM Markdown renderer (Rust/comrak), GFM, KaTeX, Mermaid
- @mdcore/styles: CSS-only, dark/light themes, print styles
- @mdcore/ai: AI providers (Gemini, OpenAI, Anthropic), text-to-markdown
- mdfy-mcp: MCP server for AI tools
`;

export function GET() {
  return new Response(CONTENT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
