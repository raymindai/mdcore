import * as vscode from "vscode";
import {
  loadMdfyConfig,
  saveMdfyConfig,
  getApiBaseUrl,
  MdfyConfig,
} from "./extension";
import {
  updateDocument,
  pullDocument,
  checkServerUpdatedAt,
} from "./publish";
import { AuthManager } from "./auth";
import { StatusBarManager } from "./statusbar";
import { PreviewPanel } from "./preview";

export class SyncEngine {
  private authManager: AuthManager;
  private statusBar: StatusBarManager;
  private pollingTimer: NodeJS.Timeout | undefined;
  private pushDebounceTimers = new Map<string, NodeJS.Timeout>();
  private offlineQueue: Array<{
    filePath: string;
    markdown: string;
    title: string;
  }> = [];

  constructor(authManager: AuthManager, statusBar: StatusBarManager) {
    this.authManager = authManager;
    this.statusBar = statusBar;
  }

  /**
   * Start the polling sync loop.
   */
  startPolling(intervalSeconds: number): void {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      this.pollAllTrackedFiles();
    }, intervalSeconds * 1000);
  }

  /**
   * Stop the polling sync loop.
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  /**
   * Handle file save event with debounced push.
   */
  onFileSaved(document: vscode.TextDocument): void {
    const filePath = document.fileName;

    // Clear existing debounce
    const existing = this.pushDebounceTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    // Debounce 2 seconds
    const timer = setTimeout(async () => {
      this.pushDebounceTimers.delete(filePath);
      try {
        await this.push(document);
      } catch (err) {
        // Silently queue for offline if network error
        const config = await loadMdfyConfig(filePath);
        if (config) {
          this.queueOffline(filePath, document.getText(), extractTitle(document.getText()) || "");
        }
      }
    }, 2000);

    this.pushDebounceTimers.set(filePath, timer);
  }

  /**
   * Push local changes to mdfy.cc.
   */
  async push(document: vscode.TextDocument): Promise<void> {
    const filePath = document.fileName;
    const config = await loadMdfyConfig(filePath);

    if (!config) {
      vscode.window.showWarningMessage(
        "This file has not been published to mdfy.cc yet. Use 'mdfy: Publish' first."
      );
      return;
    }

    const markdown = document.getText();
    const title = extractTitle(markdown) || vscode.workspace.asRelativePath(document.uri);

    this.statusBar.setSyncing("Pushing...");
    PreviewPanel.currentPanel?.setSyncStatus("syncing");

    try {
      await updateDocument(
        config.docId,
        config.editToken,
        markdown,
        title,
        this.authManager
      );

      config.lastSyncedAt = new Date().toISOString();
      config.lastServerUpdatedAt = new Date().toISOString();
      await saveMdfyConfig(filePath, config);

      this.statusBar.setSynced();
      PreviewPanel.currentPanel?.setSyncStatus("synced");
    } catch (err) {
      this.statusBar.setError();
      PreviewPanel.currentPanel?.setSyncStatus("error");

      // Queue for offline retry
      this.queueOffline(filePath, markdown, title);

      throw err;
    }
  }

  /**
   * Pull latest content from mdfy.cc into the local file.
   */
  async pull(document: vscode.TextDocument): Promise<void> {
    const filePath = document.fileName;
    const config = await loadMdfyConfig(filePath);

    if (!config) {
      vscode.window.showWarningMessage(
        "This file has not been published to mdfy.cc yet. Use 'mdfy: Publish' first."
      );
      return;
    }

    this.statusBar.setSyncing("Pulling...");
    PreviewPanel.currentPanel?.setSyncStatus("syncing");

    try {
      const remote = await pullDocument(config.docId, this.authManager);

      // Apply remote content to the file
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      edit.replace(document.uri, fullRange, remote.markdown);
      await vscode.workspace.applyEdit(edit);
      await document.save();

      config.lastSyncedAt = new Date().toISOString();
      config.lastServerUpdatedAt = remote.updated_at;
      await saveMdfyConfig(filePath, config);

      this.statusBar.setSynced();
      PreviewPanel.currentPanel?.setSyncStatus("synced");
      vscode.window.showInformationMessage("Pulled latest from mdfy.cc.");
    } catch (err) {
      this.statusBar.setError();
      PreviewPanel.currentPanel?.setSyncStatus("error");
      throw err;
    }
  }

  /**
   * Poll all tracked (published) markdown files for server changes.
   */
  private async pollAllTrackedFiles(): Promise<void> {
    // First, flush offline queue
    await this.flushOfflineQueue();

    // Check all open markdown editors for sync state
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId !== "markdown") {continue;}

      const filePath = editor.document.fileName;
      const config = await loadMdfyConfig(filePath);
      if (!config) {continue;}

      try {
        const serverUpdatedAt = await checkServerUpdatedAt(
          config.docId,
          this.authManager
        );

        if (!serverUpdatedAt) {continue;}

        const localMtime = config.lastSyncedAt;
        const serverTime = new Date(serverUpdatedAt).getTime();
        const localTime = new Date(localMtime).getTime();

        // Check if local file has unsaved changes
        const localDirty = editor.document.isDirty;

        if (serverTime > localTime && !localDirty) {
          // Only server changed, and local is clean: pull
          await this.pull(editor.document);
        } else if (serverTime > localTime && localDirty) {
          // Both changed: conflict
          this.statusBar.setConflict();
          PreviewPanel.currentPanel?.setSyncStatus("conflict");

          const action = await vscode.window.showWarningMessage(
            `Conflict detected for ${vscode.workspace.asRelativePath(editor.document.uri)}. The server version has changed.`,
            "Pull (Overwrite Local)",
            "Push (Overwrite Server)",
            "Show Diff"
          );

          if (action === "Pull (Overwrite Local)") {
            await this.pull(editor.document);
          } else if (action === "Push (Overwrite Server)") {
            await this.push(editor.document);
          } else if (action === "Show Diff") {
            await this.showConflictDiff(editor.document, config);
          }
        }
      } catch {
        // Network error during polling, skip silently
      }
    }
  }

  /**
   * Show a diff between local and server content.
   */
  private async showConflictDiff(
    document: vscode.TextDocument,
    config: MdfyConfig
  ): Promise<void> {
    try {
      const remote = await pullDocument(config.docId, this.authManager);

      // Create a temporary document with server content
      const serverDoc = await vscode.workspace.openTextDocument({
        content: remote.markdown,
        language: "markdown",
      });

      await vscode.commands.executeCommand(
        "vscode.diff",
        serverDoc.uri,
        document.uri,
        `mdfy.cc (server) <-> ${vscode.workspace.asRelativePath(document.uri)} (local)`
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to fetch server version: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Queue a failed push for offline retry.
   */
  private queueOffline(filePath: string, markdown: string, title: string): void {
    // Remove existing entry for this file
    this.offlineQueue = this.offlineQueue.filter(
      (item) => item.filePath !== filePath
    );
    this.offlineQueue.push({ filePath, markdown, title });
  }

  /**
   * Retry queued offline pushes.
   */
  private async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {return;}

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      const config = await loadMdfyConfig(item.filePath);
      if (!config) {continue;}

      try {
        await updateDocument(
          config.docId,
          config.editToken,
          item.markdown,
          item.title,
          this.authManager
        );

        config.lastSyncedAt = new Date().toISOString();
        config.lastServerUpdatedAt = new Date().toISOString();
        await saveMdfyConfig(item.filePath, config);
      } catch {
        // Still offline, re-queue
        this.offlineQueue.push(item);
      }
    }
  }

  dispose(): void {
    this.stopPolling();
    for (const timer of this.pushDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.pushDebounceTimers.clear();
  }
}

function extractTitle(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}
