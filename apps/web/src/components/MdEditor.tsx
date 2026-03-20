"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import { createShareUrl, extractFromUrl, copyToClipboard } from "@/lib/share";

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

### Footnotes & More

This has a footnote[^1]. And another[^2].

[^1]: mdcore supports GFM-style footnotes out of the box.
[^2]: Built with comrak — the same Rust parser that powers GitLab.

---

*Rendered by **mdcore engine v0.1.0** — Rust → WASM, running entirely in your browser. No server round-trip.*
`;

type ViewMode = "split" | "preview" | "editor";

export default function MdEditor() {
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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    } catch (e) {
      console.error("Render error:", e);
    }
  }, []);

  // Mermaid rendering after DOM update
  useEffect(() => {
    if (!previewRef.current || isLoading) return;

    const mermaidContainers =
      previewRef.current.querySelectorAll(".mermaid-container");
    if (mermaidContainers.length === 0) return;

    import("mermaid").then((mermaidModule) => {
      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
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
        },
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
      });

      mermaidContainers.forEach(async (container) => {
        const pre = container.querySelector("pre.mermaid");
        if (!pre) return;
        const code = pre.textContent || "";
        const id = container.getAttribute("data-mermaid-id") || "mermaid-0";

        try {
          const { svg } = await mermaid.render(id, code);
          container.innerHTML = `<div class="mermaid-rendered">${svg}</div>`;
        } catch {
          // Leave as-is
        }
      });
    });
  }, [html, isLoading]);

  // Load shared content from URL on mount
  useEffect(() => {
    (async () => {
      const shared = await extractFromUrl();
      if (shared) {
        setMarkdown(shared);
        setIsSharedDoc(true);
        setViewMode("preview");
        await doRender(shared);
      } else {
        await doRender(markdown);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced render
  const handleChange = useCallback(
    (value: string) => {
      setMarkdown(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doRender(value), 150);
    },
    [doRender]
  );

  // Share
  const handleShare = useCallback(async () => {
    if (!markdown.trim()) return;
    setShareState("sharing");
    try {
      const url = await createShareUrl(markdown);
      await copyToClipboard(url);
      // Update browser URL without reload
      window.history.replaceState(null, "", url.split(window.location.origin)[1]);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 3000);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  }, [markdown]);

  // Copy HTML
  const handleCopyHtml = useCallback(async () => {
    await copyToClipboard(html);
  }, [html]);

  // Download .md file
  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, title]);

  // Clear
  const handleClear = useCallback(() => {
    setMarkdown("");
    setIsSharedDoc(false);
    window.history.replaceState(null, "", "/");
    doRender("");
  }, [doRender]);

  // Edit shared doc
  const handleEditShared = useCallback(() => {
    setIsSharedDoc(false);
    setViewMode("split");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+S → Share
      if (mod && e.key === "s") {
        e.preventDefault();
        handleShare();
      }
      // Cmd+Shift+C → Copy HTML
      if (mod && e.shiftKey && e.key === "c") {
        e.preventDefault();
        handleCopyHtml();
      }
      // Cmd+\ → Toggle view mode
      if (mod && e.key === "\\") {
        e.preventDefault();
        setViewMode((prev) =>
          prev === "split" ? "preview" : prev === "preview" ? "editor" : "split"
        );
      }
      // Escape → Focus textarea
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
    copied: "Link copied!",
    error: "Failed",
  }[shareState];

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1
            className="text-lg font-bold tracking-tight cursor-pointer"
            onClick={handleClear}
            title="mdfy.cc — New document"
          >
            <span className="text-orange-400">md</span>
            <span className="text-zinc-200">fy</span>
            <span className="text-zinc-600">.cc</span>
          </h1>
          {title && (
            <span className="text-sm text-zinc-500 border-l border-zinc-800 pl-3 hidden sm:inline truncate max-w-[200px]">
              {title}
            </span>
          )}
          {isSharedDoc && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400 font-mono">
              SHARED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Flavor badges */}
          <div className="flex items-center gap-1.5 hidden lg:flex">
            <span className="px-2 py-0.5 rounded-md bg-orange-400/15 text-orange-400 font-mono font-medium">
              {flavor}
            </span>
            {Object.entries(flavorDetails)
              .filter(([, v]) => v)
              .map(([key]) => (
                <span
                  key={key}
                  className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500 font-mono"
                >
                  +{key}
                </span>
              ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-zinc-600 font-mono hidden md:flex">
            <span>{charCount.toLocaleString()} chars</span>
            <span className="text-zinc-800">·</span>
            <span>{renderTime.toFixed(1)}ms</span>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-md bg-zinc-800/50 p-0.5">
            {(["editor", "split", "preview"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  viewMode === mode
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {mode === "editor" ? "MD" : mode === "split" ? "Split" : "View"}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              disabled={shareState === "sharing"}
              className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                shareState === "copied"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-orange-400/15 hover:bg-orange-400/25 text-orange-400"
              }`}
              title="Share (⌘S)"
            >
              {shareButtonLabel}
            </button>
            <div className="relative group">
              <button className="px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors font-mono">
                ···
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  <button
                    onClick={handleCopyHtml}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                  >
                    Copy HTML
                    <span className="float-right text-zinc-600">⌘⇧C</span>
                  </button>
                  <button
                    onClick={handleDownloadMd}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                  >
                    Download .md
                  </button>
                  <hr className="border-zinc-800 my-1" />
                  <button
                    onClick={handleClear}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    New document
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Engine badge */}
          <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500/70 font-mono text-[10px] tracking-wide hidden xl:inline">
            RUST→WASM
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Editor pane */}
        {viewMode !== "preview" && (
          <div
            className={`${
              viewMode === "split" ? "w-1/2" : "w-full"
            } border-r border-zinc-800/60 flex flex-col`}
          >
            <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-zinc-600 border-b border-zinc-800/40 font-mono uppercase tracking-wider">
              <span>Markdown</span>
              <span className="text-zinc-700">
                {viewMode === "split" ? "⌘\\ to toggle" : "input"}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              className="flex-1 p-5 bg-transparent text-zinc-300 font-mono text-[13px] resize-none outline-none leading-relaxed placeholder:text-zinc-700"
              value={markdown}
              onChange={(e) => handleChange(e.target.value)}
              spellCheck={false}
              placeholder="Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything..."
            />
          </div>
        )}

        {/* Preview pane */}
        {viewMode !== "editor" && (
          <div
            className={`${
              viewMode === "split" ? "w-1/2" : "w-full"
            } flex flex-col bg-zinc-950`}
          >
            <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-zinc-600 border-b border-zinc-800/40 font-mono uppercase tracking-wider">
              <span>Preview</span>
              <div className="flex items-center gap-2">
                {isSharedDoc && (
                  <button
                    onClick={handleEditShared}
                    className="text-orange-400/70 hover:text-orange-400 transition-colors normal-case"
                  >
                    Edit →
                  </button>
                )}
                <span className="text-zinc-700">rendered</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto" ref={previewRef}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-6 h-6 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                  <span className="text-zinc-600 text-sm">
                    Loading WASM engine...
                  </span>
                </div>
              ) : html ? (
                <article
                  className={`mdcore-rendered max-w-none ${
                    viewMode === "preview"
                      ? "p-8 mx-auto max-w-3xl"
                      : "p-6"
                  }`}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-700">
                  <div className="text-5xl opacity-30">⬅</div>
                  <p className="text-sm">
                    Type or paste Markdown on the left
                  </p>
                  <p className="text-xs text-zinc-800">
                    Supports GFM · Obsidian · MDX · Pandoc · KaTeX · Mermaid
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-5 py-1.5 border-t border-zinc-800/50 text-[10px] text-zinc-700 font-mono">
        <span>mdcore engine v0.1.0 · Rust → WASM · comrak + syntect</span>
        <div className="flex items-center gap-4">
          <span className="text-zinc-800 hidden sm:inline">
            ⌘S share · ⌘⇧C copy HTML · ⌘\ toggle view
          </span>
          <a
            href="https://github.com/mdcore-dev/mdcore"
            className="hover:text-zinc-500 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://mdcore.ai"
            className="hover:text-zinc-500 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            mdcore.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
