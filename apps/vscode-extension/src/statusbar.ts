import * as vscode from "vscode";

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "mdfy.publish";
    this.item.text = "$(cloud-upload) mdfy";
    this.item.tooltip = "Publish to mdfy.cc";
  }

  refresh(editor: vscode.TextEditor | undefined) {
    if (editor && editor.document.languageId === "markdown") {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  dispose() {
    this.item.dispose();
  }
}
