# mdfy CLI

Publish Markdown from anywhere — terminal, scripts, CI/CD, tmux. Every output becomes a permanent, shareable URL.

Part of the [mdfy.app](https://mdfy.app) ecosystem.

## Install

```bash
npm install -g mdfy-cli
```

## Quick Start

```bash
# Publish a file → get a URL
mdfy publish README.md
# → https://mdfy.app/d/abc123 (copied to clipboard)

# Publish from pipe
echo "# Hello World" | mdfy publish

# Publish clipboard
pbpaste | mdfy publish

# Read a document in terminal
mdfy read abc123
```

## Commands

| Command | Description |
|---------|-------------|
| `mdfy publish <file>` | Publish a .md file and get a URL |
| `mdfy publish` | Publish from stdin (pipe) |
| `mdfy read <id>` | Read a document in the terminal with formatting |
| `mdfy capture [source]` | Capture terminal/AI output and publish |
| `mdfy update <id> <file>` | Update an existing document |
| `mdfy pull <id> [-o file]` | Download a document |
| `mdfy delete <id>` | Delete a document |
| `mdfy list` | List your documents |
| `mdfy open <id>` | Open document in browser |
| `mdfy login` | Authenticate with mdfy.app |
| `mdfy logout` | Clear stored credentials |
| `mdfy whoami` | Show current user |

### Short Aliases

| Short | Full |
|-------|------|
| `mdfy p` | `mdfy publish` |
| `mdfy up` | `mdfy update` |
| `mdfy ls` | `mdfy list` |
| `mdfy rm` | `mdfy delete` |
| `mdfy cat` | `mdfy read` |
| `mdfy c` | `mdfy capture` |

## Use Cases

### Pipe anything to a URL

```bash
# AI assistant output
claude "explain React hooks" | mdfy publish

# Git log
git log --oneline -20 | mdfy publish

# System info
system_profiler SPHardwareDataType | mdfy publish

# Man pages
man grep | mdfy publish

# Command output
curl -s https://api.example.com/status | mdfy publish
```

### Capture terminal sessions

```bash
# Auto-detect: tmux pane if in tmux, clipboard otherwise
mdfy capture

# Explicit sources
mdfy capture tmux        # Current tmux pane
mdfy capture clipboard   # System clipboard
mdfy capture last        # Pipe: some-cmd | mdfy capture last
```

AI conversations (Claude Code, ChatGPT CLI, Ollama) are auto-detected and formatted with User/Assistant roles.

### Read documents in terminal

```bash
# By ID
mdfy read abc123

# By URL
mdfy read https://mdfy.app/d/abc123

# Output includes: color-coded headings, bold, code, blockquotes, lists
```

### tmux integration

Add to `~/.tmux.conf`:

```bash
bind-key M run-shell "tmux capture-pane -p -S -1000 | mdfy publish"
```

Press `prefix + M` to publish the current pane.

### Shell aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias mp="mdfy publish"
alias mpc="pbpaste | mdfy publish"
```

## Authentication

```bash
mdfy login     # Opens browser for OAuth → paste token
mdfy whoami    # Show current user
mdfy list      # List your published documents
mdfy logout    # Clear credentials
```

Credentials stored in `~/.mdfy/config.json`. Edit tokens in `~/.mdfy/tokens.json`.

## How It Works

1. `mdfy publish` sends Markdown to mdfy.app API
2. Returns a permanent short URL (`mdfy.app/d/...`)
3. URL is copied to clipboard (macOS)
4. Edit token is saved locally for future updates
5. Documents render with syntax highlighting, math (KaTeX), and Mermaid diagrams

## Other Channels

| Channel | Install |
|---------|---------|
| [Web Editor](https://mdfy.app) | Just open the URL |
| [Hosted MCP (Claude Web, Cursor, etc.)](https://mdfy.app/docs/mcp) | URL: `https://mdfy.app/api/mcp` |
| [Local MCP (Claude Desktop, Claude Code)](https://www.npmjs.com/package/mdfy-mcp) | `npx mdfy-mcp` |
| [VS Code Extension](https://mdfy.app/plugins) | Download from Plugins page |
| [Chrome Extension](https://mdfy.app/plugins) | Download from Plugins page |
| [Mac Desktop App](https://mdfy.app/plugins) | Download from Plugins page |
| [tmux Plugin](https://github.com/raymindai/mdcore/tree/main/apps/tmux) | Manual install |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MDFY_URL` | `https://mdfy.app` | API base URL |

## License

MIT
