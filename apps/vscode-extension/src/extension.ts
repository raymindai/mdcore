import * as vscode from "vscode";
import { PreviewPanel } from "./preview";
import { publishDocument, updateDocument, pullDocument } from "./publish";
import { SyncEngine } from "./sync";
import { AuthManager } from "./auth";
import { StatusBarManager } from "./statusbar";

let syncEngine: SyncEngine | undefined;
let statusBar: StatusBarManager | undefined;
let authManager: AuthManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  authManager = new AuthManager(context);
  statusBar = new StatusBarManager();
  syncEngine = new SyncEngine(authManager, statusBar);

  // Share AuthManager with preview panels for image upload
  PreviewPanel.setAuthManager(authManager);

  // Register URI handler for OAuth callback
  const uriHandler: vscode.UriHandler = {
    handleUri(uri: vscode.Uri): void {
      authManager?.handleAuthCallback(uri);
    },
  };
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  // Command: Preview (WYSIWYG)
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.preview", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }
      PreviewPanel.createOrShow(context.extensionUri, editor.document);
    })
  );

  // Command: Publish
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

      statusBar?.setSyncing("Publishing...");
      try {
        const result = await publishDocument(markdown, title, authManager);
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/d/${result.id}`;

        // Save .mdfy.json
        await saveMdfyConfig(fileName, {
          docId: result.id,
          editToken: result.editToken,
          lastSyncedAt: new Date().toISOString(),
          lastServerUpdatedAt: new Date().toISOString(),
        });

        statusBar?.setSynced();
        const action = await vscode.window.showInformationMessage(
          `Published to ${url}`,
          "Open in Browser",
          "Copy URL"
        );
        if (action === "Open in Browser") {
          vscode.env.openExternal(vscode.Uri.parse(url));
        } else if (action === "Copy URL") {
          await vscode.env.clipboard.writeText(url);
        }
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

  // Command: Login
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.login", async () => {
      await authManager?.login();
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
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === "markdown") {
        statusBar?.show();
        // Auto-open preview if enabled
        const autoPreview = vscode.workspace.getConfiguration("mdfy").get<boolean>("autoPreview", true);
        if (autoPreview) {
          PreviewPanel.createOrShow(context.extensionUri, editor.document);
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
    const autoPreview = config.get<boolean>("autoPreview", true);
    if (autoPreview) {
      PreviewPanel.createOrShow(context.extensionUri, vscode.window.activeTextEditor.document);
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

function getMdfyConfigPath(mdFilePath: string): string {
  const path = require("path");
  const dir = path.dirname(mdFilePath);
  const base = path.basename(mdFilePath, path.extname(mdFilePath));
  return path.join(dir, `${base}.mdfy.json`);
}
