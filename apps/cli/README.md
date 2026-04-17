# mdfy CLI

Publish Markdown from anywhere — terminal, scripts, CI/CD, tmux.

## Install

```bash
npm install -g mdfy-cli
```

## Quick Start

```bash
# Publish a file
mdfy publish README.md
# → https://mdfy.cc/d/abc123

# Publish from pipe (stdin)
echo "# Hello World" | mdfy publish

# Publish from clipboard (macOS)
pbpaste | mdfy publish

# Capture tmux pane and publish
tmux capture-pane -p | mdfy publish

# Capture AI conversation
cat ~/.claude/conversations/latest.md | mdfy publish
```

## Commands

| Command | Description |
|---------|-------------|
| `mdfy publish <file>` | Publish a .md file and get a URL |
| `mdfy publish` | Publish from stdin (pipe) |
| `mdfy update <id> <file>` | Update an existing document |
| `mdfy pull <id>` | Download a document to stdout |
| `mdfy pull <id> -o <file>` | Download and save to file |
| `mdfy delete <id>` | Delete a document |
| `mdfy list` | List your documents |
| `mdfy open <id>` | Open document in browser |
| `mdfy login` | Authenticate with mdfy.cc |
| `mdfy logout` | Clear stored credentials |
| `mdfy whoami` | Show current user |

## Pipe Support

Works with any command that outputs text:

```bash
# AI assistants
claude "explain React hooks" | mdfy publish

# Git
git log --oneline -20 | mdfy publish

# System info
system_profiler SPHardwareDataType | mdfy publish

# Man pages
man grep | mdfy publish

# Capture terminal output
script -q /dev/null some-command | mdfy publish
```

## tmux Integration

Add to `~/.tmux.conf`:

```bash
# Cmd+M: publish current pane to mdfy.cc
bind-key M run-shell "tmux capture-pane -p -S -1000 | mdfy publish"
```

## Shell Aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Quick publish
alias mp="mdfy publish"

# Publish clipboard
alias mpc="pbpaste | mdfy publish"

# Publish last command output
alias mpl="fc -e - | mdfy publish"
```

## Authentication

```bash
mdfy login
# Opens browser for OAuth → paste token

mdfy whoami
# → user@example.com

mdfy list
# → List of your published documents
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MDFY_URL` | `https://mdfy.cc` | API base URL |

## Config

Credentials stored in `~/.mdfy/config.json`. Edit tokens for published documents stored in `~/.mdfy/tokens.json`.

## Short Aliases

| Short | Full |
|-------|------|
| `mdfy p` | `mdfy publish` |
| `mdfy up` | `mdfy update` |
| `mdfy ls` | `mdfy list` |
| `mdfy rm` | `mdfy delete` |
