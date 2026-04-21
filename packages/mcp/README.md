# mdfy-mcp

MCP server for [mdfy.cc](https://mdfy.cc) — let any AI tool create, read, update, and manage Markdown documents with permanent shareable URLs.

Works with **Claude Code**, **Claude Desktop**, **Cursor**, and any [Model Context Protocol](https://modelcontextprotocol.io/) compatible client.

## Quick Start

### 1. Login (one-time)

```bash
npx mdfy-cli login
```

Opens your browser for OAuth. Credentials are stored locally in `~/.mdfy/`.

### 2. Add to your AI tool

**Claude Code / Cursor** — create `.mcp.json` in your project root:

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

**Claude Desktop** — add to `claude_desktop_config.json`:

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

No API keys or environment variables needed. Authentication is handled via `mdfy login`.

## Tools

| Tool | Description | Auth |
|------|-------------|------|
| `mdfy_create` | Create a new document and get a shareable URL | Optional |
| `mdfy_read` | Fetch document content by ID or URL | No |
| `mdfy_update` | Update an existing document's content | Edit token (auto-managed) |
| `mdfy_list` | List all your documents with metadata | Yes |
| `mdfy_publish` | Toggle a document between public and private | Edit token (auto-managed) |
| `mdfy_delete` | Soft-delete or permanently delete a document | Edit token (auto-managed) |

## What You Can Do

```
You: "Create a document with my meeting notes"
AI:  mdfy_create → https://mdfy.cc/d/abc123 (URL copied!)

You: "List my documents"
AI:  mdfy_list → 8 documents found

You: "Read the system design doc"
AI:  mdfy_read → (full markdown content)

You: "Update it with the new architecture section"
AI:  mdfy_update → Document updated

You: "Make it private"
AI:  mdfy_publish (published: false) → Now private

You: "Delete the draft"
AI:  mdfy_delete → Moved to trash
```

### Cross-AI Workflow

mdfy.cc URLs work as context across AI conversations:

```
You (in Claude): "Summarize the research at mdfy.cc/d/abc123"
AI:  mdfy_read → reads the document → provides summary

You (in ChatGPT): "Read mdfy.cc/d/abc123 and suggest improvements"
ChatGPT: fetches the URL → gives feedback

You (in Claude): "Update mdfy.cc/d/abc123 with the improvements"
AI:  mdfy_update → document updated, same URL
```

## How Authentication Works

The MCP server shares credentials with the `mdfy` CLI:

1. `mdfy login` opens your browser for Google/GitHub OAuth
2. JWT token is stored locally in `~/.mdfy/config.json`
3. Edit tokens for each document are stored in `~/.mdfy/tokens.json`
4. All API requests use `Authorization: Bearer` headers
5. Tokens auto-refresh when expired (clear error message if re-login needed)

No email spoofing possible — all requests are authenticated via JWT.

## Features

- **Permanent URLs** — every document gets a short URL (`mdfy.cc/d/...`) that never expires
- **Auto-managed edit tokens** — create a doc, get edit access automatically
- **Public or private** — toggle visibility with `mdfy_publish`
- **Markdown rendering** — documents render with syntax highlighting, KaTeX math, Mermaid diagrams
- **Version history** — all edits are tracked
- **Zero config** — just `npx mdfy-mcp`, no API keys needed

## Other Channels

mdfy.cc is available everywhere:

| Channel | Install |
|---------|---------|
| [Web Editor](https://mdfy.cc) | Just open the URL |
| [CLI](https://www.npmjs.com/package/mdfy-cli) | `npm install -g mdfy-cli` |
| [VS Code Extension](https://mdfy.cc/plugins) | Download .vsix from Plugins page |
| [Chrome Extension](https://mdfy.cc/plugins) | Download from Plugins page |
| [Mac Desktop App](https://mdfy.cc/plugins) | Download .dmg from Plugins page |

## Links

- Website: [mdfy.cc](https://mdfy.cc)
- Plugins: [mdfy.cc/plugins](https://mdfy.cc/plugins)
- API Docs: [mdfy.cc/docs](https://mdfy.cc/docs)
- GitHub: [github.com/raymindai/mdcore](https://github.com/raymindai/mdcore)

## License

MIT
