import * as vscode from "vscode";

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private resetTimer: NodeJS.Timeout | undefined;
  private publishedUrl: string | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "mdfy.sync";
    this.setIdle();
  }

  show(): void {
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  setIdle(): void {
    this.clearResetTimer();
    this.publishedUrl = undefined;
    this.item.text = "$(markdown) mdfy";
    this.item.tooltip = "mdfy.app - Click for sync actions";
    this.item.backgroundColor = undefined;
  }

  setSynced(): void {
    this.clearResetTimer();
    this.item.text = "$(check) mdfy";
    this.item.tooltip = "mdfy.app - Synced";
    this.item.backgroundColor = undefined;

    // Reset to idle after 5 seconds
    this.resetTimer = setTimeout(() => {
      this.setIdle();
    }, 5000);
  }

  setSyncing(message?: string): void {
    this.clearResetTimer();
    this.item.text = `$(sync~spin) mdfy`;
    this.item.tooltip = `mdfy.app - ${message || "Syncing..."}`;
    this.item.backgroundColor = undefined;
  }

  setConflict(): void {
    this.clearResetTimer();
    this.item.text = "$(warning) mdfy";
    this.item.tooltip = "mdfy.app - Conflict detected. Click to resolve.";
    this.item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }

  setPublished(url: string): void {
    this.clearResetTimer();
    this.publishedUrl = url;
    this.item.text = "$(link) mdfy";
    this.item.tooltip = `${url}\nClick to copy URL`;
    this.item.backgroundColor = undefined;
    this.item.command = "mdfy.copyUrl";
  }

  getPublishedUrl(): string | undefined {
    return this.publishedUrl;
  }

  setCollaborating(peerCount: number): void {
    this.clearResetTimer();
    this.item.text = `$(radio-tower) mdfy (${peerCount} ${peerCount === 1 ? "peer" : "peers"})`;
    this.item.tooltip = `mdfy.app - Live collaboration with ${peerCount} ${peerCount === 1 ? "peer" : "peers"}`;
    this.item.backgroundColor = undefined;
  }

  setCollaboratingLive(): void {
    this.clearResetTimer();
    this.item.text = "$(radio-tower) mdfy Live";
    this.item.tooltip = "mdfy.app - Live collaboration active";
    this.item.backgroundColor = undefined;
  }

  setError(): void {
    this.clearResetTimer();
    this.item.text = "$(error) mdfy";
    this.item.tooltip = "mdfy.app - Sync error";
    this.item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );

    // Reset to idle after 10 seconds
    this.resetTimer = setTimeout(() => {
      this.setIdle();
    }, 10000);
  }

  private clearResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  dispose(): void {
    this.clearResetTimer();
    this.item.dispose();
  }
}
