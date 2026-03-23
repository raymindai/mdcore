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

// ─── Sample documents for default tabs ───

const SAMPLE_WELCOME = `# Welcome to mdfy.cc

> **The universal Markdown engine for the AI era.**
> Paste any Markdown — from any AI, any tool, any flavor. Rendered instantly via Rust + WASM.

## Quick Start

1. **Paste** any Markdown in the editor
2. **Preview** renders instantly (split view)
3. **Share** with a short URL — \`mdfy.cc/{id}\`

## Interactive Features

- **Double-click** any text in preview to edit inline
- **Click** preview elements to jump to source
- **Right-click** table cells for row/column options
- **Double-click** diagrams to open the visual editor
- **Drag & drop** .md files (multiple files → new tabs)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘S | Share (copy URL) |
| ⌘Z | Undo |
| ⌘⇧Z | Redo |
| ⌘⇧C | Copy HTML |
| ⌘\\\\ | Toggle view mode |

---

*Powered by **mdcore engine v0.1.0** — Rust → WASM*
`;

const SAMPLE_FORMATTING = `# Markdown Syntax Guide

## Text Formatting

Regular text, **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and \`inline code\`.

> Blockquotes can contain **formatting** and even
> multiple paragraphs.
>
> > Nested blockquotes work too.

## Headings

> # H1 — Document Title
> ## H2 — Section
> ### H3 — Subsection
> #### H4 — Sub-subsection
> ##### H5 — Minor heading
> ###### H6 — Smallest heading

## Lists

### Unordered
- First item
- Second item
  - Nested item
  - Another nested
    - Even deeper

### Ordered
1. Step one
2. Step two
   1. Sub-step A
   2. Sub-step B

### Task List
- [x] Completed task
- [x] Another done
- [ ] Still to do

## Tables

| Left | Center | Right |
|:-----|:------:|------:|
| L1 | C1 | R1 |
| L2 | C2 | R2 |
| L3 | C3 | R3 |

## Code

\`\`\`typescript
const { html, flavor } = await renderMarkdown(input);
console.log(\`Detected: \${flavor.primary}\`);
\`\`\`

\`\`\`python
response = requests.get("https://api.mdcore.ai/v1/render", json={
    "markdown": "# Hello",
    "theme": "minimal-light"
})
\`\`\`

## Math (KaTeX)

Inline: $E = mc^2$ and $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$

$$
\\int_0^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

$$
\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}
$$

## Footnotes

Created by John Gruber[^1]. Most popular flavor: GFM[^2].

[^1]: See [Daring Fireball](https://daringfireball.net/projects/markdown/).
[^2]: [github.github.com/gfm](https://github.github.com/gfm/).

## Description Lists

Markdown
: A lightweight markup language for creating formatted text.

WASM
: WebAssembly — a binary instruction format for a stack-based virtual machine.
`;

const SAMPLE_DIAGRAMS = `# Mermaid Diagrams — All 19 Types

> **Tip:** Double-click any diagram to open the visual editor.

## Flowchart

\`\`\`mermaid
graph LR
    A[Markdown] --> B[mdcore Engine]
    B --> C[WASM]
    B --> D[Native Binary]
    C --> E[Browser]
    D --> F[CLI]
    style B fill:#fb923c,stroke:#ea580c,color:#000
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    User->>App: Request
    App->>API: Fetch data
    API-->>App: Response
    App-->>User: Render
\`\`\`

## Pie Chart

\`\`\`mermaid
pie title Tech Stack
    "Rust" : 40
    "TypeScript" : 35
    "CSS" : 15
    "Other" : 10
\`\`\`

## Gantt Chart

\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Design :2026-01-01, 10d
    Develop :2026-01-11, 20d
    section Phase 2
    Test :2026-02-01, 7d
    Launch :2026-02-08, 3d
\`\`\`

## Class Diagram

\`\`\`mermaid
classDiagram
    class Engine {
        +render(md) HTML
        +detectFlavor() Flavor
    }
    class Renderer {
        +highlight() void
        +katex() void
    }
    Engine <|-- Renderer
\`\`\`

## State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : fetch
    Loading --> Rendered : success
    Loading --> Error : fail
    Error --> Idle : retry
    Rendered --> [*]
\`\`\`

## ER Diagram

\`\`\`mermaid
erDiagram
    User {
        int id
        string name
    }
    Document {
        int id
        string markdown
    }
    User ||--o{ Document : creates
\`\`\`

## Mindmap

\`\`\`mermaid
mindmap
  root((mdcore))
    Product
      mdfy.cc
      Chrome Extension
    Engine
      Rust
      WASM
    Features
      GFM
      KaTeX
      Mermaid
\`\`\`

## Timeline

\`\`\`mermaid
timeline
    title mdcore Milestones
    2026 Q1 : Engine v0.1
             : mdfy.cc launch
    2026 Q2 : npm package
             : CLI tool
    2026 Q3 : API platform
\`\`\`

## User Journey

\`\`\`mermaid
journey
    title First-time User
    section Discover
      Visit site: 5: User
      See demo: 4: User
    section Use
      Paste MD: 5: User
      Share URL: 4: User
\`\`\`

## Quadrant Chart

\`\`\`mermaid
quadrantChart
    title Feature Priority
    x-axis "Low Effort" --> "High Effort"
    y-axis "Low Impact" --> "High Impact"
    Share URL: [0.2, 0.9]
    PDF Export: [0.4, 0.6]
    Canvas Mode: [0.8, 0.7]
    Themes: [0.3, 0.4]
\`\`\`

## Git Graph

\`\`\`mermaid
gitGraph
    commit id: "init"
    branch feature
    commit id: "add engine"
    commit id: "add wasm"
    checkout main
    commit id: "hotfix"
    merge feature
    commit id: "v0.1"
\`\`\`

## Kanban

\`\`\`mermaid
kanban
  Backlog
    Research
    Design
  In Progress
    Development
  Done
    Testing
\`\`\`

## XY Chart

\`\`\`mermaid
xychart-beta
    title "Monthly Users"
    x-axis ["Jan", "Feb", "Mar", "Apr", "May"]
    bar [120, 200, 350, 280, 450]
    line [100, 180, 300, 250, 400]
\`\`\`

## Sankey

\`\`\`mermaid
sankey-beta

Traffic,Website,40
Traffic,App,30
Website,Signup,25
Website,Bounce,15
App,Signup,20
App,Bounce,10
\`\`\`

## Requirement Diagram

\`\`\`mermaid
requirementDiagram

    requirement Auth {
        id: REQ-1
        text: Users must authenticate
        risk: high
    }

    requirement Logging {
        id: REQ-2
        text: All actions must be logged
        risk: medium
    }
\`\`\`

## Block Diagram

\`\`\`mermaid
block-beta
    columns 3
    input["Input"] process["Process"] output["Output"]
    input --> process --> output
\`\`\`

## Packet Diagram

\`\`\`mermaid
packet-beta
    0-15 : "Source Port"
    16-31 : "Destination Port"
    32-63 : "Sequence Number"
    64-95 : "Acknowledgment"
\`\`\`

## Architecture

\`\`\`mermaid
architecture-beta
    service client(Client)
    service api(API Server)
    service db(Database)
    service cache(Redis Cache)
    client --> api
    api --> db
    api --> cache
\`\`\`

---

*All 19 Mermaid diagram types with visual editors. Double-click to edit.*
`;


const INITIAL_TABS: Tab[] = [
  { id: "tab-welcome", title: "Welcome", markdown: SAMPLE_WELCOME },
  { id: "tab-syntax", title: "Syntax Guide", markdown: SAMPLE_FORMATTING },
  { id: "tab-diagrams", title: "Diagrams", markdown: SAMPLE_DIAGRAMS },
];

type ViewMode = "split" | "preview" | "editor";

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

interface Tab {
  id: string;
  title: string;
  markdown: string;
}

let tabIdCounter = 1;

export default function MdEditor() {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  // Tab system
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("tab-welcome");
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [markdown, setMarkdownRaw] = useState(SAMPLE_WELCOME);
  const undoStack = useRef<string[]>([SAMPLE_WELCOME]);
  const redoStack = useRef<string[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Wrapper that tracks undo history
  const setMarkdown = useCallback((val: string) => {
    setMarkdownRaw(val);
    // Debounce undo snapshots (don't save every keystroke)
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      const last = undoStack.current[undoStack.current.length - 1];
      if (val !== last) {
        undoStack.current.push(val);
        if (undoStack.current.length > 100) undoStack.current.shift(); // cap at 100
        redoStack.current = []; // clear redo on new change
      }
    }, 500);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    const prev = undoStack.current[undoStack.current.length - 1];
    setMarkdownRaw(prev);
    doRender(prev);
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    setMarkdownRaw(next);
    doRender(next);
  }, []);

  // Tab functions use doRenderRef to avoid circular dependency
  const doRenderRef = useRef<(md: string) => void>(() => {});

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
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const isDraggingSidebar = useRef(false);
  const [docContextMenu, setDocContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const splitPercentRef = useRef(50);
  const isDraggingSplit = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
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

  // Keep doRenderRef in sync
  doRenderRef.current = doRender;

  // ─── Tab management ───
  const switchTab = useCallback((tabId: string) => {
    // Save current tab
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, markdown, title: title || "Untitled" } : t));
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);
    setMarkdownRaw(tab.markdown);
    undoStack.current = [tab.markdown];
    redoStack.current = [];
    doRenderRef.current(tab.markdown);
  }, [tabs, activeTabId, markdown, title]);

  const addTab = useCallback(() => {
    // Save current tab
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, markdown, title: title || "Untitled" } : t));
    const id = `tab-${tabIdCounter++}`;
    const newTab: Tab = { id, title: "Untitled", markdown: "" };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    setMarkdownRaw("");
    undoStack.current = [""];
    redoStack.current = [];
    doRenderRef.current("");
  }, [activeTabId, markdown, title]);

  const closeTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (tabId === activeTabId) {
      const next = newTabs[Math.min(idx, newTabs.length - 1)];
      setActiveTabId(next.id);
      setMarkdownRaw(next.markdown);
      undoStack.current = [next.markdown];
      redoStack.current = [];
      doRenderRef.current(next.markdown);
    }
  }, [tabs, activeTabId]);

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
      // Use Mermaid native themes with minimal customization
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "default",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 14,
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
          // Copy sourcepos for click-to-source
          const sourcepos = pre.getAttribute("data-sourcepos");
          if (sourcepos) wrapper.setAttribute("data-sourcepos", sourcepos);
          wrapper.innerHTML = `
            <div class="mermaid-rendered" style="position:relative">
              ${svg}
              <button
                class="mermaid-edit-btn"
                data-mermaid-src="${encodedCode}"
                style="position:absolute;top:8px;right:8px;padding:4px 12px;font-size:11px;font-family:ui-monospace,monospace;background:var(--accent-dim);color:var(--accent);border:none;border-radius:6px;cursor:pointer;opacity:0;transition:opacity 0.2s;z-index:5;"
              >Edit in Mermaid</button>
            </div>`;
          // Double-click mermaid diagram → open in Mermaid editor
          wrapper.addEventListener("dblclick", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            setCanvasMermaid(code);
            setShowMermaidModal(true);
          });
          wrapper.style.cursor = "pointer";

          pre.replaceWith(wrapper);
        } catch {
          // Leave as-is on error
        }
      }
    });
  }, [html, isLoading, theme, viewMode]);

  // ASCII diagram → AI-powered Mermaid conversion
  useEffect(() => {
    if (!previewRef.current || isLoading) return;

    const asciiDiagrams = previewRef.current.querySelectorAll(".ascii-diagram");
    if (asciiDiagrams.length === 0) return;

    asciiDiagrams.forEach(async (el) => {
      if (el.getAttribute("data-converted")) return;
      el.setAttribute("data-converted", "true");

      const codeEl = el.querySelector("code");
      const asciiText = codeEl?.textContent || el.textContent || "";
      if (!asciiText.trim()) return;

      // Show loading state
      const originalHtml = el.innerHTML;
      const loadingDiv = document.createElement("div");
      loadingDiv.style.cssText = "padding:1rem;text-align:center;font-size:11px;color:var(--text-faint);font-family:ui-monospace,monospace";
      loadingDiv.textContent = "Converting diagram...";
      el.prepend(loadingDiv);

      try {
        const res = await fetch("/api/ascii-to-mermaid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ascii: asciiText }),
        });

        if (!res.ok) {
          loadingDiv.remove();
          return; // Keep original ASCII display
        }

        const { mermaid: mermaidCode } = await res.json();
        if (!mermaidCode) {
          loadingDiv.remove();
          return;
        }

        // Render with mermaid.js
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: theme === "dark" ? "dark" : "default",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 14,
        });

        const id = `ascii-converted-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);

        (el as HTMLElement).innerHTML = `
          <div class="mermaid-rendered" style="text-align:center;padding:1rem">${svg}</div>
          <details style="margin:0;border-top:1px solid var(--border-dim)">
            <summary style="padding:6px 12px;font-size:10px;font-family:ui-monospace,monospace;color:var(--text-faint);cursor:pointer;user-select:none">Show original</summary>
            ${originalHtml}
          </details>`;
      } catch {
        loadingDiv.remove();
        // Keep original ASCII display on any error
      }
    });
  }, [html, isLoading, theme]);

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

  // Preview: click to scroll to source + double-click to inline edit
  // Uses comrak's data-sourcepos="startLine:startCol-endLine:endCol" for accurate mapping
  useEffect(() => {
    if (!previewRef.current || viewMode !== "split") return;
    const preview = previewRef.current;

    // Parse sourcepos attribute → { startLine, endLine }
    const getSourcePos = (el: HTMLElement): { startLine: number; endLine: number } | null => {
      const sp = el.getAttribute("data-sourcepos") || el.closest("[data-sourcepos]")?.getAttribute("data-sourcepos");
      if (!sp) return null;
      const match = sp.match(/^(\d+):\d+-(\d+):\d+$/);
      if (!match) return null;
      return { startLine: parseInt(match[1]) - 1, endLine: parseInt(match[2]) - 1 }; // 0-indexed
    };

    // Account for frontmatter offset
    const lines = markdown.split("\n");
    let frontmatterOffset = 0;
    if (lines[0]?.trim() === "---") {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === "---") {
          frontmatterOffset = i + 1;
          // Skip blank lines after frontmatter
          while (frontmatterOffset < lines.length && !lines[frontmatterOffset]?.trim()) {
            frontmatterOffset++;
          }
          break;
        }
      }
    }

    // Click → scroll to source + highlight the block
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button,a,input")) return;

      const sourceEl = target.closest("[data-sourcepos]") as HTMLElement | null;
      if (!sourceEl) return;

      const pos = getSourcePos(sourceEl);
      if (!pos) return;

      const actualStart = pos.startLine + frontmatterOffset;
      const actualEnd = pos.endLine + frontmatterOffset;

      if (textareaRef.current) {
        const ta = textareaRef.current;
        const lineHeight = ta.scrollHeight / (lines.length || 1);
        ta.scrollTo({ top: Math.max(0, actualStart * lineHeight - ta.clientHeight / 3), behavior: "smooth" });

        // Select the entire block to highlight it
        let startChar = 0;
        for (let i = 0; i < actualStart && i < lines.length; i++) {
          startChar += lines[i].length + 1;
        }
        let endChar = startChar;
        for (let i = actualStart; i <= actualEnd && i < lines.length; i++) {
          endChar += lines[i].length + 1;
        }
        ta.focus();
        ta.setSelectionRange(startChar, endChar);
      }
    };

    // Double-click → inline edit text
    const handleDblClick = (e: Event) => {
      const target = e.target as HTMLElement;
      // Skip table cells — handled by handleTableDblClick
      if (target.closest("td,th,table")) return;
      // Skip mermaid, katex
      if (target.closest(".mermaid-container,.katex")) return;

      // Code block → mini editor modal
      const preEl = target.closest("pre") as HTMLElement | null;
      if (preEl) {
        const codeEl = preEl.querySelector("code");
        if (!codeEl) return;
        const pos = getSourcePos(preEl);
        if (!pos) return;

        e.preventDefault();
        e.stopPropagation();

        const actualStart = pos.startLine + frontmatterOffset;
        const actualEnd = pos.endLine + frontmatterOffset;
        const mdLines = markdown.split("\n");

        // Extract the code block content (lines between ``` fences)
        const originalCode = mdLines.slice(actualStart + 1, actualEnd).join("\n");
        const langLine = mdLines[actualStart] || "";

        // Create modal overlay
        const overlay = document.createElement("div");
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.6);
          display:flex;align-items:center;justify-content:center;
        `;

        const modal = document.createElement("div");
        modal.style.cssText = `
          background:var(--surface);border:1px solid var(--border);border-radius:12px;
          padding:16px;width:90%;max-width:640px;max-height:80vh;display:flex;flex-direction:column;gap:12px;
          box-shadow:0 20px 60px rgba(0,0,0,0.5);
        `;

        const currentLang = langLine.replace(/```/, "").trim();

        const header = document.createElement("div");
        header.style.cssText = `display:flex;justify-content:space-between;align-items:center;`;
        header.innerHTML = `
          <div style="display:flex;align-items:center;gap:0;">
            <input id="code-lang" type="text" value="${currentLang}" placeholder="language"
              style="width:110px;padding:4px 10px;font-size:13px;font-family:ui-monospace,monospace;font-weight:600;
              background:var(--accent-dim);color:var(--accent);border:1px solid transparent;
              border-radius:6px;outline:none;text-transform:uppercase;letter-spacing:0.5px;" />
          </div>
          <div style="display:flex;gap:6px;">
            <button id="code-save" style="padding:4px 12px;font-size:11px;background:var(--accent);color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Save</button>
            <button id="code-cancel" style="padding:4px 12px;font-size:11px;background:var(--toggle-bg);color:var(--text-muted);border:none;border-radius:6px;cursor:pointer;">Cancel</button>
          </div>
        `;

        const textarea = document.createElement("textarea");
        textarea.value = originalCode;
        textarea.style.cssText = `
          flex:1;min-height:200px;background:var(--background);color:var(--editor-text);
          border:1px solid var(--border);border-radius:8px;padding:12px;
          font-family:ui-monospace,'JetBrains Mono','Fira Code',monospace;font-size:13px;
          line-height:1.6;resize:vertical;outline:none;
        `;
        textarea.spellcheck = false;

        modal.appendChild(header);
        modal.appendChild(textarea);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        textarea.focus();

        const save = () => {
          const newCode = textarea.value;
          const newLang = (header.querySelector("#code-lang") as HTMLInputElement)?.value?.trim() || "";
          const codeChanged = newCode !== originalCode;
          const langChanged = newLang !== currentLang;

          if (codeChanged || langChanged) {
            const newLines = [...mdLines];
            // Update language on the opening fence line
            if (langChanged) {
              newLines[actualStart] = "```" + newLang;
            }
            // Update code content
            newLines.splice(actualStart + 1, actualEnd - actualStart - 1, newCode);
            const newMd = newLines.join("\n");
            setMarkdown(newMd);
            doRender(newMd);
          }
          document.body.removeChild(overlay);
        };

        const cancel = () => {
          document.body.removeChild(overlay);
        };

        header.querySelector("#code-save")!.addEventListener("click", save);
        header.querySelector("#code-cancel")!.addEventListener("click", cancel);
        overlay.addEventListener("click", (ev) => {
          if (ev.target === overlay) cancel();
        });
        textarea.addEventListener("keydown", (ke) => {
          if (ke.key === "Escape") cancel();
          if (ke.key === "s" && (ke.metaKey || ke.ctrlKey)) { ke.preventDefault(); save(); }
        });

        return;
      }

      // Text elements → contenteditable inline edit
      const editable = target.closest("h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote > p") as HTMLElement | null;
      if (!editable) return;
      if (target.closest("code")) return;

      const sourceEl = editable.closest("[data-sourcepos]") as HTMLElement | null;
      if (!sourceEl) return;
      const pos = getSourcePos(sourceEl);
      if (!pos) return;

      e.preventDefault();
      e.stopPropagation();

      const originalText = editable.textContent || "";
      editable.setAttribute("contenteditable", "true");
      editable.style.outline = "1px solid var(--accent)";
      editable.style.outlineOffset = "2px";
      editable.style.borderRadius = "4px";
      editable.focus();

      const commit = () => {
        editable.removeAttribute("contenteditable");
        editable.style.outline = "";
        editable.style.outlineOffset = "";
        editable.style.borderRadius = "";

        const newText = editable.textContent || "";
        if (newText !== originalText) {
          const actualStart = pos.startLine + frontmatterOffset;
          const actualEnd = pos.endLine + frontmatterOffset;
          const mdLines = markdown.split("\n");

          // For single-line elements, replace inline text
          if (actualStart === actualEnd && actualStart < mdLines.length) {
            // Preserve MD syntax (# , - , | etc) and replace text content
            const line = mdLines[actualStart];
            const prefixMatch = line.match(/^(\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|(?:\|[^|]*\|)?\s*)?)(.*)$/);
            if (prefixMatch) {
              mdLines[actualStart] = prefixMatch[1] + newText;
            } else {
              mdLines[actualStart] = newText;
            }
          } else {
            // Multi-line: replace all lines with new text
            const firstLine = mdLines[actualStart];
            const prefixMatch = firstLine.match(/^(\s*(?:#{1,6}\s|>\s)?)/);
            const prefix = prefixMatch ? prefixMatch[1] : "";
            mdLines.splice(actualStart, actualEnd - actualStart + 1, prefix + newText);
          }

          const newMd = mdLines.join("\n");
          setMarkdown(newMd);
          doRender(newMd);
        }
      };

      const isListItem = editable.tagName === "LI";
      let committed = false;

      const safeCommit = () => {
        if (committed) return;
        committed = true;
        editable.removeEventListener("blur", safeCommit);
        commit();
      };

      editable.addEventListener("blur", safeCommit);
      editable.addEventListener("keydown", (ke) => {
        const kev = ke as KeyboardEvent;

        if (kev.key === "Escape") {
          committed = true;
          editable.removeEventListener("blur", safeCommit);
          editable.removeAttribute("contenteditable");
          editable.style.outline = "";
          editable.style.outlineOffset = "";
          editable.style.borderRadius = "";
          editable.textContent = originalText;
          return;
        }

        if (kev.key === "Enter" && isListItem) {
          kev.preventDefault();
          safeCommit();
          // Add a new list item in MD source
          const actualStart = pos.startLine + frontmatterOffset;
          const mdLines = markdown.split("\n");
          const currentLine = mdLines[actualStart] || "";
          const prefixMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
          if (prefixMatch) {
            const indent = prefixMatch[1];
            const marker = prefixMatch[2];
            const newMarker = /^\d+$/.test(marker) ? (parseInt(marker) + 1) + "." : marker;
            mdLines.splice(actualStart + 1, 0, `${indent}${newMarker} `);
            const newMd = mdLines.join("\n");
            setMarkdown(newMd);
            doRender(newMd);
          }
          return;
        }

        if (kev.key === "Enter") {
          kev.preventDefault();
          editable.blur();
          return;
        }

        if (kev.key === "Tab") {
          kev.preventDefault();
          if (!isListItem) return;
          safeCommit();
          const actualStart = pos.startLine + frontmatterOffset;
          const mdLines = markdown.split("\n");
          if (kev.shiftKey) {
            mdLines[actualStart] = mdLines[actualStart].replace(/^  /, "");
          } else {
            mdLines[actualStart] = "  " + mdLines[actualStart];
          }
          const newMd = mdLines.join("\n");
          setMarkdown(newMd);
          doRender(newMd);
          return;
        }
      });
    };

    preview.addEventListener("click", handleClick);
    preview.addEventListener("dblclick", handleDblClick);
    return () => {
      preview.removeEventListener("click", handleClick);
      preview.removeEventListener("dblclick", handleDblClick);
    };
  }, [viewMode, markdown, doRender]);

  // Mermaid edit button click handler (re-attach on html/viewMode change)
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
          setShowMermaidModal(true);
        } catch {
          // fallback
        }
      }
    };
    previewRef.current.addEventListener("click", handler);
    const ref = previewRef.current;
    return () => ref.removeEventListener("click", handler);
  }, [html, viewMode]);

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
      const originalStyle = cell.getAttribute("style") || "";

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

      // Lock cell size (preserve original style like text-align)
      const lockStyles = `width:${rect.width}px;height:${rect.height}px;min-width:${rect.width}px;max-width:${rect.width}px;overflow:hidden;padding:2px 4px;`;
      cell.setAttribute("style", originalStyle + ";" + lockStyles);

      const originalContent = cell.innerHTML;
      cell.textContent = "";
      cell.appendChild(input);
      input.focus();
      input.select();

      const commit = () => {
        const newText = input.value;
        // Restore original style (preserves text-align)
        cell.setAttribute("style", originalStyle);
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
        cell.setAttribute("style", originalStyle);
        cell.innerHTML = originalContent;
      };

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ke) => {
        if (ke.key === "Enter") { ke.preventDefault(); input.blur(); }
        if (ke.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
      });
    };

    // Add menu buttons to table cells
    preview.querySelectorAll("td, th").forEach((cell) => {
      if (cell.querySelector(".cell-menu-btn")) return; // already has one
      (cell as HTMLElement).style.position = "relative";
      const btn = document.createElement("button");
      btn.className = "cell-menu-btn";
      btn.textContent = "▾";
      btn.title = "Edit row/column";
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        // Trigger context menu at button position
        const rect = btn.getBoundingClientRect();
        const fakeEvent = { target: cell, clientX: rect.right, clientY: rect.bottom, preventDefault: () => {} };
        openTableMenu(fakeEvent as unknown as MouseEvent, cell as HTMLTableCellElement);
      });
      cell.appendChild(btn);
    });

    // Table context menu logic (shared by right-click and button)
    const openTableMenu = (me: MouseEvent, cell: HTMLTableCellElement) => {
      const table = cell.closest("table");
      if (!table) return;

      me.preventDefault();

      const tableEl = table.closest("[data-sourcepos]") as HTMLElement | null;
      if (!tableEl) return;
      const sp = tableEl.getAttribute("data-sourcepos");
      if (!sp) return;
      const spMatch = sp.match(/^(\d+):\d+-(\d+):\d+$/);
      if (!spMatch) return;

      // Calculate frontmatter offset
      const mdLines = markdown.split("\n");
      let fmOffset = 0;
      if (mdLines[0]?.trim() === "---") {
        for (let k = 1; k < mdLines.length; k++) {
          if (mdLines[k]?.trim() === "---") { fmOffset = k + 1; while (fmOffset < mdLines.length && !mdLines[fmOffset]?.trim()) fmOffset++; break; }
        }
      }

      const tableStart = parseInt(spMatch[1]) - 1 + fmOffset;
      const tableEnd = parseInt(spMatch[2]) - 1 + fmOffset;
      const row = cell.closest("tr");
      if (!row) return;
      const rowIndex = Array.from(table.querySelectorAll("tr")).indexOf(row);
      const colIndex = Array.from(row.children).indexOf(cell);
      const isHeader = cell.tagName === "TH";

      // Remove existing context menu
      document.querySelectorAll(".table-ctx-menu").forEach((el) => el.remove());

      const menu = document.createElement("div");
      menu.className = "table-ctx-menu";
      menu.style.cssText = `
        position:fixed;left:${me.clientX}px;top:${me.clientY}px;z-index:100;
        background:var(--menu-bg);border:1px solid var(--border);border-radius:8px;
        box-shadow:0 8px 24px rgba(0,0,0,0.4);padding:4px 0;min-width:160px;
      `;

      const btnStyle = `display:block;width:100%;text-align:left;padding:6px 12px;font-size:12px;
        border:none;background:none;cursor:pointer;color:var(--text-secondary);font-family:inherit;`;
      const dangerStyle = btnStyle + `color:#ef4444;`;

      menu.innerHTML = `
        ${!isHeader ? `<button style="${btnStyle}" data-action="add-row-above">Insert row above</button>` : ""}
        <button style="${btnStyle}" data-action="add-row-below">Insert row below</button>
        <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;">
        <button style="${btnStyle}" data-action="add-col-left">Insert column left</button>
        <button style="${btnStyle}" data-action="add-col-right">Insert column right</button>
        <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;">
        ${!isHeader ? `<button style="${dangerStyle}" data-action="delete-row">Delete row</button>` : ""}
        <button style="${dangerStyle}" data-action="delete-col">Delete column</button>
      `;

      document.body.appendChild(menu);

      // Prevent menu from going off-screen
      const menuRect = menu.getBoundingClientRect();
      if (menuRect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - menuRect.width - 8}px`;
      }
      if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - menuRect.height - 8}px`;
      }
      if (menuRect.left < 0) {
        menu.style.left = "8px";
      }
      if (menuRect.top < 0) {
        menu.style.top = "8px";
      }

      const closeMenu = () => { menu.remove(); document.removeEventListener("click", closeMenu); };
      setTimeout(() => document.addEventListener("click", closeMenu), 0);

      menu.addEventListener("click", (ev) => {
        const btn = (ev.target as HTMLElement).closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");

        const tableLines = mdLines.slice(tableStart, tableEnd + 1);
        const parsedRows = tableLines.filter((l) => l.trim().startsWith("|")).map((l) => {
          const cells = l.split("|").slice(1, -1).map((c) => c.trim());
          return cells;
        });

        // Row 0 = header, Row 1 = separator (---|---), Row 2+ = data
        const headerRow = parsedRows[0] || [];
        const sepRow = parsedRows[1] || [];
        const dataRows = parsedRows.slice(2);
        const numCols = headerRow.length;

        // Actual data row index (skip header + separator)
        const dataRowIndex = rowIndex - 1; // -1 for header (tbody starts at rowIndex 1 from DOM perspective)

        const buildLine = (cells: string[]) => "| " + cells.join(" | ") + " |";
        const emptyCell = "  —  ";

        if (action === "add-row-above" || action === "add-row-below") {
          const newRow = Array(numCols).fill(emptyCell);
          if (isHeader) {
            // Can't add above header, add below separator instead
            dataRows.splice(0, 0, newRow);
          } else {
            const insertAt = action === "add-row-above" ? dataRowIndex : dataRowIndex + 1;
            dataRows.splice(insertAt, 0, newRow);
          }
        } else if (action === "delete-row" && !isHeader) {
          dataRows.splice(dataRowIndex, 1);
        } else if (action === "add-col-left" || action === "add-col-right") {
          const insertAt = action === "add-col-left" ? colIndex : colIndex + 1;
          // Copy separator style from the current column
          const currentSep = sepRow[colIndex] || "-----";
          headerRow.splice(insertAt, 0, emptyCell);
          sepRow.splice(insertAt, 0, currentSep);
          dataRows.forEach((r) => r.splice(insertAt, 0, emptyCell));
        } else if (action === "delete-col" && numCols > 1) {
          headerRow.splice(colIndex, 1);
          sepRow.splice(colIndex, 1);
          dataRows.forEach((r) => r.splice(colIndex, 1));
        }

        // Rebuild table
        const newTableLines = [
          buildLine(headerRow),
          buildLine(sepRow),
          ...dataRows.map(buildLine),
        ];

        mdLines.splice(tableStart, tableEnd - tableStart + 1, ...newTableLines);
        const newMd = mdLines.join("\n");
        setMarkdown(newMd);
        doRender(newMd);
        closeMenu();
      });
    };

    const handleTableContextMenu = (e: Event) => {
      const me = e as MouseEvent;
      const target = me.target as HTMLElement;
      const cell = target.closest("td, th") as HTMLTableCellElement | null;
      if (!cell) return;
      openTableMenu(me, cell);
    };

    preview.addEventListener("click", handleCheckboxClick);
    preview.addEventListener("dblclick", handleTableDblClick);
    preview.addEventListener("contextmenu", handleTableContextMenu);

    return () => {
      preview.removeEventListener("click", handleCheckboxClick);
      preview.removeEventListener("dblclick", handleTableDblClick);
      preview.removeEventListener("contextmenu", handleTableContextMenu);
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
      const files = Array.from(e.dataTransfer.files).filter(
        f => f.name.endsWith(".md") || f.name.endsWith(".markdown") || f.name.endsWith(".txt") || f.type === "text/markdown" || f.type === "text/plain"
      );

      files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (!text) return;

          if (idx === 0 && !markdown.trim()) {
            // First file into current empty tab
            setMarkdown(text);
            setIsSharedDoc(false);
            doRender(text);
          } else {
            // Additional files → new tabs
            const id = `tab-${tabIdCounter++}`;
            const name = file.name.replace(/\.(md|markdown|txt)$/, "");
            setTabs((prev) => [...prev, { id, title: name, markdown: text }]);
          }
          if (!isMobile) setViewMode("split");
        };
        reader.readAsText(file);
      });
    },
    [doRender, isMobile, markdown]
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

      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
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
  }, [handleShare, handleCopyHtml, undo, redo]);

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
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="px-1.5 py-1 rounded transition-colors shrink-0"
            style={{ color: showSidebar ? "var(--accent)" : "var(--text-muted)", background: showSidebar ? "var(--accent-dim)" : "transparent" }}
            title="Toggle documents sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2" width="14" height="12" rx="2" />
              <line x1="5.5" y1="2" x2="5.5" y2="14" />
            </svg>
          </button>
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
              ? (["editor", "split", "preview"] as ViewMode[])
              : (["editor", "split", "preview"] as ViewMode[])
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
                {mode === "editor" ? "MD" : mode === "split" ? "Split" : "Render"}
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
                  className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl"
                  style={{ zIndex: 9999, background: "var(--menu-bg)", border: "1px solid var(--border)" }}
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
                    <button
                      onClick={() => { setCanvasMermaid(undefined); setShowMermaidModal(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      New Mermaid Diagram
                    </button>
                    <hr style={{ borderColor: "var(--border)" }} className="my-1" />
                    <button
                      onClick={() => { addTab(); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      New tab
                    </button>
                    <button
                      onClick={handleClear}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Clear document
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

      {/* Main content wrapper (sidebar + editor/render) */}
      <div
        className="flex flex-1 min-h-0"
        onMouseMove={(e) => {
          if (isDraggingSidebar.current) {
            const wrapper = e.currentTarget;
            const rect = wrapper.getBoundingClientRect();
            const w = Math.max(140, Math.min(400, e.clientX - rect.left));
            setSidebarWidth(w);
            const el = wrapper.querySelector('[data-pane="sidebar"]') as HTMLElement;
            if (el) el.style.width = `${w}px`;
          }
        }}
        onMouseUp={() => { isDraggingSidebar.current = false; }}
        onClick={() => { if (docContextMenu) setDocContextMenu(null); }}
      >

      {/* Sidebar */}
      {showSidebar && (
        <>
        <div
          className="flex flex-col shrink-0 overflow-y-auto"
          data-pane="sidebar"
          style={{ width: sidebarWidth, background: "var(--background)" }}
        >
          {/* Header — matches Markdown/Render headers */}
          <div
            className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider shrink-0"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
          >
            <span>Documents</span>
            <button
              onClick={addTab}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
            >
              + New
            </button>
          </div>
          {/* Document list */}
          <div className="p-2 space-y-0.5 flex-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md cursor-pointer group text-xs transition-colors"
                style={{
                  background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                  color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-muted)",
                }}
                onClick={() => tab.id !== activeTabId && switchTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                }}
              >
                <span className="text-[10px]" style={{ color: tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)" }}>📄</span>
                <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 py-0.5 rounded shrink-0"
                  style={{ color: "var(--text-faint)" }}
                >
                  ···
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Sidebar resize handle */}
        <div
          className="shrink-0 cursor-col-resize w-[5px]"
          style={{ background: "var(--border-dim)", position: "relative" }}
          onMouseDown={(e) => { e.preventDefault(); isDraggingSidebar.current = true; }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8" style={{ background: "var(--text-faint)", borderRadius: 2, opacity: 0.3 }} />
        </div>
        </>
      )}

      {/* Editor + Render area */}
      <div
        ref={splitContainerRef}
        className={`flex flex-1 min-h-0 ${isMobile && viewMode === "split" ? "flex-col" : ""}`}
        onMouseMove={(e) => {
          if (!isDraggingSplit.current || !splitContainerRef.current) return;
          const rect = splitContainerRef.current.getBoundingClientRect();
          let pct: number;
          if (isMobile) {
            pct = ((e.clientY - rect.top) / rect.height) * 100;
          } else {
            pct = ((e.clientX - rect.left) / rect.width) * 100;
          }
          pct = Math.max(20, Math.min(80, pct));
          splitPercentRef.current = pct;
          // Update DOM directly to avoid re-render (preserves Mermaid SVGs)
          const editorPane = splitContainerRef.current.querySelector("[data-pane='editor']") as HTMLElement;
          if (editorPane) {
            if (isMobile) {
              editorPane.style.height = `${pct}%`;
            } else {
              editorPane.style.width = `${pct}%`;
            }
          }
        }}
        onMouseUp={() => { isDraggingSplit.current = false; }}
        onMouseLeave={() => { isDraggingSplit.current = false; }}
      >
        {/* Editor pane */}
        {viewMode !== "preview" && (
          <div
            data-pane="editor"
            className="flex flex-col"
            style={{
              width: viewMode === "split" && !isMobile ? `${splitPercentRef.current}%` : "100%",
              height: viewMode === "split" && isMobile ? `${splitPercentRef.current}%` : undefined,
              flexShrink: 0,
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

        {/* Resize handle */}
        {viewMode === "split" && (
          <div
            className={`shrink-0 ${isMobile ? "cursor-row-resize h-[6px] w-full" : "cursor-col-resize w-[6px]"}`}
            style={{ background: "var(--border-dim)", position: "relative", zIndex: 5 }}
            onMouseDown={(e) => { e.preventDefault(); isDraggingSplit.current = true; }}
          >
            <div
              className={`absolute ${isMobile ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8"}`}
              style={{ background: "var(--text-faint)", borderRadius: 2, opacity: 0.4 }}
            />
          </div>
        )}

        {/* Preview pane */}
        {viewMode !== "editor" && (
          <div
            className="flex-1 min-w-0 flex flex-col"
            style={{ background: "var(--background)" }}
          >
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Render</span>
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
                <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>double-click to edit</span>
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
                  ref={(el) => {
                    // Only update innerHTML when html actually changes
                    if (el && el.getAttribute("data-html-hash") !== String(html.length)) {
                      el.innerHTML = html;
                      el.setAttribute("data-html-hash", String(html.length));
                    }
                  }}
                  className={`mdcore-rendered max-w-none ${
                    viewMode === "preview"
                      ? "p-4 sm:p-8 mx-auto max-w-3xl"
                      : "p-3 sm:p-6"
                  }`}
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
      </div>{/* end main content wrapper */}

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

      {/* Document context menu */}
      {docContextMenu && (
        <div
          className="fixed rounded-lg shadow-xl py-1"
          style={{
            left: docContextMenu.x,
            top: docContextMenu.y,
            zIndex: 9999,
            background: "var(--menu-bg)",
            border: "1px solid var(--border)",
            minWidth: 150,
          }}
        >
          {[
            { label: "Duplicate", action: () => {
              const tab = tabs.find(t => t.id === docContextMenu.tabId);
              if (tab) {
                const id = `tab-${tabIdCounter++}`;
                setTabs(prev => [...prev, { ...tab, id, title: tab.title + " (copy)" }]);
              }
            }},
            { label: "Share", action: () => {
              const tab = tabs.find(t => t.id === docContextMenu.tabId);
              if (tab) { switchTab(tab.id); setTimeout(() => handleShare(), 100); }
            }},
            { label: "Download .md", action: () => {
              const tab = tabs.find(t => t.id === docContextMenu.tabId);
              if (tab) {
                const blob = new Blob([tab.markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${tab.title || "document"}.md`; a.click();
                URL.revokeObjectURL(url);
              }
            }},
            ...(tabs.length > 1 ? [{ label: "Delete", action: () => closeTab(docContextMenu.tabId), danger: true }] : []),
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setDocContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs transition-colors"
              style={{ color: (item as { danger?: boolean }).danger ? "#ef4444" : "var(--text-secondary)" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

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
      {/* Mermaid Editor Modal */}
      {showMermaidModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="flex flex-col"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
              width: "95vw",
              height: "90vh",
              maxWidth: "1400px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <MdCanvas
              initialMermaid={canvasMermaid}
              onCancel={() => {
                setShowMermaidModal(false);
                setCanvasMermaid(undefined);
              }}
              onGenerate={(md) => {
                let newMarkdown: string;
                if (canvasMermaid) {
                  const originalBlock = "```mermaid\n" + canvasMermaid + "\n```";
                  if (markdown.includes(originalBlock)) {
                    newMarkdown = markdown.replace(originalBlock, md);
                  } else {
                    const mermaidBlockRegex = /```mermaid\n[\s\S]*?```/g;
                    const blocks = [...markdown.matchAll(mermaidBlockRegex)];
                    const match = blocks.find(b => {
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
                setShowMermaidModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
