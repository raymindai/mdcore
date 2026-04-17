# mdfy-mcp

MCP server for [mdfy.cc](https://mdfy.cc) — let AI tools create and manage Markdown documents.

## Setup

### 1. Install and login

```bash
npm install -g mdfy-cli
mdfy login
```

### 2. Add to your AI tool

Create `.mcp.json` in your project root (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "mdfy": {
      "command": "npx",
      "args": ["mdfy-mcp"]
    }
  }
}
```

Authentication is handled via `mdfy login` — no environment variables needed.

## Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `mdfy_create` | Create a new document, get a shareable URL | No |
| `mdfy_read` | Fetch document content by ID | No |
| `mdfy_update` | Update existing document content | Edit token (auto) |
| `mdfy_list` | List all your documents | Yes (`mdfy login`) |
| `mdfy_publish` | Toggle between public and private | Edit token (auto) |
| `mdfy_delete` | Delete a document | Edit token (auto) |

## Usage Examples

```
"Create a technical blog post about WebAssembly on mdfy.cc"
→ mdfy_create → https://mdfy.cc/d/abc123

"Show me my mdfy documents"
→ mdfy_list → 5 documents found...

"Make that document private"
→ mdfy_publish (published: false) → Document is now private

"Update my blog post with this new section"
→ mdfy_update → Document updated
```

## How It Works

The MCP server shares credentials with the `mdfy` CLI:

- **JWT token** from `mdfy login` is stored in `~/.mdfy/config.json`
- **Edit tokens** for documents are stored in `~/.mdfy/tokens.json`
- All API requests use `Authorization: Bearer` headers (no email spoofing possible)

## API Documentation

Full API reference: [mdfy.cc/docs](https://mdfy.cc/docs)

## License

MIT
