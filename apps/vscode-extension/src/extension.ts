import * as vscode from "vscode";
import { PreviewPanel } from "./preview";
import { publishDocument, updateDocument } from "./publish";
import { StatusBarManager } from "./statusbar";

let statusBar: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  statusBar = new StatusBarManager();

  // Command: Preview
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.preview", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }
      PreviewPanel.createOrShow(context, editor.document);
    })
  );

  // Command: Publish
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.publish", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }
      publishDocument(context, editor.document);
    })
  );

  // Command: Update
  context.subscriptions.push(
    vscode.commands.registerCommand("mdfy.update", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }
      updateDocument(context, editor.document);
    })
  );

  // Status bar
  context.subscriptions.push(statusBar);

  // Update preview on text change
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === "markdown") {
        PreviewPanel.update(e.document);
      }
    })
  );

  // Update status bar on editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      statusBar.refresh(editor);
    })
  );

  // Initial status bar state
  statusBar.refresh(vscode.window.activeTextEditor);
}

export function deactivate() {
  PreviewPanel.dispose();
}
