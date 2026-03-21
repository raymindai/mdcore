"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import { htmlToMarkdown, isHtmlContent } from "@/lib/html-to-md";
import {
  isAiConversation,
  parseConversation,
  formatConversation,
} from "@/lib/ai-conversation";
import MdCanvas from "@/components/MdCanvas";
// import { parseSourceBlocks, matchElementToBlock, type SourceBlock } from "@/lib/source-map";
import {
  createShareUrl,
  createShortUrl,
  saveEditToken,
  getEditToken,
  updateDocument,
  deleteDocument,
  extractFromUrl,
  copyToClipboard,
} from "@/lib/share";

const SAMPLE_MD = `---
title: mdcore Demo
---

# Welcome to mdfy.cc

> **The universal Markdown engine for the AI era.**
> Paste any Markdown — from any AI, any tool, any flavor. Rendered instantly via Rust + WASM.

## Features Detected Automatically

### GFM (GitHub Flavored Markdown)

- [x] Tables with alignment
- [x] Task lists
- [x] Strikethrough ~~like this~~
- [x] Autolinks: https://mdfy.cc
- [ ] More coming soon

| Engine | Language | WASM | Speed |
|--------|----------|:----:|-------|
| **mdcore** | Rust | ✅ | 🚀 25x faster |
| markdown-it | JavaScript | ❌ | Baseline |
| Pandoc | Haskell | ❌ | CLI only |
| Remark | JavaScript | ❌ | AST only |

### Code with Syntax Highlighting

\`\`\`rust
use mdcore_engine::render;

fn main() {
    let result = render("# Hello from Rust → WASM");
    println!("Flavor: {}", result.flavor.primary);
    println!("HTML: {}", result.html);
}
\`\`\`

\`\`\`typescript
import { renderMarkdown } from "@mdcore/engine";

const { html, flavor, toc } = await renderMarkdown(input);
console.log(\`Detected: \${flavor.primary}, math: \${flavor.math}\`);
document.getElementById("output").innerHTML = html;
\`\`\`

### Math Support

Inline math: $E = mc^2$ and $\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J}$

Display math:

$$
\\int_0^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

### Mermaid Diagrams

**Flowchart:**

\`\`\`mermaid
graph LR
    A[Markdown] --> B[mdcore Engine]
    B --> C[WASM]
    B --> D[Native Binary]
    B --> E[Node.js napi-rs]
    C --> F[Browser]
    C --> G[Edge / CF Workers]
    D --> H[CLI - brew install]
    E --> J[npm package]
    style B fill:#fb923c,stroke:#ea580c,color:#000
\`\`\`

**Sequence Diagram:**

\`\`\`mermaid
sequenceDiagram
    participant User
    participant mdfy.cc
    participant WASM Engine
    User->>mdfy.cc: Paste Markdown
    mdfy.cc->>WASM Engine: render(md)
    WASM Engine-->>mdfy.cc: HTML + metadata
    mdfy.cc-->>User: Beautiful document
\`\`\`

**Pie Chart:**

\`\`\`mermaid
pie title Markdown Flavors
    "GFM" : 45
    "CommonMark" : 25
    "Obsidian" : 15
    "MDX" : 10
    "Other" : 5
\`\`\`

> mdfy.cc supports all Mermaid diagram types: flowcharts, sequence, class, state, ER, gantt, pie, git graph, mindmap, timeline, and more. Use the **Mermaid** tab to visually create flowcharts.

### Footnotes & More

This has a footnote[^1]. And another[^2].

[^1]: mdcore supports GFM-style footnotes out of the box.
[^2]: Built with comrak — the same Rust parser that powers GitLab.

---

*Rendered by **mdcore engine v0.1.0** — Rust → WASM, running entirely in your browser. No server round-trip.*
`;

type ViewMode = "split" | "preview" | "editor" | "mermaid";

type Theme = "dark" | "light";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("mdfy-theme") as Theme | null;
    const initial = saved || "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("mdfy-theme", t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggleTheme };
}

export default function MdEditor() {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const [markdown, setMarkdown] = useState(SAMPLE_MD);
  const [html, setHtml] = useState("");
  const [flavor, setFlavor] = useState<string>("detecting...");
  const [flavorDetails, setFlavorDetails] = useState<Record<string, boolean>>(
    {}
  );
  const [title, setTitle] = useState<string | undefined>();
  const [renderTime, setRenderTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [shareState, setShareState] = useState<
    "idle" | "sharing" | "copied" | "error"
  >("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isSharedDoc, setIsSharedDoc] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [canvasMermaid, setCanvasMermaid] = useState<string | undefined>();
  // const [sourceBlocks, setSourceBlocks] = useState<SourceBlock[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Set default view mode based on screen size
  useEffect(() => {
    if (isMobile) {
      setViewMode("split"); // vertical split on mobile
    }
  }, [isMobile]);

  const doRender = useCallback(async (md: string) => {
    try {
      const start = performance.now();
      const result = await renderMarkdown(md);
      const elapsed = performance.now() - start;

      const processed = postProcessHtml(result.html);

      setHtml(processed);
      setFlavor(result.flavor.primary);
      setFlavorDetails({
        math: result.flavor.math,
        mermaid: result.flavor.mermaid,
        wikilinks: result.flavor.wikilinks,
        jsx: result.flavor.jsx,
      });
      setTitle(result.title);
      setRenderTime(elapsed);
      setCharCount(md.length);
      setIsLoading(false);

      // Detect AI conversation
      if (md.length > 50 && isAiConversation(md)) {
        setShowAiBanner(true);
      } else {
        setShowAiBanner(false);
      }
    } catch (e) {
      console.error("Render error:", e);
    }
  }, []);

  // Mermaid rendering after DOM update
  // Finds <pre lang="mermaid"> directly in DOM (no regex on HTML strings)
  useEffect(() => {
    if (!previewRef.current || isLoading) return;

    // Find all <pre> with lang="mermaid" that haven't been rendered yet
    const mermaidPres = previewRef.current.querySelectorAll('pre[lang="mermaid"]');
    if (mermaidPres.length === 0) return;

    const isDark = theme === "dark";

    import("mermaid").then(async (mermaidModule) => {
      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "default",
        themeVariables: isDark
          ? {
              primaryColor: "#fb923c",
              primaryTextColor: "#fafafa",
              primaryBorderColor: "#ea580c",
              lineColor: "#71717a",
              secondaryColor: "#27272a",
              tertiaryColor: "#18181b",
              background: "#09090b",
              mainBkg: "#27272a",
              nodeBorder: "#3f3f46",
              clusterBkg: "#18181b",
              titleColor: "#fafafa",
              edgeLabelBackground: "#18181b",
              pie1: "#fb923c",
              pie2: "#60a5fa",
              pie3: "#4ade80",
              pie4: "#c4b5fd",
              pie5: "#f472b6",
            }
          : {
              primaryColor: "#fed7aa",
              primaryTextColor: "#18181b",
              primaryBorderColor: "#ea580c",
              lineColor: "#a1a1aa",
              secondaryColor: "#f4f4f5",
              tertiaryColor: "#fafafa",
              background: "#ffffff",
              mainBkg: "#fff7ed",
              nodeBorder: "#e4e4e7",
              clusterBkg: "#fafafa",
              titleColor: "#18181b",
              edgeLabelBackground: "#ffffff",
              pie1: "#ea580c",
              pie2: "#2563eb",
              pie3: "#16a34a",
              pie4: "#7c3aed",
              pie5: "#db2777",
            },
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
        sequence: {
          actorFontFamily: "ui-monospace, monospace",
          messageFontFamily: "ui-monospace, monospace",
          noteFontFamily: "ui-monospace, monospace",
        },
        gantt: {
          titleTopMargin: 15,
          barHeight: 24,
          barGap: 4,
          fontSize: 12,
        },
      });

      const ts = Date.now();
      // Process sequentially to avoid mermaid ID conflicts
      for (let idx = 0; idx < mermaidPres.length; idx++) {
        const pre = mermaidPres[idx];
        const codeEl = pre.querySelector("code");
        const code = (codeEl?.textContent || pre.textContent || "").trim();
        if (!code) continue;

        const id = `mermaid-${ts}-${idx}`;

        try {
          const { svg } = await mermaid.render(id, code);
          const encodedCode = btoa(encodeURIComponent(code));

          // Wrap the <pre> in a container and replace with rendered SVG
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-container";
          wrapper.innerHTML = `
            <div class="mermaid-rendered" style="position:relative">
              ${svg}
              <button
                class="mermaid-edit-btn"
                data-mermaid-src="${encodedCode}"
                style="position:absolute;top:8px;right:8px;padding:4px 12px;font-size:11px;font-family:ui-monospace,monospace;background:var(--accent-dim);color:var(--accent);border:none;border-radius:6px;cursor:pointer;opacity:0;transition:opacity 0.2s;z-index:5;"
              >Edit in Mermaid</button>
            </div>`;
          pre.replaceWith(wrapper);
        } catch {
          // Leave as-is on error
        }
      }
    });
  }, [html, isLoading, theme, viewMode]);

  // Load shared content from URL on mount
  useEffect(() => {
    (async () => {
      // Check hash-based sharing first
      const shared = await extractFromUrl();
      if (shared) {
        setMarkdown(shared);
        setIsSharedDoc(true);
        setViewMode("preview");
        await doRender(shared);
        return;
      }

      // Check ?from= parameter (editing a shared doc)
      const params = new URLSearchParams(window.location.search);
      const fromId = params.get("from");
      if (fromId) {
        try {
          const res = await fetch(`/api/docs/${fromId}`);
          if (res.ok) {
            const doc = await res.json();
            setMarkdown(doc.markdown);
            if (doc.title) setTitle(doc.title);
            setDocId(fromId);
            const token = getEditToken(fromId);
            if (token) setIsOwner(true);
            await doRender(doc.markdown);
            if (!isMobile) setViewMode("split");
            return;
          }
        } catch {
          // ignore, fall through to default
        }
      }

      await doRender(markdown);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: Preview click → source sync disabled.
  // Requires comrak sourcepos option (WASM rebuild) for accurate line mapping.
  // Current nth-index matching is unreliable with inline elements (KaTeX, links, etc).

  // Mermaid edit button click handler
  useEffect(() => {
    if (!previewRef.current) return;
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".mermaid-edit-btn") as HTMLElement | null;
      if (!btn) return;
      const encoded = btn.getAttribute("data-mermaid-src");
      if (encoded) {
        try {
          const code = decodeURIComponent(atob(encoded));
          setCanvasMermaid(code);
          setViewMode("mermaid");
        } catch {
          // fallback
        }
      }
    };
    previewRef.current.addEventListener("click", handler);
    const ref = previewRef.current;
    return () => ref.removeEventListener("click", handler);
  }, []);

  // Interactive editing: checkbox toggle + table cell edit
  useEffect(() => {
    if (!previewRef.current || isLoading) return;

    const preview = previewRef.current;

    // Checkbox toggle — match by nth checkbox index
    const handleCheckboxClick = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName !== "INPUT" || target.type !== "checkbox") return;

      const allCheckboxes = preview.querySelectorAll('input[type="checkbox"]');
      const checkboxIndex = Array.from(allCheckboxes).indexOf(target);
      if (checkboxIndex === -1) return;

      // Find the nth task list item in markdown source
      const lines = markdown.split("\n");
      let found = 0;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*- \[([ xX])\]/.test(lines[i])) {
          if (found === checkboxIndex) {
            if (/- \[x\]/i.test(lines[i])) {
              lines[i] = lines[i].replace(/- \[x\]/i, "- [ ]");
            } else {
              lines[i] = lines[i].replace(/- \[ \]/, "- [x]");
            }
            break;
          }
          found++;
        }
      }
      const newMd = lines.join("\n");
      setMarkdown(newMd);
      doRender(newMd);
      e.preventDefault();
    };

    // Table cell double-click to edit (keep original cell size)
    const handleTableDblClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const cell = target.closest("td, th") as HTMLTableCellElement | null;
      if (!cell) return;

      // Lock cell dimensions before editing
      const rect = cell.getBoundingClientRect();
      const currentText = cell.textContent || "";

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentText;
      input.style.cssText = `
        width: ${rect.width - 12}px;
        height: ${rect.height - 8}px;
        max-width: ${rect.width - 12}px;
        background: var(--surface);
        color: var(--text-primary);
        border: 1px solid var(--accent);
        border-radius: 3px;
        padding: 0 4px;
        font-size: inherit;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
        margin: 0;
      `;

      // Lock cell size
      cell.style.width = `${rect.width}px`;
      cell.style.height = `${rect.height}px`;
      cell.style.minWidth = `${rect.width}px`;
      cell.style.maxWidth = `${rect.width}px`;
      cell.style.overflow = "hidden";
      cell.style.padding = "2px 4px";

      const originalContent = cell.innerHTML;
      cell.textContent = "";
      cell.appendChild(input);
      input.focus();
      input.select();

      const commit = () => {
        const newText = input.value;
        // Restore cell
        cell.removeAttribute("style");
        cell.textContent = newText;

        if (newText !== currentText) {
          const lines = markdown.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("|") && lines[i].includes(currentText)) {
              lines[i] = lines[i].replace(currentText, newText);
              break;
            }
          }
          const newMd = lines.join("\n");
          setMarkdown(newMd);
          doRender(newMd);
        }
      };

      const cancel = () => {
        cell.removeAttribute("style");
        cell.innerHTML = originalContent;
      };

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ke) => {
        if (ke.key === "Enter") { ke.preventDefault(); input.blur(); }
        if (ke.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
      });
    };

    preview.addEventListener("click", handleCheckboxClick);
    preview.addEventListener("dblclick", handleTableDblClick);

    return () => {
      preview.removeEventListener("click", handleCheckboxClick);
      preview.removeEventListener("dblclick", handleTableDblClick);
    };
  }, [html, isLoading, markdown, doRender]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showMenu]);

  // Debounced render
  const handleChange = useCallback(
    (value: string) => {
      setMarkdown(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doRender(value), 150);
    },
    [doRender]
  );

  // File drop handler
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".md") || file.name.endsWith(".markdown") || file.name.endsWith(".txt") || file.type === "text/markdown" || file.type === "text/plain")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (text) {
            setMarkdown(text);
            setIsSharedDoc(false);
            doRender(text);
            if (!isMobile) setViewMode("split");
          }
        };
        reader.readAsText(file);
      }
    },
    [doRender, isMobile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Paste handler — detect HTML and convert to MD
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const htmlData = e.clipboardData.getData("text/html");
      const textData = e.clipboardData.getData("text/plain");

      // If clipboard has HTML and it looks like real HTML (not just markdown)
      if (htmlData && isHtmlContent(htmlData)) {
        e.preventDefault();
        const converted = htmlToMarkdown(htmlData);
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          markdown.slice(0, start) + converted + markdown.slice(end);
        setMarkdown(newValue);
        setIsSharedDoc(false);
        doRender(newValue);
        // Set cursor position after inserted text
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd =
            start + converted.length;
        }, 0);
        return;
      }

      // Otherwise let default paste handle it (plain text / markdown)
      // But if it's plain text that looks like HTML, also convert
      if (textData && !htmlData && isHtmlContent(textData)) {
        e.preventDefault();
        const converted = htmlToMarkdown(textData);
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          markdown.slice(0, start) + converted + markdown.slice(end);
        setMarkdown(newValue);
        setIsSharedDoc(false);
        doRender(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd =
            start + converted.length;
        }, 0);
      }
    },
    [markdown, doRender]
  );

  // Share — try short URL first, fallback to hash-based
  const handleShare = useCallback(async () => {
    if (!markdown.trim()) return;
    setShareState("sharing");
    try {
      try {
        // Try server-side short URL
        const { url, editToken } = await createShortUrl(markdown, title);
        const newDocId = url.split("/").pop()!;
        saveEditToken(newDocId, editToken);
        setDocId(newDocId);
        setIsOwner(true);
        await copyToClipboard(url);
        window.history.replaceState(null, "", `/${newDocId}`);
      } catch {
        // Fallback to hash-based sharing
        const url = await createShareUrl(markdown);
        await copyToClipboard(url);
        window.history.replaceState(null, "", url.split(window.location.origin)[1]);
      }
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 3000);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  }, [markdown, title]);

  // Copy HTML
  const handleCopyHtml = useCallback(async () => {
    await copyToClipboard(html);
    setShowMenu(false);
  }, [html]);

  // Copy rich text (for Google Docs, Email etc)
  const handleCopyRichText = useCallback(async () => {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([markdown], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": textBlob,
        }),
      ]);
    } catch {
      await copyToClipboard(html);
    }
    setShowMenu(false);
  }, [html, markdown]);

  // Copy for Slack (simplified markdown)
  const handleCopySlack = useCallback(async () => {
    // Slack uses its own mrkdwn: *bold*, _italic_, `code`, ```code block```
    // Convert standard MD to Slack-compatible format
    const slackText = markdown
      .replace(/\*\*(.*?)\*\*/g, "*$1*")       // **bold** → *bold*
      .replace(/^### (.*$)/gm, "*$1*")          // ### heading → *heading*
      .replace(/^## (.*$)/gm, "*$1*")           // ## heading → *heading*
      .replace(/^# (.*$)/gm, "*$1*")            // # heading → *heading*
      .replace(/^\- /gm, "• ");                  // - list → • list
    await copyToClipboard(slackText);
    setShowMenu(false);
  }, [markdown]);

  // Download .md file
  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }, [markdown, title]);

  // Update existing document
  const handleUpdate = useCallback(async () => {
    if (!docId || !markdown.trim()) return;
    const token = getEditToken(docId);
    if (!token) return;
    setShareState("sharing");
    try {
      await updateDocument(docId, token, markdown, title);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 3000);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  }, [docId, markdown, title]);

  // Delete document
  const handleDelete = useCallback(async () => {
    if (!docId) return;
    const token = getEditToken(docId);
    if (!token) return;
    if (!window.confirm("Delete this shared document?")) return;
    try {
      await deleteDocument(docId, token);
      setDocId(null);
      setIsOwner(false);
      window.history.replaceState(null, "", "/");
    } catch {
      // ignore
    }
    setShowMenu(false);
  }, [docId]);

  // Clear
  const handleClear = useCallback(() => {
    setMarkdown("");
    setIsSharedDoc(false);
    setDocId(null);
    setIsOwner(false);
    window.history.replaceState(null, "", "/");
    doRender("");
    setShowMenu(false);
  }, [doRender]);

  // Format AI conversation
  const handleFormatAiConversation = useCallback(() => {
    const messages = parseConversation(markdown);
    if (messages) {
      const formatted = formatConversation(messages);
      setMarkdown(formatted);
      doRender(formatted);
    }
    setShowAiBanner(false);
  }, [markdown, doRender]);

  // Export PDF
  const handleExportPdf = useCallback(() => {
    setShowMenu(false);
    // Switch to preview mode temporarily for print
    const prevMode = viewMode;
    setViewMode("preview");
    setTimeout(() => {
      window.print();
      setViewMode(prevMode);
    }, 300);
  }, [viewMode]);

  // Edit shared doc
  const handleEditShared = useCallback(() => {
    setIsSharedDoc(false);
    setViewMode(isMobile ? "editor" : "split");
  }, [isMobile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        handleShare();
      }
      if (mod && e.shiftKey && e.key === "c") {
        e.preventDefault();
        handleCopyHtml();
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        setViewMode((prev) =>
          prev === "split" ? "preview" : prev === "preview" ? "editor" : "split"
        );
      }
      if (e.key === "Escape" && textareaRef.current) {
        textareaRef.current.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleShare, handleCopyHtml]);

  const shareButtonLabel = {
    idle: "Share",
    sharing: "...",
    copied: "Copied!",
    error: "Failed",
  }[shareState];

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed rounded-lg m-2"
          style={{ background: "var(--drag-bg)", borderColor: "var(--accent)" }}
        >
          <div className="text-center">
            <div className="text-4xl mb-3 opacity-60">📄</div>
            <p className="text-lg font-medium" style={{ color: "var(--accent)" }}>Drop your .md file</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Supports .md, .markdown, .txt</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 backdrop-blur-sm"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--header-bg)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1
            className="text-base sm:text-lg font-bold tracking-tight cursor-pointer shrink-0"
            onClick={handleClear}
            title="mdfy.cc — New document"
          >
            <span style={{ color: "var(--accent)" }}>md</span>
            <span style={{ color: "var(--text-primary)" }}>fy</span>
            <span style={{ color: "var(--text-muted)" }}>.cc</span>
          </h1>
          {title && (
            <span
              className="text-xs sm:text-sm pl-2 sm:pl-3 hidden sm:inline truncate max-w-[200px]"
              style={{ color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}
            >
              {title}
            </span>
          )}
          {isSharedDoc && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              SHARED
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          {/* Flavor badges — desktop only */}
          <div className="items-center gap-1.5 hidden lg:flex">
            <span
              className="px-2 py-0.5 rounded-md font-mono font-medium"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              {flavor}
            </span>
            {Object.entries(flavorDetails)
              .filter(([, v]) => v)
              .map(([key]) => (
                <span
                  key={key}
                  className="px-1.5 py-0.5 rounded-md font-mono"
                  style={{ background: "var(--badge-muted-bg)", color: "var(--badge-muted-color)" }}
                >
                  +{key}
                </span>
              ))}
          </div>

          {/* Stats — desktop only */}
          <div className="items-center gap-2 font-mono hidden md:flex" style={{ color: "var(--text-muted)" }}>
            <span>{charCount.toLocaleString()} chars</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>{renderTime.toFixed(1)}ms</span>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-md p-0.5" style={{ background: "var(--toggle-bg)" }}>
            {(isMobile
              ? (["editor", "split", "preview", "mermaid"] as ViewMode[])
              : (["editor", "split", "preview", "mermaid"] as ViewMode[])
            ).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
                style={{
                  background: viewMode === mode ? "var(--toggle-active)" : "transparent",
                  color: viewMode === mode ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {mode === "editor" ? "MD" : mode === "split" ? "Split" : mode === "mermaid" ? "Mermaid" : "View"}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="px-2 py-1 rounded-md transition-colors text-[11px]"
            style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isOwner && docId ? (
              <button
                onClick={handleUpdate}
                disabled={shareState === "sharing"}
                className="px-2 sm:px-2.5 py-1 rounded-md font-mono transition-colors text-[11px] sm:text-xs"
                style={{
                  background: shareState === "copied" ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.15)",
                  color: shareState === "copied" ? "#4ade80" : "#60a5fa",
                }}
                title="Update shared document"
              >
                {shareState === "copied" ? "Updated!" : shareState === "sharing" ? "..." : "Update"}
              </button>
            ) : null}
            <button
              onClick={handleShare}
              disabled={shareState === "sharing"}
              className="px-2 sm:px-2.5 py-1 rounded-md font-mono transition-colors text-[11px] sm:text-xs"
              style={{
                background: shareState === "copied" ? "rgba(34, 197, 94, 0.2)" : "var(--accent-dim)",
                color: shareState === "copied" ? "#4ade80" : "var(--accent)",
              }}
              title="Share (⌘S)"
            >
              {shareButtonLabel}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-2 py-1 rounded-md transition-colors font-mono"
                style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              >
                ···
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl z-50"
                  style={{ background: "var(--menu-bg)", border: "1px solid var(--border)" }}
                >
                  <div className="py-1">
                    <button
                      onClick={handleCopyHtml}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Copy HTML
                      <span className="float-right hidden sm:inline" style={{ color: "var(--text-muted)" }}>⌘⇧C</span>
                    </button>
                    <button
                      onClick={handleCopyRichText}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Copy for Docs / Email
                    </button>
                    <button
                      onClick={handleCopySlack}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Copy for Slack
                    </button>
                    <button
                      onClick={handleDownloadMd}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Download .md
                    </button>
                    <button
                      onClick={handleExportPdf}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Export PDF
                    </button>
                    {docId && (
                      <>
                        <button
                          onClick={() => { setShowQr(true); setShowMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          QR Code
                        </button>
                        <button
                          onClick={() => {
                            const code = `<iframe src="https://mdfy.cc/embed/${docId}" width="100%" height="500" frameborder="0" style="border:1px solid #27272a;border-radius:8px;"></iframe>`;
                            copyToClipboard(code);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Copy Embed Code
                        </button>
                      </>
                    )}
                    <hr style={{ borderColor: "var(--border)" }} className="my-1" />
                    <button
                      onClick={handleClear}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      New document
                    </button>
                    {isOwner && docId && (
                      <>
                        <hr style={{ borderColor: "var(--border)" }} className="my-1" />
                        <button
                          onClick={handleDelete}
                          className="w-full text-left px-3 py-2 text-xs transition-colors"
                          style={{ color: "#ef4444" }}
                        >
                          Delete shared doc
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Engine badge — xl only */}
          <span
            className="px-2 py-0.5 rounded-md font-mono text-[10px] tracking-wide hidden xl:inline"
            style={{ background: "var(--accent-dim)", color: "var(--accent)", opacity: 0.7 }}
          >
            RUST→WASM
          </span>
        </div>
      </header>

      {/* AI conversation banner */}
      {showAiBanner && (
        <div
          className="flex items-center justify-between px-3 sm:px-5 py-2 text-xs"
          style={{ background: "var(--accent-dim)", borderBottom: "1px solid var(--border-dim)" }}
        >
          <span style={{ color: "var(--accent)" }}>
            AI conversation detected. Format as a clean document?
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleFormatAiConversation}
              className="px-2.5 py-1 rounded font-mono text-[11px]"
              style={{ background: "var(--accent)", color: "#000", fontWeight: 600 }}
            >
              Format
            </button>
            <button
              onClick={() => setShowAiBanner(false)}
              className="px-2 py-1 rounded font-mono text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`flex flex-1 min-h-0 ${isMobile && viewMode === "split" ? "flex-col" : ""}`}>
        {/* Canvas mode */}
        {viewMode === "mermaid" && (
          <div className="w-full flex flex-col flex-1">
            <MdCanvas
              initialMermaid={canvasMermaid}
              onGenerate={(md) => {
                let newMarkdown: string;
                if (canvasMermaid) {
                  // Replace the original mermaid code block
                  const originalBlock = "```mermaid\n" + canvasMermaid + "\n```";
                  if (markdown.includes(originalBlock)) {
                    newMarkdown = markdown.replace(originalBlock, md);
                  } else {
                    // Try to find by content similarity
                    const mermaidBlockRegex = /```mermaid\n[\s\S]*?```/g;
                    const blocks = [...markdown.matchAll(mermaidBlockRegex)];
                    const match = blocks.find(b => {
                      // Check if the block contains the first line of the original
                      const firstLine = canvasMermaid.split("\n")[1]?.trim();
                      return firstLine && b[0].includes(firstLine);
                    });
                    if (match && match.index !== undefined) {
                      newMarkdown = markdown.slice(0, match.index) + md + markdown.slice(match.index + match[0].length);
                    } else {
                      newMarkdown = markdown + "\n\n" + md;
                    }
                  }
                } else {
                  newMarkdown = markdown ? markdown + "\n\n" + md : md;
                }
                setMarkdown(newMarkdown);
                doRender(newMarkdown);
                setCanvasMermaid(undefined);
                setViewMode(isMobile ? "preview" : "split");
              }}
            />
          </div>
        )}

        {/* Editor pane */}
        {viewMode !== "preview" && viewMode !== "mermaid" && (
          <div
            className={`${
              viewMode === "split"
                ? isMobile ? "w-full h-1/2" : "w-1/2"
                : "w-full"
            } flex flex-col`}
            style={{
              borderRight: viewMode === "split" && !isMobile ? "1px solid var(--border-dim)" : "none",
              borderBottom: viewMode === "split" && isMobile ? "1px solid var(--border-dim)" : "none",
            }}
          >
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Markdown</span>
              <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>
                {viewMode === "split" ? "⌘\\ to toggle" : "input"}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              className="flex-1 p-3 sm:p-5 bg-transparent font-mono text-[13px] resize-none outline-none"
              style={{
                color: "var(--editor-text)",
                caretColor: "var(--accent)",
                lineHeight: "1.65",
              }}
              value={markdown}
              onChange={(e) => handleChange(e.target.value)}
              onPaste={handlePaste}
              spellCheck={false}
              placeholder="Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything..."
            />
          </div>
        )}

        {/* Preview pane */}
        {viewMode !== "editor" && viewMode !== "mermaid" && (
          <div
            className={`${
              viewMode === "split"
                ? isMobile ? "w-full h-1/2" : "w-1/2"
                : "w-full"
            } flex flex-col`}
            style={{ background: "var(--background)" }}
          >
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Preview</span>
              <div className="flex items-center gap-2">
                {isSharedDoc && (
                  <button
                    onClick={handleEditShared}
                    className="transition-colors normal-case"
                    style={{ color: "var(--accent)", opacity: 0.7 }}
                  >
                    Edit →
                  </button>
                )}
                <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>rendered</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto" ref={previewRef}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div
                    className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--accent-dim)", borderTopColor: "var(--accent)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Loading WASM engine...
                  </span>
                </div>
              ) : html ? (
                <article
                  className={`mdcore-rendered max-w-none ${
                    viewMode === "preview"
                      ? "p-4 sm:p-8 mx-auto max-w-3xl"
                      : "p-3 sm:p-6"
                  }`}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-4" style={{ color: "var(--text-muted)" }}>
                  <div className="text-4xl sm:text-5xl opacity-30">📝</div>
                  <p className="text-sm text-center">
                    {isMobile ? "Tap MD to start writing" : "Type or paste Markdown on the left"}
                  </p>
                  <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                    Supports GFM · Obsidian · MDX · Pandoc · KaTeX · Mermaid
                  </p>
                  {!isMobile && (
                    <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
                      or drag & drop a .md file anywhere
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-between px-3 sm:px-5 py-1.5 text-[10px] font-mono"
        style={{ borderTop: "1px solid var(--border-dim)", color: "var(--text-muted)" }}
      >
        <span className="truncate">mdcore v0.1.0 · Rust → WASM</span>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>
            ⌘S share · ⌘⇧C copy HTML · ⌘\ toggle view
          </span>
          <a
            href="/about"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            About
          </a>
          <a
            href="https://github.com/raymindai/mdcore"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://mdcore.ai"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            mdcore.ai
          </a>
        </div>
      </footer>

      {/* QR Code Modal */}
      {showQr && docId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowQr(false)}
        >
          <div
            className="rounded-xl p-6 flex flex-col items-center gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
              mdfy.cc/{docId}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://mdfy.cc/${docId}`)}&bgcolor=18181b&color=fafafa&format=svg`}
              alt="QR Code"
              width={200}
              height={200}
              className="rounded-lg"
            />
            <button
              onClick={() => setShowQr(false)}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
