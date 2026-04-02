# mdfy.cc — VS Code Extension

WYSIWYG Markdown editor with bidirectional cloud sync to [mdfy.cc](https://mdfy.cc).

## Features

- **WYSIWYG Preview**: Live preview with contentEditable editing. Toolbar for bold, italic, headings, lists, links, code, and more.
- **Publish**: Publish any `.md` file to mdfy.cc with one click. Get a shareable URL instantly.
- **Bidirectional Sync**: Push local changes to the cloud, pull remote changes to your file.
- **Auto-Sync**: Optionally sync on every save with configurable polling interval.
- **Conflict Detection**: When both local and server have changed, view a diff and choose how to resolve.
- **Offline Queue**: Failed pushes are queued and retried automatically.
- **Authentication**: Login to mdfy.cc via OAuth for account-linked publishing.

## Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| `mdfy: Preview (WYSIWYG)` | `Cmd+Shift+M` | Open WYSIWYG preview panel |
| `mdfy: Publish to mdfy.cc` | --- | Publish current file |
| `mdfy: Push to mdfy.cc` | --- | Push local changes |
| `mdfy: Pull from mdfy.cc` | --- | Pull latest from server |
| `mdfy: Login to mdfy.cc` | --- | Authenticate with mdfy.cc |
| `mdfy: Sync Status` | --- | Quick pick menu for sync actions |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mdfy.apiBaseUrl` | `https://mdfy.cc` | API base URL |
| `mdfy.theme` | `auto` | Preview theme: auto, dark, light |
| `mdfy.autoSync` | `false` | Auto-sync on save |
| `mdfy.syncInterval` | `30` | Polling interval in seconds |

## How It Works

When you publish a file, a `.mdfy.json` sidecar file is created next to your `.md` file containing the document ID and edit token. This file is used for subsequent sync operations.

## Development

```bash
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## Packaging

```bash
npm run package
# Produces mdfy-vscode-0.2.0.vsix
```
