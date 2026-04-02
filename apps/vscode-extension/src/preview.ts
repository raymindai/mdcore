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
    <span class="toolbar-logo"><span style="color:var(--accent)">md</span><span style="color:var(--text-primary)">fy</span></span>
    <span class="toolbar-divider"></span>
    <button data-action="undo" title="Undo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 7h7a3 3 0 010 6H8"/><path d="M6 4L3 7l3 3"/></svg></button>
    <button data-action="redo" title="Redo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 7H6a3 3 0 000 6h2"/><path d="M10 4l3 3-3 3"/></svg></button>
    <span class="toolbar-divider"></span>
    <button data-action="h1" title="Heading 1"><span style="font-size:10px;font-weight:700">H1</span></button>
    <button data-action="h2" title="Heading 2"><span style="font-size:10px;font-weight:700">H2</span></button>
    <button data-action="h3" title="Heading 3"><span style="font-size:10px;font-weight:600">H3</span></button>
    <button data-action="h4" title="Heading 4"><span style="font-size:10px">H4</span></button>
    <button data-action="h5" title="Heading 5"><span style="font-size:10px">H5</span></button>
    <button data-action="h6" title="Heading 6"><span style="font-size:10px">H6</span></button>
    <button data-action="p" title="Paragraph"><span style="font-size:10px">P</span></button>
    <span class="toolbar-divider"></span>
    <button data-action="bold" title="Bold (Cmd+B)"><span style="font-weight:700;font-size:12px">B</span></button>
    <button data-action="italic" title="Italic (Cmd+I)"><span style="font-style:italic;font-size:12px">I</span></button>
    <button data-action="strikethrough" title="Strikethrough"><span style="text-decoration:line-through;font-size:12px">S</span></button>
    <button data-action="code" title="Inline code"><span style="font-family:monospace;font-size:10px">&lt;/&gt;</span></button>
    <span class="toolbar-divider"></span>
    <button data-action="ul" title="Bullet list"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="3" cy="12" r="1"/><rect x="6" y="3" width="8" height="2" rx="0.5"/><rect x="6" y="7" width="8" height="2" rx="0.5"/><rect x="6" y="11" width="8" height="2" rx="0.5"/></svg></button>
    <button data-action="ol" title="Numbered list"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><text x="1" y="5" font-size="4.5" font-weight="700">1</text><text x="1" y="9" font-size="4.5" font-weight="700">2</text><text x="1" y="13" font-size="4.5" font-weight="700">3</text><rect x="6" y="3" width="8" height="2" rx="0.5"/><rect x="6" y="7" width="8" height="2" rx="0.5"/><rect x="6" y="11" width="8" height="2" rx="0.5"/></svg></button>
    <button data-action="task" title="Task list"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2" width="5" height="5" rx="1"/><path d="M3.5 4.5l1 1 2-2" stroke-linecap="round"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="3" width="5" height="2" rx="0.5" fill="currentColor"/><rect x="9" y="10" width="5" height="2" rx="0.5" fill="currentColor"/></svg></button>
    <button data-action="indent" title="Indent"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M7 8h6M7 12h6M3 7l2 1.5L3 10"/></svg></button>
    <button data-action="outdent" title="Outdent"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M7 8h6M7 12h6M5 7l-2 1.5L5 10"/></svg></button>
    <span class="toolbar-divider"></span>
    <button data-action="blockquote" title="Blockquote"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h4v4H5.5L4 10H3V3zm6 0h4v4h-1.5L10 10H9V3z"/></svg></button>
    <button data-action="hr" title="Horizontal rule"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="8" x2="14" y2="8"/></svg></button>
    <span class="toolbar-divider"></span>
    <button data-action="link" title="Link (Cmd+K)"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 9l2-2"/><rect x="1" y="7" width="5" height="5" rx="1.5" transform="rotate(-45 3.5 9.5)"/><rect x="7" y="1" width="5" height="5" rx="1.5" transform="rotate(-45 9.5 3.5)"/></svg></button>
    <button data-action="image" title="Image"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M2 11l3.5-3 2.5 2 3-2.5L14 11" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button data-action="table" title="Insert table"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg></button>
    <button data-action="codeblock" title="Code block"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M5 4L2 8l3 4M11 4l3 4-3 4M9 2l-2 12"/></svg></button>
    <button data-action="removeFormat" title="Clear formatting"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 13h10M6 3l-2.5 7h9L10 3"/><line x1="4" y1="8" x2="12" y2="8"/></svg></button>
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
