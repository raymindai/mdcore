import * as vscode from "vscode";
import { marked } from "marked";
import * as path from "path";
import * as fs from "fs";

export class PreviewPanel {
  private static instance: PreviewPanel | undefined;
  private static readonly viewType = "mdfy.preview";

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private trackedDocument: vscode.TextDocument | undefined;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    context: vscode.ExtensionContext,
    document: vscode.TextDocument
  ) {
    this.extensionUri = context.extensionUri;
    this.trackedDocument = document;

    this.panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      `mdfy: ${path.basename(document.fileName)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "media"),
        ],
        retainContextWhenHidden: true,
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.extensionUri,
      "media",
      "icon.svg"
    );

    this.panel.onDidDispose(() => this.onDispose(), null, this.disposables);

    this.render(document.getText());
  }

  static createOrShow(
    context: vscode.ExtensionContext,
    document: vscode.TextDocument
  ) {
    if (PreviewPanel.instance) {
      PreviewPanel.instance.trackedDocument = document;
      PreviewPanel.instance.panel.title = `mdfy: ${path.basename(
        document.fileName
      )}`;
      PreviewPanel.instance.render(document.getText());
      PreviewPanel.instance.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    PreviewPanel.instance = new PreviewPanel(context, document);
  }

  static update(document: vscode.TextDocument) {
    if (
      PreviewPanel.instance &&
      PreviewPanel.instance.trackedDocument?.uri.toString() ===
        document.uri.toString()
    ) {
      PreviewPanel.instance.render(document.getText());
    }
  }

  static dispose() {
    PreviewPanel.instance?.panel.dispose();
  }

  private onDispose() {
    PreviewPanel.instance = undefined;
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private getTheme(): "dark" | "light" {
    const config = vscode.workspace.getConfiguration("mdfy");
    const themeSetting = config.get<string>("theme", "auto");
    if (themeSetting === "dark" || themeSetting === "light") {
      return themeSetting;
    }
    // Auto: follow VS Code theme
    const kind = vscode.window.activeColorTheme.kind;
    return kind === vscode.ColorThemeKind.Light ||
      kind === vscode.ColorThemeKind.HighContrastLight
      ? "light"
      : "dark";
  }

  private async render(markdown: string) {
    const html = await marked.parse(markdown, {
      gfm: true,
      breaks: false,
    });

    const theme = this.getTheme();
    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "preview.css")
    );
    const nonce = getNonce();

    this.panel.webview.html = /* html */ `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      style-src ${this.panel.webview.cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}';
      font-src ${this.panel.webview.cspSource} https://cdn.jsdelivr.net;
      img-src ${this.panel.webview.cspSource} https: data:;">
  <link rel="stylesheet" href="${cssUri}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <title>mdfy Preview</title>
</head>
<body>
  <div class="mdcore-rendered" id="content">${html}</div>
  <script nonce="${nonce}">
    (function() {
      // Post-process: highlight code blocks
      document.querySelectorAll('pre code').forEach(function(block) {
        // Add language class for potential future highlighting
        var parent = block.parentElement;
        if (parent && parent.tagName === 'PRE') {
          var lang = parent.getAttribute('lang') || block.className.replace('language-', '');
          if (lang) {
            block.setAttribute('data-language', lang);
          }
        }
      });

      // Post-process: KaTeX math
      // Inline: $...$  Display: $$...$$
      var content = document.getElementById('content');
      if (content && typeof renderMathInElement !== 'undefined') {
        // KaTeX auto-render not loaded in CSP-restricted env, skip
      }

      // Post-process: Mermaid
      document.querySelectorAll('pre code.language-mermaid, pre[lang="mermaid"] code').forEach(function(block) {
        var container = document.createElement('div');
        container.className = 'mermaid-container';
        var inner = document.createElement('div');
        inner.className = 'mermaid-rendered mermaid';
        inner.textContent = block.textContent;
        container.appendChild(inner);
        var pre = block.closest('pre');
        if (pre && pre.parentNode) {
          pre.parentNode.replaceChild(container, pre);
        }
      });

      // Load mermaid dynamically (allowed via CSP nonce)
    })();
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
