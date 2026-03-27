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
import MathEditor from "@/components/MathEditor";
import { useCodeMirror } from "@/components/useCodeMirror";
import FloatingToolbar from "@/components/FloatingToolbar";
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

## XY Chart

\`\`\`mermaid
xychart-beta
    title "Monthly Users"
    x-axis ["Jan", "Feb", "Mar", "Apr", "May"]
    y-axis "Users" 0 --> 500
    bar [120, 200, 350, 280, 450]
    line [100, 180, 300, 250, 400]
\`\`\`


---

*All 19 Mermaid diagram types with visual editors. Double-click to edit.*
`;


const SAMPLE_ASCII = `# ASCII Art Examples

> Hover over code blocks and click **"Render"** to convert with AI.

## Architecture Diagram

\`\`\`
┌──────────────────────────────────────────┐
│              mdfy.cc                      │
│                                          │
│  ┌─ Input ─────────────────────────────┐ │
│  │ Chrome Extension: AI → capture      │ │
│  │ Paste: Cmd+V                        │ │
│  │ Drop: .md file drag                 │ │
│  └─────────────────────────────────────┘ │
│                    │                      │
│                    ▼                      │
│  ┌─ Engine (mdcore) ───────────────────┐ │
│  │ AI noise removal                    │ │
│  │ Code + Math + Diagram rendering     │ │
│  │ Format detection                    │ │
│  └─────────────────────────────────────┘ │
│                    │                      │
│                    ▼                      │
│  ┌─ Output ────────────────────────────┐ │
│  │ mdfy.cc/{id} — shareable URL        │ │
│  │ + "Published with mdfy.cc" badge    │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
\`\`\`

## Score Card

\`\`\`
┌─────────────────────────────┐
│  Score: 93/100               │
│                              │
│  Quality  ████████░░ 85%     │
│  Style    █████████░ 92%     │
│  Clarity  ██████░░░░ 63%     │
│                              │
│  — Analyzed by mdcore        │
│  mdfy.cc                     │
└─────────────────────────────┘
\`\`\`

## Comparison Table

\`\`\`
┌──────────────┬─────────┬──────────┐
│   Product    │   ARR   │   Moat   │
├──────────────┼─────────┼──────────┤
│ Carrd        │ $1.5-2M │ Badge    │
├──────────────┼─────────┼──────────┤
│ Plausible    │ $3.1M   │ Anti-GA  │
├──────────────┼─────────┼──────────┤
│ Buttondown   │ $180K+  │ Footer   │
└──────────────┴─────────┴──────────┘
\`\`\`

## Simple Flow

\`\`\`
┌────────┐     ┌────────┐     ┌────────┐
│  Input │────→│ Process│────→│ Output │
└────────┘     └────────┘     └────────┘
\`\`\`

## Pricing Tiers

\`\`\`
┌─ Free ────────┐  ┌─ Pro $8/mo ──────┐
│ 10 docs/month │  │ Unlimited docs   │
│ 7-day expiry  │  │ No expiry        │
│ Watermark     │  │ Custom domain    │
│ Basic sharing │  │ Analytics        │
└───────────────┘  └──────────────────┘
\`\`\`
`;

/** Extract title from markdown (first # heading, or first line) */
function extractTitleFromMd(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}

const INITIAL_TABS: Tab[] = [
  { id: "tab-welcome", title: extractTitleFromMd(SAMPLE_WELCOME), markdown: SAMPLE_WELCOME },
  { id: "tab-syntax", title: extractTitleFromMd(SAMPLE_FORMATTING), markdown: SAMPLE_FORMATTING },
  { id: "tab-diagrams", title: extractTitleFromMd(SAMPLE_DIAGRAMS), markdown: SAMPLE_DIAGRAMS },
  { id: "tab-ascii", title: extractTitleFromMd(SAMPLE_ASCII), markdown: SAMPLE_ASCII },
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

// ─── Toolbar Button with instant tooltip ───
function TBtn({ tip, active, onClick, children }: {
  tip: string; active?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative group shrink-0">
      <button
        className={`w-7 h-7 flex items-center justify-center rounded transition-colors
          ${active
            ? "bg-[var(--accent-dim)] text-[var(--accent)]"
            : "hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
          }`}
        onClick={onClick}
      >
        {children}
      </button>
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap
          opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      >
        {tip}
      </div>
    </div>
  );
}

// ─── WYSIWYG Fixed Toolbar (Markdown-compatible only) ───
function WysiwygToolbar({ onInsert, onInsertTable }: {
  onInsert: (type: "code" | "math" | "mermaid") => void;
  onInsertTable: (cols: number, rows: number) => void;
}) {
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [blockType, setBlockType] = useState("p");
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [tableHover, setTableHover] = useState({ col: 0, row: 0 });

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode) return;
      const el = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode.parentElement;
      if (!el?.closest("article.mdcore-rendered")) return;

      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        strikethrough: document.queryCommandState("strikeThrough"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
        code: !!el?.closest("code"),
      });

      const block = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "");
      if (block && /^h[1-6]$|^p$|^blockquote$/.test(block)) {
        setBlockType(block);
      } else {
        const heading = el?.closest("h1,h2,h3,h4,h5,h6,blockquote,p,li");
        if (heading) {
          const tag = heading.tagName.toLowerCase();
          setBlockType(tag === "li" ? "p" : tag);
        }
      }
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);
  const fmtBlock = (tag: string) => document.execCommand("formatBlock", false, tag);
  const wrapCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    try { sel.getRangeAt(0).surroundContents(document.createElement("code")); } catch { /* */ }
  };

  const sep = <div className="w-px h-5 shrink-0 mx-0.5" style={{ background: "var(--border-dim)" }} />;
  const I = 14;

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-2 py-0.5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <TBtn tip="Undo (Cmd+Z)" onClick={() => exec("undo")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7h7a3 3 0 010 6H8"/><path d="M6 4L3 7l3 3"/></svg>
      </TBtn>
      <TBtn tip="Redo (Cmd+Shift+Z)" onClick={() => exec("redo")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 7H6a3 3 0 000 6h2"/><path d="M10 4l3 3-3 3"/></svg>
      </TBtn>
      {sep}
      <TBtn tip="Heading 1" active={blockType==="h1"} onClick={() => fmtBlock("h1")}><span className="text-[10px] font-bold">H1</span></TBtn>
      <TBtn tip="Heading 2" active={blockType==="h2"} onClick={() => fmtBlock("h2")}><span className="text-[10px] font-bold">H2</span></TBtn>
      <TBtn tip="Heading 3" active={blockType==="h3"} onClick={() => fmtBlock("h3")}><span className="text-[10px] font-semibold">H3</span></TBtn>
      <TBtn tip="Heading 4" active={blockType==="h4"} onClick={() => fmtBlock("h4")}><span className="text-[10px]">H4</span></TBtn>
      <TBtn tip="Heading 5" active={blockType==="h5"} onClick={() => fmtBlock("h5")}><span className="text-[10px]">H5</span></TBtn>
      <TBtn tip="Heading 6" active={blockType==="h6"} onClick={() => fmtBlock("h6")}><span className="text-[10px]">H6</span></TBtn>
      <TBtn tip="Paragraph" active={blockType==="p"} onClick={() => fmtBlock("p")}><span className="text-[10px]">P</span></TBtn>
      {sep}
      <TBtn tip="Bold (Cmd+B) → **text**" active={active.bold} onClick={() => exec("bold")}><span className="font-bold text-[12px]">B</span></TBtn>
      <TBtn tip="Italic (Cmd+I) → *text*" active={active.italic} onClick={() => exec("italic")}><span className="italic text-[12px]">I</span></TBtn>
      <TBtn tip="Strikethrough → ~~text~~" active={active.strikethrough} onClick={() => exec("strikeThrough")}><span className="line-through text-[12px]">S</span></TBtn>
      <TBtn tip="Inline code → `code`" active={active.code} onClick={wrapCode}><span className="font-mono text-[10px]">{`</>`}</span></TBtn>
      {sep}
      <TBtn tip="Bullet list → - item" active={active.ul} onClick={() => exec("insertUnorderedList")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="3" cy="12" r="1"/><rect x="6" y="3" width="8" height="2" rx="0.5"/><rect x="6" y="7" width="8" height="2" rx="0.5"/><rect x="6" y="11" width="8" height="2" rx="0.5"/></svg>
      </TBtn>
      <TBtn tip="Numbered list → 1. item" active={active.ol} onClick={() => exec("insertOrderedList")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><text x="1" y="5" fontSize="4.5" fontWeight="700">1</text><text x="1" y="9" fontSize="4.5" fontWeight="700">2</text><text x="1" y="13" fontSize="4.5" fontWeight="700">3</text><rect x="6" y="3" width="8" height="2" rx="0.5"/><rect x="6" y="7" width="8" height="2" rx="0.5"/><rect x="6" y="11" width="8" height="2" rx="0.5"/></svg>
      </TBtn>
      <TBtn tip="Indent" onClick={() => exec("indent")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 4h10M7 8h6M7 12h6M3 7l2 1.5L3 10"/></svg>
      </TBtn>
      <TBtn tip="Outdent" onClick={() => exec("outdent")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 4h10M7 8h6M7 12h6M5 7l-2 1.5L5 10"/></svg>
      </TBtn>
      {sep}
      <TBtn tip="Blockquote → > text" active={blockType==="blockquote"} onClick={() => fmtBlock("blockquote")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h4v4H5.5L4 10H3V3zm6 0h4v4h-1.5L10 10H9V3z"/></svg>
      </TBtn>
      <TBtn tip="Horizontal rule → ---" onClick={() => exec("insertHorizontalRule")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="8" x2="14" y2="8"/></svg>
      </TBtn>
      {sep}
      <TBtn tip="Link (Cmd+K) → [text](url)" onClick={() => { const u = prompt("URL:"); if (u) exec("createLink", u); }}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 9l2-2"/><rect x="1" y="7" width="5" height="5" rx="1.5" transform="rotate(-45 3.5 9.5)"/><rect x="7" y="1" width="5" height="5" rx="1.5" transform="rotate(-45 9.5 3.5)"/></svg>
      </TBtn>
      <TBtn tip="Image → ![alt](url)" onClick={() => { const u = prompt("Image URL:"); if (u) exec("insertImage", u); }}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M2 11l3.5-3 2.5 2 3-2.5L14 11" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </TBtn>
      {sep}
      <TBtn tip="Clear formatting" onClick={() => exec("removeFormat")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 13h10M6 3l-2.5 7h9L10 3"/><line x1="4" y1="8" x2="12" y2="8"/></svg>
      </TBtn>
      {sep}
      {/* Insert special elements */}
      {/* Table grid picker */}
      <div className="relative" onMouseLeave={() => setShowTableGrid(false)}>
        <TBtn tip="Insert table" onClick={() => setShowTableGrid(v => !v)}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>
        </TBtn>
        {showTableGrid && (
          <div className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-xl z-50"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
            onMouseDown={(e) => e.preventDefault()}>
            <div className="text-[10px] mb-1.5 text-center" style={{ color: "var(--text-muted)" }}>
              {tableHover.col > 0 ? `${tableHover.col} x ${tableHover.row}` : "Select size"}
            </div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
              {Array.from({ length: 36 }, (_, i) => {
                const col = (i % 6) + 1;
                const row = Math.floor(i / 6) + 1;
                const isActive = col <= tableHover.col && row <= tableHover.row;
                return (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm border cursor-pointer transition-colors"
                    style={{
                      borderColor: isActive ? "var(--accent)" : "var(--border-dim)",
                      background: isActive ? "var(--accent-dim)" : "transparent",
                    }}
                    onMouseEnter={() => setTableHover({ col, row })}
                    onClick={() => {
                      onInsertTable(col, row);
                      setShowTableGrid(false);
                      setTableHover({ col: 0, row: 0 });
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
      <TBtn tip="Insert code block" onClick={() => onInsert("code")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 4L2 8l3 4M11 4l3 4-3 4"/></svg>
      </TBtn>
      <TBtn tip="Insert math equation" onClick={() => onInsert("math")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><text x="2" y="12" fontSize="11" fontFamily="serif" fontStyle="italic">fx</text></svg>
      </TBtn>
      <TBtn tip="Insert Mermaid diagram" onClick={() => onInsert("mermaid")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="4" y="1" width="8" height="4" rx="1"/><rect x="1" y="11" width="5" height="4" rx="1"/><rect x="10" y="11" width="5" height="4" rx="1"/><path d="M8 5v3M8 8L3.5 11M8 8l4.5 3"/></svg>
      </TBtn>
    </div>
  );
}

export default function MdEditor() {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  // Diagram rendering mode: "default" (mermaid.js/ASCII) or "ai" (Gemini HTML)
  type DiagramMode = "default" | "ai";
  const [diagramMode, setDiagramMode] = useState<DiagramMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("mdfy-diagram-mode") as DiagramMode) || "default";
    }
    return "default";
  });
  const diagramModeRef = useRef(diagramMode);
  diagramModeRef.current = diagramMode;
  const toggleDiagramMode = useCallback(() => {
    const next: DiagramMode = diagramMode === "default" ? "ai" : "default";
    setDiagramMode(next);
    localStorage.setItem("mdfy-diagram-mode", next);
  }, [diagramMode]);

  // Tab system
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("tab-welcome");
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [canvasMermaid, setCanvasMermaid] = useState<string | undefined>();
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [initialMath, setInitialMath] = useState<string | undefined>();
  const [showMathModal, setShowMathModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const isDraggingSidebar = useRef(false);
  const [docContextMenu, setDocContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const splitPercentRef = useRef(60);
  const isDraggingSplit = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  // CodeMirror 6 editor — replaces plain textarea
  const handleChangeRef = useRef<(value: string) => void>(() => {});
  const handlePasteForCM = useCallback((text: string, html: string): string | null => {
    if (html && isHtmlContent(html)) {
      return htmlToMarkdown(html);
    }
    if (text && !html && isHtmlContent(text)) {
      return htmlToMarkdown(text);
    }
    return null;
  }, []);
  const {
    containerRef: editorContainerRef,
    focus: cmFocus,
    setDoc: cmSetDoc,
    scrollToLine: cmScrollToLine,
    setSelection: cmSetSelection,
  } = useCodeMirror({
    initialDoc: markdown,
    onChange: (value: string) => handleChangeRef.current(value),
    onPaste: handlePasteForCM,
    theme,
    placeholder: "Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything...",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Set default view mode based on screen size
  useEffect(() => {
    if (isMobile) {
      setViewMode("split"); // vertical split on mobile
    }
  }, [isMobile]);

  const renderIdRef = useRef(0);
  const doRender = useCallback(async (md: string) => {
    const thisRender = ++renderIdRef.current;
    try {
      const start = performance.now();
      const result = await renderMarkdown(md);
      if (thisRender !== renderIdRef.current) return; // stale render, discard
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
      // Sync title to sidebar tab immediately (use ref to avoid stale closure)
      if (result.title) {
        const currentTabId = activeTabIdRef.current;
        const newTitle = result.title;
        setTabs((prev) => prev.map((t) => t.id === currentTabId ? { ...t, title: newTitle } : t));
      }
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
    setHtml(""); // clear stale preview
    undoStack.current = [tab.markdown];
    redoStack.current = [];
    doRenderRef.current(tab.markdown);
  }, [tabs, activeTabId, markdown, title]);

  const addTab = useCallback(() => {
    // Save current tab
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, markdown, title: title || "Untitled" } : t));
    const id = `tab-${tabIdCounter++}`;
    const initialMd = "# Untitled\n\n";
    const newTab: Tab = { id, title: "Untitled", markdown: initialMd };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    setMarkdownRaw(initialMd);
    setTitle("Untitled");
    setHtml(""); // clear stale preview immediately
    undoStack.current = [initialMd];
    redoStack.current = [];
    doRenderRef.current(initialMd);
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

    // Use mermaid from CDN (window.mermaid) — webpack can't handle mermaid's dynamic chunk imports
    const waitForMermaid = (): Promise<typeof import("mermaid").default> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).mermaid) return Promise.resolve((window as any).mermaid);
      return new Promise((resolve) => {
        const check = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).mermaid) { clearInterval(check); resolve((window as any).mermaid); }
        }, 50);
        setTimeout(() => clearInterval(check), 10000); // timeout after 10s
      });
    };

    waitForMermaid().then(async (mermaid) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "default",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 15,
        // Layout config — generous spacing to match AI render feel
        flowchart: {
          padding: 16,
          nodeSpacing: 30,
          rankSpacing: 40,
          htmlLabels: true,
          curve: "basis",
        },
        sequence: {
          actorMargin: 60,
          messageMargin: 40,
          boxMargin: 8,
          noteMargin: 12,
          messageAlign: "center" as const,
        },
        themeCSS: `
          .nodeLabel { font-size: 14px; font-weight: 500; }
          .edgeLabel { font-size: 12px; }
          .cluster-label .nodeLabel { font-size: 13px; font-weight: 600; }
          .messageText { font-size: 13px; }
          text.actor { font-size: 14px; font-weight: 500; }
        `,
        themeVariables: isDark ? {
          background: "transparent",
          primaryColor: "#222230",
          primaryTextColor: "#ededf0",
          primaryBorderColor: "#3a3a48",
          lineColor: "#50505e",
          secondaryColor: "#1a1a24",
          tertiaryColor: "#1a1a24",
          // Pie chart colors (layout needs these)
          pie1: "#fb923c", pie2: "#818cf8", pie3: "#4ade80", pie4: "#fb7185",
          pie5: "#60a5fa", pie6: "#c084fc", pie7: "#fbbf24", pie8: "#2dd4bf",
          // Git colors
          git0: "#fb923c", git1: "#818cf8", git2: "#4ade80", git3: "#fb7185",
          git4: "#60a5fa", git5: "#c084fc", git6: "#fbbf24", git7: "#2dd4bf",
        } : {
          background: "transparent",
          primaryColor: "#ffffff",
          primaryTextColor: "#1a1a2e",
          primaryBorderColor: "#e0e0e8",
          lineColor: "#b0b0c0",
          secondaryColor: "#f7f7fa",
          tertiaryColor: "#f7f7fa",
          pie1: "#ea580c", pie2: "#6366f1", pie3: "#16a34a", pie4: "#e11d48",
          pie5: "#2563eb", pie6: "#9333ea", pie7: "#ca8a04", pie8: "#0d9488",
          git0: "#ea580c", git1: "#6366f1", git2: "#16a34a", git3: "#e11d48",
          git4: "#2563eb", git5: "#9333ea", git6: "#ca8a04", git7: "#0d9488",
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
          const { svg: rawSvg } = await mermaid.render(id, code);
          const { styleMermaidSvg } = await import("@/lib/mermaid-style");
          const svg = styleMermaidSvg(rawSvg, isDark);

          // Build container
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-container";
          const sourcepos = pre.getAttribute("data-sourcepos");
          if (sourcepos) wrapper.setAttribute("data-sourcepos", sourcepos);

          // Toolbar: Edit | Copy
          const toolbar = document.createElement("div");
          toolbar.style.cssText = "display:flex;justify-content:flex-end;gap:6px;padding:8px 10px 0;opacity:0;transition:opacity 0.15s";

          const btnStyle = "padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;border-radius:4px;cursor:pointer;line-height:14px";

          // "Edit" button — Mermaid visual editor
          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.style.cssText = `${btnStyle};background:none;color:var(--text-muted);border:1px solid var(--border-dim)`;
          editBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            setCanvasMermaid(code);
            setShowMermaidModal(true);
          });
          toolbar.appendChild(editBtn);

          // Copy button
          const copySvg = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="9" height="10" rx="1"/><path d="M2 6v7a1 1 0 001 1h7"/></svg>';
          const checkSvg = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 8 7 11 12 5"/></svg>';
          const copyBtn = document.createElement("button");
          copyBtn.title = "Copy source";
          copyBtn.style.cssText = "padding:4px;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;display:flex;align-items:center";
          copyBtn.innerHTML = copySvg;
          copyBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            navigator.clipboard.writeText(code).then(() => {
              copyBtn.innerHTML = checkSvg;
              setTimeout(() => { copyBtn.innerHTML = copySvg; }, 1500);
            });
          });
          toolbar.appendChild(copyBtn);

          wrapper.appendChild(toolbar);

          // Default: mermaid.js SVG rendering
          const rendered = document.createElement("div");
          rendered.className = "mermaid-rendered";
          rendered.innerHTML = svg;
          wrapper.appendChild(rendered);

          // Show toolbar on hover
          wrapper.addEventListener("mouseenter", () => { toolbar.style.opacity = "1"; });
          wrapper.addEventListener("mouseleave", () => { toolbar.style.opacity = "0"; });

          // Double-click → open in Mermaid editor
          wrapper.addEventListener("dblclick", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            setCanvasMermaid(code);
            setShowMermaidModal(true);
          });
          wrapper.style.cursor = "pointer";

          pre.replaceWith(wrapper);

        } catch (err) {
          console.warn(`Mermaid render failed for "${code.substring(0, 30)}...":`, err);
          // mermaid injects error SVGs into DOM — remove them
          document.querySelectorAll(`#d${id}, [id^="d${id}"]`).forEach((el) => el.remove());
          // Also remove any mermaid error containers
          document.querySelectorAll(".mermaid-error, [id*='mermaid-'] .error-icon").forEach((el) => {
            const parent = el.closest("[id*='mermaid-']");
            if (parent) parent.remove();
            else el.remove();
          });
        }
      }
    });
  }, [html, isLoading, theme, viewMode, diagramMode]);

  // ASCII diagram — add "Render" button (user-controlled, not auto)
  useEffect(() => {
    if (!previewRef.current || isLoading) return;

    const asciiDiagrams = previewRef.current.querySelectorAll(".ascii-diagram");
    if (asciiDiagrams.length === 0) return;

    asciiDiagrams.forEach((el) => {
      if (el.querySelector(".ascii-render-btn")) return; // already has button

      // Toolbar at top of container (flow layout, not overlapping content)
      const toolbar = document.createElement("div");
      toolbar.style.cssText = "display:flex;justify-content:flex-end;gap:6px;padding:8px 10px 0;opacity:0;transition:opacity 0.15s";

      const btn = document.createElement("button");
      btn.className = "ascii-render-btn";
      btn.textContent = "Render";
      btn.style.cssText = `
        padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;
        background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent);
        border-radius:4px;cursor:pointer;line-height:14px;
      `;
      toolbar.appendChild(btn);

      // Insert toolbar before the <pre> content
      el.insertBefore(toolbar, el.firstChild);

      // Show toolbar on hover
      el.addEventListener("mouseenter", () => { toolbar.style.opacity = "1"; });
      el.addEventListener("mouseleave", () => { toolbar.style.opacity = "0"; });

      btn.addEventListener("click", async () => {
        const codeEl = el.querySelector("code");
        const asciiText = codeEl?.textContent || el.textContent || "";
        if (!asciiText.trim()) return;

        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><circle cx="8" cy="8" r="6" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>';
        btn.style.opacity = "1";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";

        try {
          const res = await fetch("/api/ascii-to-mermaid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ascii: asciiText }),
          });

          if (!res.ok) throw new Error("API error");

          const { html: renderedHtml } = await res.json();
          if (!renderedHtml) throw new Error("No output");

          const originalHtml = el.innerHTML;
          const srcText = el.querySelector("code")?.textContent || "";

          // Clear and rebuild via DOM
          (el as HTMLElement).innerHTML = "";

          // Toolbar row at top (flow layout, not overlapping)
          const postToolbar = document.createElement("div");
          postToolbar.style.cssText = "display:flex;justify-content:flex-end;gap:6px;padding:8px 10px 0";

          // "Rendered" label
          const label = document.createElement("span");
          label.textContent = "Rendered";
          label.style.cssText = "padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;color:var(--text-faint);border:1px solid var(--border-dim);border-radius:4px;line-height:14px";
          postToolbar.appendChild(label);

          // Copy source button
          const copyBtn = document.createElement("button");
          copyBtn.title = "Copy source";
          copyBtn.style.cssText = "padding:4px;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;display:flex;align-items:center";
          const copySvg = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="9" height="10" rx="1"/><path d="M2 6v7a1 1 0 001 1h7"/></svg>';
          const checkSvg = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 8 7 11 12 5"/></svg>';
          copyBtn.innerHTML = copySvg;
          copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(srcText).then(() => {
              copyBtn.innerHTML = checkSvg;
              setTimeout(() => { copyBtn.innerHTML = copySvg; }, 1500);
            });
          });
          postToolbar.appendChild(copyBtn);
          el.appendChild(postToolbar);

          // Rendered content
          const content = document.createElement("div");
          content.style.cssText = "padding:1rem;overflow-x:auto";
          content.innerHTML = renderedHtml;
          el.appendChild(content);

          // Source details
          const details = document.createElement("details");
          details.style.cssText = "margin:0;border-top:1px solid var(--border-dim)";
          const summary = document.createElement("summary");
          summary.textContent = "Show source";
          summary.style.cssText = "padding:6px 12px;font-size:10px;font-family:ui-monospace,monospace;color:var(--text-faint);cursor:pointer;user-select:none";
          details.appendChild(summary);
          const srcDiv = document.createElement("div");
          srcDiv.style.cssText = "overflow-x:auto";
          srcDiv.innerHTML = originalHtml;
          details.appendChild(srcDiv);
          el.appendChild(details);
        } catch {
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ef4444" stroke-width="2"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
          setTimeout(() => {
            btn.textContent = "Render";
            btn.style.display = "";
          }, 2000);
        }
      });
      // Auto-trigger AI render if diagram mode is "ai"
      if (diagramModeRef.current === "ai") {
        btn.click();
      }
    });
  }, [html, isLoading, theme, diagramMode]);

  // Math: double-click to edit in MathEditor
  useEffect(() => {
    if (!previewRef.current || isLoading) return;
    const mathEls = previewRef.current.querySelectorAll(".math-rendered[data-math-src]");
    mathEls.forEach((el) => {
      if ((el as HTMLElement).dataset.mathHandled) return;
      (el as HTMLElement).dataset.mathHandled = "1";
      el.addEventListener("dblclick", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const src = decodeURIComponent((el as HTMLElement).dataset.mathSrc || "");
        if (src) {
          setInitialMath(src);
          setShowMathModal(true);
        }
      });
    });
  }, [html, isLoading]);

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
  // Ref for latest markdown (avoids stale closures in preview event handlers)
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;

  // Uses comrak's data-sourcepos="startLine:startCol-endLine:endCol" for accurate mapping
  useEffect(() => {
    if (!previewRef.current || viewMode === "editor") return;
    const preview = previewRef.current;

    // Parse sourcepos attribute → { startLine, endLine }
    const getSourcePos = (el: HTMLElement): { startLine: number; endLine: number } | null => {
      const sp = el.getAttribute("data-sourcepos") || el.closest("[data-sourcepos]")?.getAttribute("data-sourcepos");
      if (!sp) return null;
      const match = sp.match(/^(\d+):\d+-(\d+):\d+$/);
      if (!match) return null;
      return { startLine: parseInt(match[1]) - 1, endLine: parseInt(match[2]) - 1 }; // 0-indexed
    };

    // Account for frontmatter offset — use ref for fresh data in async handlers
    const lines = markdownRef.current.split("\n");
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

    // Click in preview → scroll + highlight corresponding block in source
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button,a,input")) return;

      const sourceEl = target.closest("[data-sourcepos]") as HTMLElement | null;
      if (!sourceEl) return;
      const pos = getSourcePos(sourceEl);
      if (!pos) return;
      const actualStart = pos.startLine + frontmatterOffset;
      const actualEnd = pos.endLine + frontmatterOffset;
      const freshLines = markdownRef.current.split("\n");
      let startChar = 0;
      for (let i = 0; i < actualStart && i < freshLines.length; i++) {
        startChar += freshLines[i].length + 1;
      }
      let endChar = startChar;
      for (let i = actualStart; i <= actualEnd && i < freshLines.length; i++) {
        endChar += freshLines[i].length + 1;
      }
      cmScrollToLine(actualStart);
      cmSetSelection(startChar, endChar);
    };

    // contentEditable on the article handles Word-like editing natively.
    // Double-click only for special elements (code blocks, mermaid, math).

    // Double-click → code block modal / special elements
    const handleDblClick = (e: Event) => {
      const target = e.target as HTMLElement;
      // Only handle double-click on non-editable islands (code, table, mermaid, math)
      const nonEditable = target.closest("[contenteditable=false]");
      if (!nonEditable) return; // inside editable content — let native dblclick work
      // Skip table cells — handled by handleTableDblClick
      if (target.closest("td,th,table")) return;
      // Skip mermaid, math — handled separately
      if (target.closest(".mermaid-container,.math-rendered")) return;

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
        const mdLines = markdownRef.current.split("\n");

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

      // Text editing is now handled by single-click (handleClick → handleEditClick)
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
      const lines = markdownRef.current.split("\n");
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
          const lines = markdownRef.current.split("\n");
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

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      setShowExportMenu(false);
    };
    if (showMenu || showExportMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showMenu, showExportMenu]);

  // Debounced render — called when CM6 content changes
  const handleChange = useCallback(
    (value: string) => {
      setMarkdown(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doRender(value), 150);
    },
    [doRender]
  );
  // Keep CM6 onChange ref in sync
  handleChangeRef.current = handleChange;

  // Sync external markdown changes (undo/redo, tab switch, inline edit) → CM6
  useEffect(() => {
    cmSetDoc(markdown);
  }, [markdown, cmSetDoc]);

  // WYSIWYG: contentEditable preview → markdown source sync
  const wysiwygEditingRef = useRef(false);
  const wysiwygDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleWysiwygInput = useCallback(() => {
    wysiwygEditingRef.current = true;
    if (wysiwygDebounce.current) clearTimeout(wysiwygDebounce.current);
    wysiwygDebounce.current = setTimeout(() => {
      const article = previewRef.current?.querySelector("article");
      if (!article) return;
      // Strip copy buttons and other UI elements before converting
      const clone = article.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".code-copy-btn, .mermaid-edit-btn, .code-lang-label").forEach(el => el.remove());
      const newMd = htmlToMarkdown(clone.innerHTML);
      setMarkdown(newMd);
      cmSetDoc(newMd);
      // Reset after a tick so next render from source doesn't clobber the DOM
      setTimeout(() => { wysiwygEditingRef.current = false; }, 100);
    }, 150);
  }, [setMarkdown, cmSetDoc]);

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

  // Paste handling is now done inside useCodeMirror hook via onPaste callback

  // Share — try short URL first, fallback to hash-based
  const handleShare = useCallback(async () => {
    if (!markdown.trim()) return;
    setShareState("sharing");
    try {
      // If already shared, just copy the existing URL
      if (docId) {
        const url = `${window.location.origin}/${docId}`;
        await copyToClipboard(url);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 3000);
        return;
      }

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
  }, [markdown, title, docId]);

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
  const [updateState, setUpdateState] = useState<"idle" | "updating" | "done" | "error">("idle");
  const handleUpdate = useCallback(async () => {
    if (!docId || !markdown.trim()) return;
    const token = getEditToken(docId);
    if (!token) return;
    setUpdateState("updating");
    try {
      await updateDocument(docId, token, markdown, title);
      setUpdateState("done");
      setTimeout(() => setUpdateState("idle"), 3000);
    } catch {
      setUpdateState("error");
      setTimeout(() => setUpdateState("idle"), 3000);
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
      if (e.key === "Escape") {
        cmFocus();
      }
      // WYSIWYG shortcuts — only when editing in preview (contentEditable)
      const inPreview = document.activeElement?.closest("article.mdcore-rendered");
      if (inPreview && mod) {
        if (e.key === "b") {
          e.preventDefault();
          document.execCommand("bold");
        }
        if (e.key === "i") {
          e.preventDefault();
          document.execCommand("italic");
        }
        if (e.key === "k") {
          e.preventDefault();
          const url = prompt("URL:");
          if (url) document.execCommand("createLink", false, url);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleShare, handleCopyHtml, undo, redo]);

  // Insert special blocks (table, code, math, mermaid)
  const handleInsertTable = useCallback((cols: number, rows: number) => {
    const md = markdownRef.current;
    const suffix = md.endsWith("\n") ? "\n" : "\n\n";
    const header = "| " + Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ") + " |";
    const separator = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
    const row = "| " + Array.from({ length: cols }, () => "cell").join(" | ") + " |";
    const tableRows = Array.from({ length: rows }, () => row).join("\n");
    const newMd = md + `${suffix}${header}\n${separator}\n${tableRows}\n`;
    setMarkdown(newMd);
    doRender(newMd);
  }, [doRender, setMarkdown]);

  const handleInsertBlock = useCallback((type: "code" | "math" | "mermaid") => {
    const md = markdownRef.current;
    const suffix = md.endsWith("\n") ? "\n" : "\n\n";
    let insert = "";

    switch (type) {
      case "code":
        // Insert code block with placeholder — double-click to edit in modal
        insert = `${suffix}\`\`\`\ncode here\n\`\`\`\n`;
        break;
      case "math":
        setInitialMath("");
        setShowMathModal(true);
        return;
      case "mermaid":
        // Open visual editor with default flowchart template
        setCanvasMermaid("graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E");
        setShowMermaidModal(true);
        return;
    }

    if (insert) {
      const newMd = md + insert;
      setMarkdown(newMd);
      doRender(newMd);
    }
  }, [doRender, setMarkdown]);

  // Protect special elements from contentEditable — make them non-editable islands
  useEffect(() => {
    if (!previewRef.current) return;
    const article = previewRef.current.querySelector("article");
    if (!article) return;
    // Code blocks, mermaid, math, tables: non-editable (use double-click for special editors)
    article.querySelectorAll("pre, .mermaid-container, .mermaid-rendered, .math-rendered, .ascii-diagram, table").forEach(el => {
      (el as HTMLElement).contentEditable = "false";
    });
  }, [html]);

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
            <div className="text-4xl mb-3 opacity-60">•</div>
            <p className="text-lg font-medium" style={{ color: "var(--accent)" }}>Drop your .md file</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Supports .md, .markdown, .txt</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 backdrop-blur-sm relative"
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
            <button
              className="text-xs sm:text-sm pl-2 sm:pl-3 hidden sm:inline hover:text-[var(--accent)] transition-colors"
              style={{ color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}
              onClick={() => {
                const newName = prompt("Document name:", title);
                if (newName !== null && newName.trim()) {
                  const trimmed = newName.trim();
                  setTitle(trimmed);
                  setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: trimmed } : t));
                  const md = markdownRef.current;
                  const lines = md.split("\n");
                  const h1Idx = lines.findIndex(l => /^#\s+/.test(l));
                  if (h1Idx >= 0) { lines[h1Idx] = `# ${trimmed}`; }
                  else { lines.unshift(`# ${trimmed}`, ""); }
                  const newMd = lines.join("\n");
                  setMarkdown(newMd);
                  doRender(newMd);
                }
              }}
              title="Click to rename"
            >
              {title}
            </button>
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

        {/* Center: Layout toggle */}
        <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {([
            { mode: "preview" as ViewMode, tip: "Beautified MD only", icon: (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x=".5" y=".5" width="15" height="11" rx="1.5"/>
                <line x1="4" y1="3.5" x2="12" y2="3.5" strokeWidth=".8"/><line x1="4" y1="6" x2="10" y2="6" strokeWidth=".8"/><line x1="4" y1="8.5" x2="11" y2="8.5" strokeWidth=".8"/>
              </svg>
            )},
            { mode: "split" as ViewMode, tip: "Beautified + Source (Cmd+\\)", icon: (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x=".5" y=".5" width="15" height="11" rx="1.5"/>
                <line x1="9.5" y1="1" x2="9.5" y2="11"/>
                <line x1="3" y1="4" x2="7" y2="4" strokeWidth=".8"/><line x1="3" y1="6" x2="6" y2="6" strokeWidth=".8"/><line x1="3" y1="8" x2="7.5" y2="8" strokeWidth=".8"/>
              </svg>
            )},
            { mode: "editor" as ViewMode, tip: "Source MD only", icon: (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x=".5" y=".5" width="15" height="11" rx="1.5"/>
                <path d="M4 4l-1.5 2L4 8M12 4l1.5 2L12 8M7 9l2-6" strokeWidth=".9" strokeLinecap="round"/>
              </svg>
            )},
          ]).map(({ mode, tip, icon }) => (
            <div key={mode} className="relative group">
              <button
                onClick={() => setViewMode(mode)}
                className="p-1 rounded transition-colors"
                style={{ color: viewMode === mode ? "var(--accent)" : "var(--text-muted)", opacity: viewMode === mode ? 1 : 0.7 }}
              >
                {icon}
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                {tip}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">

          {/* AI Render moved to Beautified MD panel header */}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="px-2 h-6 rounded-md transition-colors text-[11px] flex items-center"
            style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              {theme === "dark"
                ? <><circle cx="8" cy="8" r="3.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 3.4l1-1"/></>
                : <path d="M13.5 8.5a5.5 5.5 0 01-6-6 5.5 5.5 0 106 6z"/>
              }
            </svg>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isOwner && docId ? (
              <div className="relative group">
                <button
                  onClick={handleUpdate}
                  disabled={updateState === "updating"}
                  className="px-2 sm:px-2.5 h-6 rounded-md font-mono transition-colors text-[11px] sm:text-xs flex items-center gap-1"
                  style={{
                    background: updateState === "done" ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.15)",
                    color: updateState === "done" ? "#4ade80" : "#60a5fa",
                  }}
                >
                  {updateState === "updating" ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/></svg>
                  ) : updateState === "done" ? "Updated!" : "Update"}
                </button>
                <div className="absolute top-full mt-1.5 right-0 w-48 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                  <p style={{ color: "#60a5fa", fontWeight: 600, marginBottom: 4 }}>Update</p>
                  <p>Push your latest changes to the same shared URL. Anyone with the link will see the updated version.</p>
                </div>
              </div>
            ) : null}
            <div className="relative group">
              <button
                onClick={handleShare}
                disabled={shareState === "sharing"}
                className="px-2 sm:px-2.5 h-6 rounded-md font-mono transition-colors text-[11px] sm:text-xs flex items-center gap-1"
                style={{
                  background: shareState === "copied" ? "rgba(34, 197, 94, 0.2)" : "var(--accent-dim)",
                  color: shareState === "copied" ? "#4ade80" : "var(--accent)",
                }}
              >
                {shareState === "sharing" ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/></svg>
                ) : shareButtonLabel}
              </button>
              <div className="absolute top-full mt-1.5 right-0 w-48 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                {docId ? (
                  <>
                    <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>Copy Link</p>
                    <p>Copy the shared URL to clipboard again. The link stays the same — use Update to push changes.</p>
                  </>
                ) : (
                  <>
                    <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>Share</p>
                    <p>Create a short URL for this document. The link is copied to clipboard automatically. <span style={{ color: "var(--text-faint)" }}>Cmd+S</span></p>
                  </>
                )}
              </div>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-1.5 h-6 rounded-md transition-colors flex items-center"
                style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/>
                </svg>
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
                    <button
                      onClick={() => { setInitialMath(undefined); setShowMathModal(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      New Math Equation
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

          {/* Engine badge moved to footer */}
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
            <span style={{ color: "var(--accent)" }}>MD Files</span>
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
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0">
                  <path d="M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/>
                  <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round"/>
                </svg>
                <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id });
                  }}
                  className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)", padding: "2px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/></svg>
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
          const renderPane = splitContainerRef.current.querySelector("[data-pane='render']") as HTMLElement;
          if (renderPane) {
            if (isMobile) {
              renderPane.style.height = `${pct}%`;
            } else {
              renderPane.style.width = `${pct}%`;
            }
          }
        }}
        onMouseUp={() => { isDraggingSplit.current = false; }}
        onMouseLeave={() => { isDraggingSplit.current = false; }}
      >
        {/* Render pane (left/top) */}
        {viewMode !== "editor" && (
          <div
            data-pane="render"
            className="flex flex-col min-w-0"
            style={{
              background: "var(--background)",
              width: viewMode === "split" && !isMobile ? `${splitPercentRef.current}%` : "100%",
              height: viewMode === "split" && isMobile ? `${splitPercentRef.current}%` : undefined,
              flexShrink: 0,
            }}
          >
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span style={{ color: "var(--accent)" }}>Beautified MD</span>
              <div className="flex items-center gap-2 normal-case">
                {isSharedDoc && (
                  <button onClick={handleEditShared} className="transition-colors" style={{ color: "var(--accent)", opacity: 0.7 }}>Edit →</button>
                )}
                {/* AI ASCII Render — mini toggle + hover tooltip */}
                <div className="relative group hidden sm:block">
                  <button
                    onClick={toggleDiagramMode}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
                    style={{ background: diagramMode === "ai" ? "var(--accent-dim)" : "var(--toggle-bg)", color: diagramMode === "ai" ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <span className="text-[10px] font-medium">AI ASCII Render</span>
                    <span className="relative inline-flex items-center" style={{ width: 20, height: 11 }}>
                      <span className="absolute inset-0 rounded-full transition-colors" style={{ background: diagramMode === "ai" ? "var(--accent)" : "var(--text-faint)", opacity: diagramMode === "ai" ? 1 : 0.3 }} />
                      <span className="absolute rounded-full transition-transform" style={{ width: 7, height: 7, top: 2, background: "#fff", transform: diagramMode === "ai" ? "translateX(11px)" : "translateX(2px)" }} />
                    </span>
                  </button>
                  <div className="absolute top-full right-0 mt-1 w-52 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    {diagramMode === "ai" ? (
                      <><p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>AI ASCII Render ON</p><p>ASCII art diagrams are automatically converted to styled visuals using AI (Gemini).</p></>
                    ) : (
                      <><p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>AI ASCII Render OFF</p><p>ASCII art shows as monospace text. Turn on to auto-convert box-drawing diagrams.</p></>
                    )}
                  </div>
                </div>
                {/* Export dropdown */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowExportMenu(prev => !prev)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 10v3h10v-3M8 2v8M5 7l3 3 3-3"/></svg>
                    <span className="text-[10px] font-medium">Export</span>
                  </button>
                  {showExportMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 rounded-lg shadow-xl py-1 z-50"
                      style={{ background: "var(--menu-bg)", border: "1px solid var(--border)" }}>
                      <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Export</div>
                      <button onClick={() => { handleExportPdf(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>PDF (Print)</button>
                      <div className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />
                      <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Copy as</div>
                      <button onClick={() => { handleCopyHtml(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>HTML</button>
                      <button onClick={() => { handleCopyRichText(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>Google Docs / Email</button>
                      <button onClick={() => { handleCopySlack(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>Slack</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* WYSIWYG Formatting Toolbar */}
            <WysiwygToolbar onInsert={handleInsertBlock} onInsertTable={handleInsertTable} />
            <div className="flex-1 overflow-auto" ref={previewRef}>
              <FloatingToolbar containerRef={previewRef} />
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
                    if (el && el.getAttribute("data-html-hash") !== String(html.length)) {
                      // Only update if change came from source (not from contentEditable editing)
                      if (!wysiwygEditingRef.current) {
                        el.innerHTML = html;
                      }
                      el.setAttribute("data-html-hash", String(html.length));
                    }
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleWysiwygInput}
                  className={`mdcore-rendered max-w-none focus:outline-none ${
                    viewMode === "preview"
                      ? "p-4 sm:p-8 mx-auto max-w-3xl"
                      : "p-3 sm:p-6"
                  }`}
                  style={{ cursor: "text" }}
                />
              ) : (
                <article
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleWysiwygInput}
                  className={`mdcore-rendered max-w-none focus:outline-none ${
                    viewMode === "preview"
                      ? "p-4 sm:p-8 mx-auto max-w-3xl"
                      : "p-3 sm:p-6"
                  }`}
                  style={{ cursor: "text", minHeight: "100%" }}
                  data-placeholder="true"
                >
                  <p style={{ color: "var(--text-faint)" }}>Start typing here...</p>
                </article>
              )}
            </div>
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

        {/* Markdown pane (right/bottom) */}
        {viewMode !== "preview" && (
          <div
            data-pane="editor"
            className="flex-1 min-w-0 flex flex-col"
          >
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--accent)" }}>Source MD</span>
                {/* Syntax badges */}
                <span className="hidden sm:inline px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{flavor}</span>
                {Object.entries(flavorDetails).filter(([,v])=>v).map(([key]) => (
                  <span key={key} className="hidden sm:inline px-1 py-0.5 rounded font-mono" style={{ background: "var(--badge-muted-bg)", color: "var(--badge-muted-color)" }}>+{key}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 normal-case">
                {/* Copy MD */}
                <div className="relative group">
                  <button
                    onClick={() => { navigator.clipboard.writeText(markdownRef.current); }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg>
                    <span className="text-[10px] font-medium">Copy</span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>Copy raw Markdown</div>
                </div>
                {/* Download .md */}
                <div className="relative group">
                  <button
                    onClick={handleDownloadMd}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"/></svg>
                    <span className="text-[10px] font-medium">.md</span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>Download as .md file</div>
                </div>
              </div>
            </div>
            <div
              ref={editorContainerRef}
              className="flex-1 min-h-0 overflow-hidden"
            />
          </div>
        )}
      </div>
      </div>{/* end main content wrapper */}

      {/* Footer — Left: Help + links, Right: stats + badges */}
      <footer
        className="flex items-center justify-between px-3 sm:px-5 py-1.5 text-[10px] font-mono"
        style={{ borderTop: "1px solid var(--border-dim)", color: "var(--text-muted)" }}
      >
        {/* Left: Help + navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative group">
            <button className="transition-colors" style={{ color: "var(--text-muted)" }}>Help</button>
            <div className="absolute bottom-full left-0 mb-1 w-56 p-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
              <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Keyboard Shortcuts</p>
              <div className="space-y-1 text-[10px]">
                {[
                  ["Cmd+B", "Bold"],
                  ["Cmd+I", "Italic"],
                  ["Cmd+K", "Insert link"],
                  ["Cmd+S", "Share / copy URL"],
                  ["Cmd+Shift+C", "Copy as HTML"],
                  ["Cmd+Z", "Undo"],
                  ["Cmd+Shift+Z", "Redo"],
                  ["Cmd+\\", "Toggle view mode"],
                  ["Escape", "Focus markdown editor"],
                  ["Dbl-click code", "Edit code block"],
                  ["Dbl-click math", "Edit equation"],
                  ["Dbl-click diagram", "Edit diagram"],
                  ["Dbl-click table", "Edit cell"],
                ].map(([key, desc]) => (
                  <div key={key} className="flex justify-between">
                    <span style={{ color: "var(--text-faint)" }}>{key}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <a href="/about" className="transition-colors" style={{ color: "var(--text-muted)" }}>About</a>
          <a href="https://github.com/raymindai/mdcore" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://mdcore.ai" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer">mdcore.ai</a>
        </div>
        {/* Right: stats + engine badges */}
        <div className="flex items-center gap-3 shrink-0">
          <span>{charCount.toLocaleString()} chars</span>
          <div className="relative group hidden sm:block">
            <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{flavor}</span>
            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              Detected Markdown flavor: {flavor}
            </div>
          </div>
          <div className="relative group hidden sm:block">
            <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>RUST+WASM</span>
            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              Rendered by mdcore engine (comrak, Rust compiled to WebAssembly)
            </div>
          </div>
          <div className="relative group hidden sm:block">
            <span className="flex items-center gap-0.5" style={{ color: "var(--accent)" }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z"/></svg>
              {renderTime.toFixed(0)}ms
            </span>
            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              WASM engine render time
            </div>
          </div>
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
            { label: "Rename", action: () => {
              const tab = tabs.find(t => t.id === docContextMenu.tabId);
              if (!tab) return;
              const newName = prompt("Document name:", tab.title);
              if (newName !== null && newName.trim()) {
                const trimmed = newName.trim();
                setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: trimmed } : t));
                // If active tab, also update the markdown H1 heading
                if (tab.id === activeTabId) {
                  const md = markdownRef.current;
                  const lines = md.split("\n");
                  const h1Idx = lines.findIndex(l => /^#\s+/.test(l));
                  if (h1Idx >= 0) {
                    lines[h1Idx] = `# ${trimmed}`;
                  } else {
                    lines.unshift(`# ${trimmed}`, "");
                  }
                  const newMd = lines.join("\n");
                  setMarkdown(newMd);
                  doRender(newMd);
                  setTitle(trimmed);
                }
              }
            }},
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
          onClick={(e) => { if (e.target === e.currentTarget) { setShowMermaidModal(false); setCanvasMermaid(undefined); } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setShowMermaidModal(false); setCanvasMermaid(undefined); } }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div
            className="flex flex-col"
            onClick={(e) => e.stopPropagation()}
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
            {/* Diagram type selector */}
            <div className="flex items-center gap-1 px-3 py-2 text-[11px] shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <span className="mr-2 font-medium" style={{ color: "var(--text-muted)" }}>Type:</span>
              {[
                { label: "Flowchart", code: "graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E" },
                { label: "Sequence", code: "sequenceDiagram\n    participant A as User\n    participant B as System\n    A->>B: Request\n    B-->>A: Response" },
                { label: "Pie", code: "pie title Distribution\n    \"A\" : 40\n    \"B\" : 30\n    \"C\" : 30" },
                { label: "Mindmap", code: "mindmap\n  root((Topic))\n    Branch 1\n      Sub 1\n    Branch 2\n      Sub 2" },
                { label: "Timeline", code: "timeline\n    title Timeline\n    2024 : Phase 1\n    2025 : Phase 2\n    2026 : Phase 3" },
                { label: "Class", code: "classDiagram\n    class Animal {\n        +String name\n        +move()\n    }\n    class Dog {\n        +bark()\n    }\n    Animal <|-- Dog" },
                { label: "State", code: "stateDiagram-v2\n    [*] --> Idle\n    Idle --> Active: start\n    Active --> Idle: stop\n    Active --> [*]: done" },
                { label: "ER", code: "erDiagram\n    USER ||--o{ ORDER : places\n    ORDER ||--|{ LINE_ITEM : contains" },
              ].map(({ label, code }) => (
                <button
                  key={label}
                  onClick={() => setCanvasMermaid(code)}
                  className="px-2 py-1 rounded-md transition-colors"
                  style={{
                    background: canvasMermaid?.startsWith(code.split("\n")[0]) ? "var(--accent-dim)" : "var(--toggle-bg)",
                    color: canvasMermaid?.startsWith(code.split("\n")[0]) ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
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

      {/* Math Editor Modal */}
      {showMathModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowMathModal(false); setInitialMath(undefined); } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setShowMathModal(false); setInitialMath(undefined); } }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div
            className="flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
              width: "95vw",
              height: "80vh",
              maxWidth: "1200px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <MathEditor
              initialMath={initialMath}
              onCancel={() => {
                setShowMathModal(false);
                setInitialMath(undefined);
              }}
              onGenerate={(md) => {
                const newMarkdown = markdown ? markdown + "\n\n" + md : md;
                setMarkdown(newMarkdown);
                doRender(newMarkdown);
                setInitialMath(undefined);
                setShowMathModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
