import * as vscode from "vscode";
import { marked } from "marked";
import * as path from "path";

export class PreviewPanel {
  private static panels: Map<string, PreviewPanel> = new Map();
  private static readonly viewType = "mdfyPreview";

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private trackedDocument: vscode.TextDocument | undefined;
  private isUpdatingFromWebview = false;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    const key = document.uri.toString();
    const existing = PreviewPanel.panels.get(key);

    if (existing) {
      existing.trackedDocument = document;
      existing.panel.reveal(column);
      existing.updateContent(document.getText());
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      `mdfy Preview: ${path.basename(document.fileName)}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    const previewPanel = new PreviewPanel(panel, extensionUri, document);
    PreviewPanel.panels.set(key, previewPanel);
  }

  public static updateIfActive(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const panel = PreviewPanel.panels.get(key);
    if (panel && !panel.isUpdatingFromWebview) {
      panel.updateContent(document.getText());
    }
  }

  /**
   * Update sync status for the preview panel tracking the given document URI.
   */
  public static updateSyncStatusForDocument(
    uri: vscode.Uri,
    status: string
  ): void {
    const key = uri.toString();
    const panel = PreviewPanel.panels.get(key);
    if (panel) {
      panel.setSyncStatus(status);
    }
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.trackedDocument = document;

    this.panel.webview.html = this.getHtml(document.getText());

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message: { type: string; markdown?: string }) => {
        switch (message.type) {
          case "edit": {
            if (!message.markdown || !this.trackedDocument) {return;}
            this.isUpdatingFromWebview = true;
            try {
              const edit = new vscode.WorkspaceEdit();
              const fullRange = new vscode.Range(
                this.trackedDocument.positionAt(0),
                this.trackedDocument.positionAt(
                  this.trackedDocument.getText().length
                )
              );
              edit.replace(this.trackedDocument.uri, fullRange, message.markdown);
              await vscode.workspace.applyEdit(edit);
            } finally {
              // Small delay to avoid echo
              setTimeout(() => {
                this.isUpdatingFromWebview = false;
              }, 100);
            }
            break;
          }
          case "requestUpdate": {
            if (this.trackedDocument) {
              this.updateContent(this.trackedDocument.getText());
            }
            break;
          }
        }
      },
      null,
      this.disposables
    );

    this.panel.onDidDispose(
      () => {
        // Remove from the panels map
        if (this.trackedDocument) {
          PreviewPanel.panels.delete(this.trackedDocument.uri.toString());
        }
        this.dispose();
      },
      null,
      this.disposables
    );
  }

  public setSyncStatus(status: string): void {
    this.panel.webview.postMessage({ type: "syncStatus", status });
  }

  private updateContent(markdown: string): void {
    const html = renderMarkdown(markdown);
    this.panel.webview.postMessage({ type: "update", html, markdown });
  }

  private getHtml(markdown: string): string {
    const webview = this.panel.webview;

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "preview.css")
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "preview.js")
    );

    const nonce = getNonce();
    const renderedHtml = renderMarkdown(markdown);

    const themeSetting = vscode.workspace
      .getConfiguration("mdfy")
      .get<string>("theme", "auto");

    let themeClass: string;
    if (themeSetting === "auto") {
      const kind = vscode.window.activeColorTheme.kind;
      themeClass =
        kind === vscode.ColorThemeKind.Light ||
        kind === vscode.ColorThemeKind.HighContrastLight
          ? "light"
          : "dark";
    } else {
      themeClass = themeSetting;
    }

    const cdnBase = "https://cdnjs.cloudflare.com/ajax/libs";

    return `<!DOCTYPE html>
<html lang="en" data-theme="${themeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource} https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;">
  <link rel="stylesheet" href="${cssUri}">
  <link rel="stylesheet" href="${cdnBase}/highlight.js/11.11.1/styles/github-dark.min.css">
  <link rel="stylesheet" href="${cdnBase}/KaTeX/0.16.40/katex.min.css">
  <title>mdfy Preview</title>
</head>
<body>
  <div id="toolbar">
    <button data-action="bold" title="Bold (Ctrl+B)"><b>B</b></button>
    <button data-action="italic" title="Italic (Ctrl+I)"><i>I</i></button>
    <button data-action="strikethrough" title="Strikethrough"><s>S</s></button>
    <span class="toolbar-divider"></span>
    <button data-action="h1" title="Heading 1">H1</button>
    <button data-action="h2" title="Heading 2">H2</button>
    <button data-action="h3" title="Heading 3">H3</button>
    <span class="toolbar-divider"></span>
    <button data-action="ul" title="Bullet List">&#8226; List</button>
    <button data-action="ol" title="Numbered List">1. List</button>
    <button data-action="task" title="Task List">&#9744; Task</button>
    <span class="toolbar-divider"></span>
    <button data-action="link" title="Insert Link">&#128279;</button>
    <button data-action="code" title="Inline Code">&lt;/&gt;</button>
    <button data-action="codeblock" title="Code Block">&#9114;</button>
    <button data-action="blockquote" title="Blockquote">&#8220;</button>
    <button data-action="hr" title="Horizontal Rule">&#8213;</button>
  </div>

  <article id="content" class="mdcore-rendered" contenteditable="true">
    ${renderedHtml}
  </article>

  <div id="sync-bar">
    <span id="sync-status">Ready</span>
  </div>

  <!-- Syntax highlighting -->
  <script nonce="${nonce}" src="${cdnBase}/highlight.js/11.11.1/highlight.min.js"></script>
  <!-- KaTeX math rendering -->
  <script nonce="${nonce}" src="${cdnBase}/KaTeX/0.16.40/katex.min.js"></script>
  <!-- Mermaid diagrams -->
  <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@11.13.0/dist/mermaid.min.js"></script>

  <script nonce="${nonce}">
    window.__initialMarkdown = ${JSON.stringify(markdown)};

    // Post-process: syntax highlighting
    document.querySelectorAll('pre code').forEach(function(block) {
      if (typeof hljs !== 'undefined') hljs.highlightElement(block);
    });

    // Post-process: KaTeX math
    document.querySelectorAll('[data-math-style]').forEach(function(el) {
      if (typeof katex !== 'undefined') {
        try {
          katex.render(el.textContent || '', el, {
            displayMode: el.getAttribute('data-math-style') === 'display',
            throwOnError: false
          });
        } catch(e) {}
      }
    });

    // Post-process: Mermaid diagrams
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ startOnLoad: false, theme: '${themeClass === "dark" ? "dark" : "default"}' });
      document.querySelectorAll('pre[lang="mermaid"] code, code.language-mermaid').forEach(function(el) {
        var container = document.createElement('div');
        container.className = 'mermaid';
        container.textContent = el.textContent;
        el.closest('pre').replaceWith(container);
      });
      mermaid.run();
    }
  </script>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

function renderMarkdown(markdown: string): string {
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const html = marked.parse(markdown);
  if (typeof html !== "string") {
    return "";
  }

  // Raw HTML — postprocessing (highlight.js, KaTeX, Mermaid) runs in the webview via CDN scripts
  return html;
}

function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
