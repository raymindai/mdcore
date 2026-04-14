import * as vscode from "vscode";
import { PreviewPanel } from "./preview";
import { publishDocument, updateDocument, pullDocument } from "./publish";
import { SyncEngine } from "./sync";
import { AuthManager } from "./auth";
import { StatusBarManager } from "./statusbar";
import { MdfySidebarProvider } from "./sidebar";

let syncEngine: SyncEngine | undefined;
let statusBar: StatusBarManager | undefined;
let authManager: AuthManager | undefined;
let sidebarProvider: MdfySidebarProvider | undefined;
let suppressAutoPreview = false;

export function suppressAutoPreviewFor(ms: number): void {
  suppressAutoPreview = true;
  setTimeout(() => { suppressAutoPreview = false; }, ms);
}

export function activate(context: vscode.ExtensionContext): void {
  authManager = new AuthManager(context);
  statusBar = new StatusBarManager();
  syncEngine = new SyncEngine(authManager, statusBar, context);

  // Share AuthManager with preview panels for image upload
  PreviewPanel.setAuthManager(authManager);

  // Refresh sidebar on login/logout
  context.subscriptions.push(
    authManager.onDidLogin(() => {
      sidebarProvider?.refresh();
    })
  );

  // Sidebar WebviewView
  sidebarProvider = new MdfySidebarProvider(context.extensionUri, authManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      MdfySidebarProvider.viewType,
      sidebarProvider
    )
  );

  // Refresh sidebar when files are saved or created
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === "markdown") {
        sidebarProvider?.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(() => {
      sidebarProvider?.refresh();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles(() => {
      sidebarProvider?.refresh();
    })
  );

  // Register URI handler for OAuth callback
  const uriHandler: vscode.UriHandler = {
    handleUri(uri: vscode.Uri): void {
      authManager?.handleAuthCallback(uri);
    },
  };
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  // Command: Preview (WYSIWYG)
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.preview", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }
      PreviewPanel.createOrShow(context.extensionUri, editor.document);
      // Check if published and show badge
      const config = await loadMdfyConfig(editor.document.fileName);
      if (config) {
        const baseUrl = getApiBaseUrl();
        setTimeout(() => {
          PreviewPanel.setPublishedStateForDocument(
            editor.document.uri,
            config.docId,
            `${baseUrl}/d/${config.docId}`
          );
        }, 300);
      }
    })
  );

  // Command: Publish (one-click: publish or push + auto-copy URL)
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.publish", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }

      const markdown = editor.document.getText();
      const fileName = editor.document.fileName;
      const title =
        extractTitle(markdown) ||
        vscode.workspace.asRelativePath(editor.document.uri);
      const baseUrl = getApiBaseUrl();

      // If already published → push update instead
      const existing = await loadMdfyConfig(fileName);
      if (existing) {
        statusBar?.setSyncing("Pushing...");
        try {
          const updateResult = await updateDocument(
            existing.docId, existing.editToken, markdown, title, authManager
          );
          existing.lastSyncedAt = new Date().toISOString();
          existing.lastServerUpdatedAt = updateResult.updated_at;
          await saveMdfyConfig(fileName, existing);

          const url = `${baseUrl}/d/${existing.docId}`;
          await vscode.env.clipboard.writeText(url);
          statusBar?.setPublished(url);
          sidebarProvider?.refresh();
          vscode.window.showInformationMessage(`Updated & URL copied: ${url}`);
        } catch (err) {
          statusBar?.setError();
          vscode.window.showErrorMessage(
            `Push failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
        return;
      }

      // First publish
      statusBar?.setSyncing("Publishing...");
      try {
        const result = await publishDocument(markdown, title, authManager);
        const url = `${baseUrl}/d/${result.id}`;

        await saveMdfyConfig(fileName, {
          docId: result.id,
          editToken: result.editToken,
          lastSyncedAt: new Date().toISOString(),
          lastServerUpdatedAt: new Date().toISOString(),
        });

        await vscode.env.clipboard.writeText(url);
        statusBar?.setPublished(url);
        PreviewPanel.setPublishedStateForDocument(editor.document.uri, result.id, url);
        sidebarProvider?.refresh();
        vscode.window.showInformationMessage(`Published & URL copied: ${url}`);
      } catch (err) {
        statusBar?.setError();
        vscode.window.showErrorMessage(
          `Publish failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Update (Push)
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.update", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }

      try {
        await syncEngine?.push(editor.document);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Push failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Pull
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.pull", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }

      try {
        await syncEngine?.pull(editor.document);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Pull failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Copy URL (from status bar click)
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.copyUrl", async () => {
      const url = statusBar?.getPublishedUrl();
      if (url) {
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage(`URL copied: ${url}`);
      } else {
        // Fall back to sync menu
        vscode.commands.executeCommand("mdfy.sync");
      }
    })
  );

  // Command: Login
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.login", async () => {
      await authManager?.login();
    })
  );

  // Command: Export
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.export", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }

      const items: vscode.QuickPickItem[] = [
        { label: "$(file-code) Copy as HTML", description: "Copy rendered HTML to clipboard" },
        { label: "$(file-text) Copy as Rich Text", description: "For Google Docs, Email, Word" },
        { label: "$(comment-discussion) Copy as Slack", description: "Slack mrkdwn format" },
        { label: "$(desktop-download) Save as HTML", description: "Save rendered HTML file" },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Export document as...",
      });

      if (!selected) { return; }
      const markdown = editor.document.getText();

      if (selected.label.includes("Copy as HTML")) {
        const html = PreviewPanel.renderToHtml(markdown);
        await vscode.env.clipboard.writeText(html);
        vscode.window.showInformationMessage("HTML copied to clipboard.");
      } else if (selected.label.includes("Rich Text")) {
        const html = PreviewPanel.renderToHtml(markdown);
        await vscode.env.clipboard.writeText(html);
        vscode.window.showInformationMessage("Rich Text HTML copied to clipboard.");
      } else if (selected.label.includes("Slack")) {
        const slack = markdownToSlack(markdown);
        await vscode.env.clipboard.writeText(slack);
        vscode.window.showInformationMessage("Slack mrkdwn copied to clipboard.");
      } else if (selected.label.includes("Save as HTML")) {
        const html = PreviewPanel.renderToFullHtml(markdown);
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(
            editor.document.fileName.replace(/\.md$/, ".html")
          ),
          filters: { "HTML": ["html"] },
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(html, "utf-8"));
          vscode.window.showInformationMessage(`Saved to ${uri.fsPath}`);
        }
      }
    })
  );

  // Command: Sync Status
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.sync", async () => {
      const items: vscode.QuickPickItem[] = [
        { label: "$(cloud-upload) Publish", description: "Publish current file to mdfy.cc" },
        { label: "$(arrow-up) Push", description: "Push local changes to mdfy.cc" },
        { label: "$(arrow-down) Pull", description: "Pull latest from mdfy.cc" },
        { label: "$(sign-in) Login", description: "Login to mdfy.cc" },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "mdfy.cc Sync Actions",
      });

      if (!selected) {return;}
      if (selected.label.includes("Publish")) {
        vscode.commands.executeCommand("mdfy.publish");
      } else if (selected.label.includes("Push")) {
        vscode.commands.executeCommand("mdfy.update");
      } else if (selected.label.includes("Pull")) {
        vscode.commands.executeCommand("mdfy.pull");
      } else if (selected.label.includes("Login")) {
        vscode.commands.executeCommand("mdfy.login");
      }
    })
  );

  // Auto-sync on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== "markdown") {return;}
      const config = vscode.workspace.getConfiguration("mdfy");
      if (config.get<boolean>("autoSync")) {
        syncEngine?.onFileSaved(doc);
      }
    })
  );

  // Update preview on text change
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === "markdown") {
        PreviewPanel.updateIfActive(e.document);
      }
    })
  );

  // Update status bar on editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.languageId === "markdown") {
        statusBar?.show();

        // Check if published → show URL in status bar
        const cfg = await loadMdfyConfig(editor.document.fileName);
        if (cfg) {
          const base = getApiBaseUrl();
          statusBar?.setPublished(`${base}/d/${cfg.docId}`);
        } else {
          statusBar?.setIdle();
        }

        // Auto-open preview if enabled (skip if sidebar just opened it)
        if (!suppressAutoPreview) {
          const autoPreview = vscode.workspace.getConfiguration("mdfy").get<boolean>("autoPreview", true);
          if (autoPreview) {
            PreviewPanel.createIfNotExists(context.extensionUri, editor.document);
          }
        }
      } else {
        statusBar?.hide();
      }
    })
  );

  // Start sync engine if autoSync enabled
  const config = vscode.workspace.getConfiguration("mdfy");
  if (config.get<boolean>("autoSync")) {
    const interval = config.get<number>("syncInterval") ?? 30;
    syncEngine.startPolling(interval);
  }

  // Show status bar + auto-preview if active editor is markdown
  if (
    vscode.window.activeTextEditor?.document.languageId === "markdown"
  ) {
    statusBar.show();
    // Check published state for status bar
    loadMdfyConfig(vscode.window.activeTextEditor.document.fileName).then((cfg) => {
      if (cfg) {
        const base = getApiBaseUrl();
        statusBar?.setPublished(`${base}/d/${cfg.docId}`);
      }
    });
    const autoPreview = config.get<boolean>("autoPreview", true);
    if (autoPreview) {
      PreviewPanel.createIfNotExists(context.extensionUri, vscode.window.activeTextEditor.document);
    }
  }

  context.subscriptions.push({
    dispose(): void {
      syncEngine?.dispose();
      statusBar?.dispose();
    },
  });
}

export function deactivate(): void {
  syncEngine?.dispose();
  statusBar?.dispose();
}

// --- Helpers ---

function extractTitle(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

export function getApiBaseUrl(): string {
  const config = vscode.workspace.getConfiguration("mdfy");
  return config.get<string>("apiBaseUrl") ?? "https://mdfy.cc";
}

export interface MdfyConfig {
  docId: string;
  editToken: string;
  lastSyncedAt: string;
  lastServerUpdatedAt: string;
}

export async function loadMdfyConfig(
  mdFilePath: string
): Promise<MdfyConfig | undefined> {
  const configPath = getMdfyConfigPath(mdFilePath);
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(configPath));
    return JSON.parse(Buffer.from(data).toString("utf-8")) as MdfyConfig;
  } catch {
    return undefined;
  }
}

export async function saveMdfyConfig(
  mdFilePath: string,
  config: MdfyConfig
): Promise<void> {
  const configPath = getMdfyConfigPath(mdFilePath);
  const data = Buffer.from(JSON.stringify(config, null, 2), "utf-8");
  await vscode.workspace.fs.writeFile(vscode.Uri.file(configPath), data);
}

function markdownToSlack(md: string): string {
  return md
    // Bold: **text** or __text__ → *text*
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "*$1*")
    // Italic: *text* or _text_ → _text_
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "_$1_")
    // Strikethrough: ~~text~~ → ~text~
    .replace(/~~(.+?)~~/g, "~$1~")
    // Links: [text](url) → <url|text>
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>")
    // Headers: # text → *text*
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    // Inline code stays as `code`
    // Code blocks: ```lang\n...\n``` → ```\n...\n```
    .replace(/```\w*\n/g, "```\n")
    // Task lists: - [x] → :white_check_mark:, - [ ] → :white_large_square:
    .replace(/^(\s*)- \[x\]\s/gm, "$1:white_check_mark: ")
    .replace(/^(\s*)- \[ \]\s/gm, "$1:white_large_square: ")
    // Blockquote: > text → > text (same in Slack)
    // Images: ![alt](url) → <url|alt>
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "<$2|$1>")
    // Horizontal rule
    .replace(/^---+$/gm, "———");
}

export function getMdfyConfigPath(mdFilePath: string): string {
  const path = require("path");
  const dir = path.dirname(mdFilePath);
  const base = path.basename(mdFilePath, path.extname(mdFilePath));
  return path.join(dir, `${base}.mdfy.json`);
}
