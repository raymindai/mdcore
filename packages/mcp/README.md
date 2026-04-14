# mdfy-mcp

MCP server for [mdfy.cc](https://mdfy.cc) — let AI tools create and manage Markdown documents.

## Setup

### Claude Code / Claude Desktop

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "mdfy": {
      "command": "npx",
      "args": ["mdfy-mcp"],
      "env": {
        "MDFY_EMAIL": "your@email.com"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MDFY_EMAIL` | For list/publish/delete | Your mdfy.cc account email |
| `MDFY_BASE_URL` | No | API base URL (default: `https://mdfy.cc`) |

## Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `mdfy_create` | Create a new document, get a shareable URL | No |
| `mdfy_read` | Fetch document content by ID | No |
| `mdfy_update` | Update existing document content | Edit token (auto) |
| `mdfy_list` | List all your documents | Yes (email) |
| `mdfy_publish` | Toggle between public and private | Yes (email) |
| `mdfy_delete` | Delete a document | Yes (email) |

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

## API Documentation

Full API reference: [mdfy.cc/docs](https://mdfy.cc/docs)

## License

MIT
