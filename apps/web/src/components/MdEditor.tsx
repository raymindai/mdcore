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
import ShareModal from "@/components/ShareModal";
import { importFile, getSupportedAcceptString, mdfyText } from "@/lib/file-import";
import { isCliOutput, cliToMarkdown } from "@/lib/cli-to-md";
import { useAuth } from "@/lib/useAuth";
import { useAutoSave } from "@/lib/useAutoSave";
import { getAnonymousId, ensureAnonymousId, clearAnonymousId } from "@/lib/anonymous-id";
import {
  createShareUrl,
  createShortUrl,
  saveEditToken,
  getEditToken,
  updateDocument,
  deleteDocument,
  rotateEditToken,
  changeEditMode,
  extractFromUrl,
  copyToClipboard,
  fetchVersions,
  fetchVersion,
} from "@/lib/share";

// ─── Sample documents for default tabs ───

const SAMPLE_WELCOME = `# Welcome to mdfy.cc

> **The fastest way from thought to shared document.**
> Import anything. Render beautifully. Share instantly.

## Get Started

1. **Type or paste** anything — Markdown, plain text, Claude Code output
2. **Import** files — PDF, Word, PowerPoint, Excel, HTML, CSV, LaTeX, and more
3. **Edit** inline in the Beautified view, or use Source (MDFIED) for raw Markdown
4. **Share** with one click — generates a short URL like \`mdfy.cc/abc123\`

## What You Can Do

- **WYSIWYG editing** — click any text in Beautified view and start typing
- **AI mdfy** — import a PDF or paste raw text, then let AI structure it as Markdown
- **Multi-format import** — drag & drop PDF, DOCX, PPTX, XLSX, or 10+ other formats
- **Export anywhere** — download as MD/HTML/TXT, print PDF, copy for Docs/Email/Slack
- **Flavor conversion** — click the flavor badge (GFM ▾) to convert between formats
- **Folders + Trash** — organize with folders, drag to move, soft delete with restore

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘B | Bold |
| ⌘I | Italic |
| ⌘K | Insert link |
| ⌘S | Share (copy URL) |
| ⌘Z / ⌘⇧Z | Undo / Redo |
| ⌘⇧C | Copy HTML |
| ⌘\\\\ | Toggle view mode |

## Sign In for More

Sign in (sidebar bottom) to unlock cloud sync, short URLs, and AI mdfy structuring. Free forever — no credit card needed.

---

*Powered by **mdcore engine v0.1.0** — Rust + WASM*
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

const SAMPLE_IMPORT_EXPORT = `# Import & Export Guide

## Import — 13+ Formats

Drop any file onto mdfy.cc or click **IMPORT** in the sidebar.

| Format | How it works |
|--------|-------------|
| **PDF** | Server-side text extraction (max 4MB) |
| **DOCX** | Word → HTML → Markdown via mammoth |
| **PPTX / XLSX** | Office text extraction via officeparser (max 10MB) |
| **HTML** | Turndown converts to clean Markdown |
| **CSV** | Auto-converted to Markdown table |
| **LaTeX** | Sections, math, formatting → Markdown |
| **RST** | reStructuredText headings, links → Markdown |
| **RTF / JSON / XML / TXT** | Text extraction with format hints |

### AI mdfy Structuring

After importing, you'll see **"mdfy this document?"** — click **mdfy it** to let AI:

- Detect headings from context
- Rebuild lists, tables, code blocks
- Add emphasis and formatting
- Preserve all original content

> Works great for PDF imports where formatting is lost during text extraction.

## Export — Every Destination

Click the **Export** icon in the Beautified header.

### Download
- **Markdown (.md)** — raw source
- **HTML (.html)** — styled, self-contained
- **Plain Text (.txt)** — formatting stripped

### Print
- **PDF** — via browser print dialog

### Clipboard
- **Raw HTML** — for web use
- **Rich Text** — paste into Google Docs, Email, Word
- **Slack (mrkdwn)** — formatted for Slack
- **Plain Text** — no formatting
`;

const SAMPLE_FEATURES = `# Key Features

## WYSIWYG Editing

Click anywhere in the **Beautified** view to start editing. Format with the toolbar or keyboard shortcuts.

> No need to learn Markdown syntax — just type naturally.

## Flavor Detection & Conversion

mdfy.cc auto-detects your Markdown flavor:

- **GFM** — GitHub Flavored Markdown (tables, task lists, strikethrough)
- **CommonMark** — Standard, maximum compatibility
- **Obsidian** — Wikilinks, callouts, embeds
- **MDX** — Markdown + JSX components
- **Pandoc** — Citations, footnotes, definition lists

Click the **flavor badge** (e.g. \`GFM ▾\`) in the MDFIED header to convert between flavors.

## CLI Output Support

Paste output from **Claude Code** or any terminal — unicode tables and checkmarks auto-convert:

\`\`\`
┌──────────┬────────┐         | Feature  | Status |
│ Feature  │ Status │   →     |----------|--------|
├──────────┼────────┤         | Auth     | Done   |
│ Auth     │ ✅     │         | Export   | Done   |
└──────────┴────────┘
\`\`\`

## Narrow View

Toggle **NARROW** in the panel header to constrain content width for comfortable reading — like a book layout.

## Folders & Organization

- Create folders via **New Folder** at sidebar bottom
- **Drag & drop** documents between folders
- **Right-click** folders to rename or delete
- **Trash** section with restore and permanent delete
- **Sort** by newest, oldest, A→Z, Z→A
`;

/** Extract title from markdown (first # heading, or first line) */
function extractTitleFromMd(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}

const EXAMPLES_FOLDER_ID = "folder-examples";

const INITIAL_FOLDERS: Folder[] = [
  { id: EXAMPLES_FOLDER_ID, name: "Examples", collapsed: false },
];

const INITIAL_TABS: Tab[] = [
  { id: "tab-welcome", title: extractTitleFromMd(SAMPLE_WELCOME), markdown: SAMPLE_WELCOME, readonly: true },
  { id: "tab-import", title: extractTitleFromMd(SAMPLE_IMPORT_EXPORT), markdown: SAMPLE_IMPORT_EXPORT, folderId: EXAMPLES_FOLDER_ID, readonly: true },
  { id: "tab-features", title: extractTitleFromMd(SAMPLE_FEATURES), markdown: SAMPLE_FEATURES, folderId: EXAMPLES_FOLDER_ID, readonly: true },
  { id: "tab-syntax", title: extractTitleFromMd(SAMPLE_FORMATTING), markdown: SAMPLE_FORMATTING, folderId: EXAMPLES_FOLDER_ID, readonly: true },
  { id: "tab-diagrams", title: extractTitleFromMd(SAMPLE_DIAGRAMS), markdown: SAMPLE_DIAGRAMS, folderId: EXAMPLES_FOLDER_ID, readonly: true },
  { id: "tab-ascii", title: extractTitleFromMd(SAMPLE_ASCII), markdown: SAMPLE_ASCII, folderId: EXAMPLES_FOLDER_ID, readonly: true },
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

interface Folder {
  id: string;
  name: string;
  collapsed: boolean;
  section?: "my" | "shared"; // which section this folder belongs to
}

interface Tab {
  id: string;
  title: string;
  markdown: string;
  folderId?: string;       // null = root level
  cloudId?: string;        // Supabase document id
  editToken?: string;      // for token-based ownership
  deleted?: boolean;       // soft delete → trash
  deletedAt?: number;      // timestamp for auto-purge
  readonly?: boolean;      // example docs — not editable
  shared?: boolean;        // opened from shared URL (not mine)
  isDraft?: boolean;       // auto-saved but not yet published
  permission?: "mine" | "editable" | "readonly";  // for sidebar badge
}

let tabIdCounter = Date.now();

// ─── Inline Input Popup (replaces prompt()) ───
function InlineInput({ label, defaultValue, onSubmit, onCancel, position }: {
  label: string; defaultValue?: string;
  onSubmit: (value: string) => void; onCancel: () => void;
  position?: { x: number; y: number };
}) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  return (
    <div className="fixed inset-0 z-[9999]" onClick={onCancel}>
      <div
        className="absolute rounded-lg shadow-xl p-3 flex flex-col gap-2"
        style={{
          left: position?.x ?? "50%", top: position?.y ?? "50%",
          transform: position ? "translate(-50%, 0)" : "translate(-50%, -50%)",
          background: "var(--surface)", border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 280,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <label className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{label}</label>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) { onSubmit(value.trim()); }
            if (e.key === "Escape") { onCancel(); }
          }}
          className="px-3 py-1.5 rounded-md text-sm outline-none"
          style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          placeholder={label}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 text-[11px] rounded-md" style={{ color: "var(--text-muted)", background: "var(--toggle-bg)" }}>Cancel</button>
          <button onClick={() => value.trim() && onSubmit(value.trim())} className="px-3 py-1 text-[11px] rounded-md font-medium" style={{ background: "var(--accent)", color: "#000" }}>OK</button>
        </div>
      </div>
    </div>
  );
}

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
          opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      >
        {tip}
      </div>
    </div>
  );
}

// ─── WYSIWYG Fixed Toolbar (Markdown-compatible only) ───
function WysiwygToolbar({ onInsert, onInsertTable, onInputPopup, cmWrap, cmInsert, onImageUpload }: {
  onInsert: (type: "code" | "math" | "mermaid") => void;
  onInsertTable: (cols: number, rows: number) => void;
  onInputPopup: (config: { label: string; onSubmit: (v: string) => void }) => void;
  cmWrap: (prefix: string, suffix?: string) => void;
  cmInsert: (text: string) => void;
  onImageUpload: () => void;
}) {
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [blockType, setBlockType] = useState("p");
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [tableHover, setTableHover] = useState({ col: 0, row: 0 });
  const tableGridRef = useRef<HTMLDivElement>(null);

  // Close table grid on outside click
  useEffect(() => {
    if (!showTableGrid) return;
    const handler = (e: MouseEvent) => {
      if (tableGridRef.current && !tableGridRef.current.contains(e.target as Node)) {
        setShowTableGrid(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTableGrid]);

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

  // Detect if focus is in SOURCE MD (CM6) or BEAUTIFIED MD (contentEditable)
  const isInCM6 = () => !!document.activeElement?.closest(".cm-editor");

  // Smart exec: routes to execCommand (Beautified) or CM6 wrap (Source)
  const exec = (cmd: string, value?: string) => {
    if (isInCM6()) {
      const mdMap: Record<string, [string, string?]> = {
        bold: ["**"],
        italic: ["*"],
        strikeThrough: ["~~"],
        insertUnorderedList: ["- "],
        insertOrderedList: ["1. "],
      };
      if (cmd === "createLink" && value) {
        cmWrap("[", `](${value})`);
      } else if (cmd === "insertImage" && value) {
        cmWrap("![", `](${value})`);
      } else {
        const wrap = mdMap[cmd];
        if (wrap) {
          if (cmd === "insertUnorderedList" || cmd === "insertOrderedList") {
            cmInsert(wrap[0]);
          } else {
            cmWrap(wrap[0], wrap[1]);
          }
        }
      }
    } else {
      document.execCommand(cmd, false, value);
    }
  };

  const fmtBlock = (tag: string) => {
    if (isInCM6()) {
      const prefixMap: Record<string, string> = {
        h1: "# ", h2: "## ", h3: "### ", h4: "#### ", h5: "##### ", h6: "###### ",
        p: "", blockquote: "> ",
      };
      const prefix = prefixMap[tag];
      if (prefix !== undefined) cmInsert(prefix);
    } else {
      document.execCommand("formatBlock", false, tag);
    }
  };

  const wrapCode = () => {
    if (isInCM6()) {
      cmWrap("`");
    } else {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      try { sel.getRangeAt(0).surroundContents(document.createElement("code")); } catch { /* */ }
    }
  };

  const sep = <div className="w-px h-5 shrink-0 mx-0.5" style={{ background: "var(--border-dim)" }} />;
  const I = 14;

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-0.5 px-2 py-0.5 shrink-0 relative z-[90]"
      style={{ borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Undo (Cmd+Z)" onClick={() => exec("undo")}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7h7a3 3 0 010 6H8"/><path d="M6 4L3 7l3 3"/></svg>
        </TBtn>
        <TBtn tip="Redo (Cmd+Shift+Z)" onClick={() => exec("redo")}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 7H6a3 3 0 000 6h2"/><path d="M10 4l3 3-3 3"/></svg>
        </TBtn>
      </div>
      {sep}
      {/* Headings */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Heading 1" active={blockType==="h1"} onClick={() => fmtBlock("h1")}><span className="text-[10px] font-bold">H1</span></TBtn>
        <TBtn tip="Heading 2" active={blockType==="h2"} onClick={() => fmtBlock("h2")}><span className="text-[10px] font-bold">H2</span></TBtn>
        <TBtn tip="Heading 3" active={blockType==="h3"} onClick={() => fmtBlock("h3")}><span className="text-[10px] font-semibold">H3</span></TBtn>
        <TBtn tip="Heading 4" active={blockType==="h4"} onClick={() => fmtBlock("h4")}><span className="text-[10px]">H4</span></TBtn>
        <TBtn tip="Heading 5" active={blockType==="h5"} onClick={() => fmtBlock("h5")}><span className="text-[10px]">H5</span></TBtn>
        <TBtn tip="Heading 6" active={blockType==="h6"} onClick={() => fmtBlock("h6")}><span className="text-[10px]">H6</span></TBtn>
        <TBtn tip="Paragraph" active={blockType==="p"} onClick={() => fmtBlock("p")}><span className="text-[10px]">P</span></TBtn>
      </div>
      {sep}
      {/* Text style */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Bold (Cmd+B) → **text**" active={active.bold} onClick={() => exec("bold")}><span className="font-bold text-[12px]">B</span></TBtn>
        <TBtn tip="Italic (Cmd+I) → *text*" active={active.italic} onClick={() => exec("italic")}><span className="italic text-[12px]">I</span></TBtn>
        <TBtn tip="Strikethrough → ~~text~~" active={active.strikethrough} onClick={() => exec("strikeThrough")}><span className="line-through text-[12px]">S</span></TBtn>
        <TBtn tip="Inline code → `code`" active={active.code} onClick={wrapCode}><span className="font-mono text-[10px]">{`</>`}</span></TBtn>
      </div>
      {sep}
      {/* Lists */}
      <div className="flex items-center gap-0.5 shrink-0">
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
      </div>
      {sep}
      {/* Block elements */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Blockquote → > text" active={blockType==="blockquote"} onClick={() => fmtBlock("blockquote")}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h4v4H5.5L4 10H3V3zm6 0h4v4h-1.5L10 10H9V3z"/></svg>
        </TBtn>
        <TBtn tip="Horizontal rule → ---" onClick={() => exec("insertHorizontalRule")}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="8" x2="14" y2="8"/></svg>
        </TBtn>
      </div>
      {sep}
      {/* Insert */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Link (Cmd+K) → [text](url)" onClick={() => onInputPopup({ label: "URL", onSubmit: (u) => exec("createLink", u) })}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 9l2-2"/><rect x="1" y="7" width="5" height="5" rx="1.5" transform="rotate(-45 3.5 9.5)"/><rect x="7" y="1" width="5" height="5" rx="1.5" transform="rotate(-45 9.5 3.5)"/></svg>
        </TBtn>
        <TBtn tip="Upload image" onClick={() => onImageUpload()}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M2 11l3.5-3 2.5 2 3-2.5L14 11" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </TBtn>
        <TBtn tip="Clear formatting" onClick={() => exec("removeFormat")}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 13h10M6 3l-2.5 7h9L10 3"/><line x1="4" y1="8" x2="12" y2="8"/></svg>
        </TBtn>
      </div>
      {sep}
      {/* Insert */}
      <div className="flex items-center gap-0.5 shrink-0">
      <div className="relative" ref={tableGridRef}>
        <TBtn tip="Insert table" onClick={() => setShowTableGrid(v => !v)}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>
        </TBtn>
        {showTableGrid && (
          <div className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-xl z-[9998]"
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
    </div>
  );
}

export default function MdEditor() {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading: authLoading, isAuthenticated, signInWithGoogle, signInWithGitHub, signInWithEmail, signOut } = useAuth();
  // Only use anonymousId when not logged in
  const anonymousId = (!user?.id && typeof window !== "undefined") ? getAnonymousId() : "";
  const autoSave = useAutoSave({ debounceMs: 2500 });
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [authEmailInput, setAuthEmailInput] = useState("");
  const [authEmailSent, setAuthEmailSent] = useState(false);
  const [folders, setFolders] = useState<Folder[]>(() => {
    if (typeof window === "undefined") return INITIAL_FOLDERS;
    try { const s = localStorage.getItem("mdfy-folders"); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; } } catch { /* */ }
    return INITIAL_FOLDERS;
  });
  const [showTrash, setShowTrash] = useState(false);
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  // Cloud docs section removed — all docs auto-save to cloud
  const [recentDocs, setRecentDocs] = useState<{ id: string; title: string; visitedAt: string; isOwner: boolean; editMode: string }[]>([]);
  const [showMyDocs, setShowMyDocs] = useState(true);
  const [showSharedDocs, setShowSharedDocs] = useState(true);
  const [serverDocs, setServerDocs] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [allowedEmails, setAllowedEmailsState] = useState<string[]>([]);
  const [allowedEditors, setAllowedEditorsState] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; type: string; documentId: string; documentTitle: string; fromUserName: string; message: string; read: boolean; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mdfyPrompt, setMdfyPrompt] = useState<{ text: string; filename: string; tabId: string } | null>(null);
  const [mdfyLoading, setMdfyLoading] = useState(false);
  const [showFlavorMenu, setShowFlavorMenu] = useState(false);

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

  // Tab system — persist to localStorage (version check to refresh samples)
  const TABS_VERSION = "6";
  const [tabs, setTabs] = useState<Tab[]>(() => {
    if (typeof window === "undefined") return INITIAL_TABS;
    try {
      const ver = localStorage.getItem("mdfy-tabs-version");
      if (ver === TABS_VERSION) {
        const saved = localStorage.getItem("mdfy-tabs");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Deduplicate by ID
            const seen = new Set<string>();
            const deduped = parsed.filter((t: Tab) => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
            return deduped;
          }
        }
      } else {
        // New version — reset to show updated samples
        localStorage.setItem("mdfy-tabs-version", TABS_VERSION);
        localStorage.removeItem("mdfy-tabs");
        localStorage.removeItem("mdfy-folders");
        localStorage.removeItem("mdfy-active-tab");
      }
    } catch { /* ignore */ }
    return INITIAL_TABS;
  });
  const [activeTabId, setActiveTabId] = useState(() => {
    if (typeof window === "undefined") return "tab-welcome";
    return localStorage.getItem("mdfy-active-tab") || tabs[0]?.id || "tab-welcome";
  });
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const initialMd = activeTab?.markdown || SAMPLE_WELCOME;
  const [markdown, setMarkdownRaw] = useState(initialMd);
  const undoStack = useRef<string[]>([initialMd]);
  const redoStack = useRef<string[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Persist tabs + folders + active tab to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const updatedTabs = tabs.map(t => t.id === activeTabId ? { ...t, markdown } : t);
        localStorage.setItem("mdfy-tabs", JSON.stringify(updatedTabs));
        localStorage.setItem("mdfy-active-tab", activeTabId);
        localStorage.setItem("mdfy-folders", JSON.stringify(folders));
      } catch {
        // Quota exceeded — try saving without markdown bodies for cloud-synced tabs
        try {
          const lightTabs = tabs.map(t => {
            if (t.cloudId) {
              // Cloud-synced: strip markdown body (will reload from server)
              return { ...t, markdown: "" };
            }
            return t.id === activeTabId ? { ...t, markdown } : t;
          });
          localStorage.setItem("mdfy-tabs", JSON.stringify(lightTabs));
          localStorage.setItem("mdfy-active-tab", activeTabId);
          localStorage.setItem("mdfy-folders", JSON.stringify(folders));
        } catch { /* truly out of space */ }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, markdown, folders]);

  // Wrapper that tracks undo history + triggers auto-save
  const setMarkdown = useCallback((val: string) => {
    setMarkdownRaw(val);
    // Debounce undo snapshots (don't save every keystroke)
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      const last = undoStack.current[undoStack.current.length - 1];
      if (val !== last) {
        undoStack.current.push(val);
        if (undoStack.current.length > 100) undoStack.current.shift();
        redoStack.current = [];
      }
    }, 500);

    // Auto-save to server if document has a cloudId
    const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
    if (currentTab?.cloudId && !currentTab.readonly && !currentTab.deleted) {
      // Create session snapshot on first edit
      maybeCreateSessionSnapshot(currentTab.cloudId);
      autoSave.scheduleSave({
        cloudId: currentTab.cloudId,
        markdown: val,
        title: currentTab.title,
        userId: user?.id,
        anonymousId,
        editToken: currentTab.editToken,
      });
    }
  }, [tabs, user?.id, anonymousId, autoSave]);

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
  const [wordCount, setWordCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [shareState, setShareState] = useState<
    "idle" | "sharing" | "copied" | "error"
  >("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isSharedDoc, setIsSharedDoc] = useState(false); // opened from URL — read-only unless owner
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [narrowView, setNarrowView] = useState(false);
  const [narrowSource, setNarrowSource] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [inlineInput, setInlineInput] = useState<{ label: string; defaultValue?: string; onSubmit: (v: string) => void; position?: { x: number; y: number } } | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [docEditMode, setDocEditMode] = useState<"owner" | "account" | "token" | "view" | "public">("token");
  // Can edit: not shared, or owner, or public doc
  const [isEditor, setIsEditor] = useState(false);
  // view/owner mode: only owner + allowed editors. public mode: anyone can edit.
  const canEdit = !isSharedDoc || isOwner || isEditor || docEditMode === "public";
  const [showQr, setShowQr] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [canvasMermaid, setCanvasMermaid] = useState<string | undefined>();
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  // History panel state
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<{ id: number; version_number: number; title: string | null; created_at: string; change_summary: string | null; markdown?: string }[]>([]);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  // Permission / edit mode state
  const [editMode, setEditMode] = useState<"owner" | "account" | "token" | "view" | "public">("owner");
  const [showEditModeMenu, setShowEditModeMenu] = useState(false);
  const [initialMath, setInitialMath] = useState<string | undefined>();
  const mathOriginalRef = useRef<string | null>(null); // original MD syntax for replacement
  const [showMathModal, setShowMathModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const isDraggingSidebar = useRef(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [docContextMenu, setDocContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folderId: string; confirmDelete?: boolean } | null>(null);
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [renderPaneNarrow, setRenderPaneNarrow] = useState(false);
  const [renderPaneUnderNarrowWidth, setRenderPaneUnderNarrowWidth] = useState(false);
  const [editorPaneNarrow, setEditorPaneNarrow] = useState(false);
  const [editorPaneUnderNarrowWidth, setEditorPaneUnderNarrowWidth] = useState(false);
  const splitPercentRef = useRef(60);
  const isDraggingSplit = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  // ─── Image upload helper ───
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      setShowAuthMenu(true);
      return null;
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "x-user-id": user.id },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload failed" }));
      if (err.requiresAuth) setShowAuthMenu(true);
      return null;
    }
    const { url } = await res.json();
    return url;
  }, [user]);

  // CodeMirror 6 editor — replaces plain textarea
  const handleChangeRef = useRef<(value: string) => void>(() => {});
  const handlePasteForCM = useCallback((text: string, html: string): string | null => {
    if (html && isHtmlContent(html)) {
      return htmlToMarkdown(html);
    }
    if (text && !html && isHtmlContent(text)) {
      return htmlToMarkdown(text);
    }
    // Detect CLI/terminal output and convert to markdown
    if (text && isCliOutput(text)) {
      return cliToMarkdown(text);
    }
    return null;
  }, []);
  const cmSetDocRef = useRef<((doc: string) => void) | null>(null);
  const markdownForImageRef = useRef(markdown);
  markdownForImageRef.current = markdown;
  const handlePasteImageForCM = useCallback(async (file: File) => {
    const placeholder = `![Uploading ${file.name}...]()\n`;
    const withPlaceholder = markdownForImageRef.current + placeholder;
    setMarkdown(withPlaceholder);
    doRenderRef.current(withPlaceholder);
    cmSetDocRef.current?.(withPlaceholder);
    const url = await uploadImage(file);
    const current = markdownForImageRef.current;
    if (url) {
      const updated = current.replace(placeholder, `![${file.name}](${url})\n`);
      setMarkdown(updated);
      doRenderRef.current(updated);
      cmSetDocRef.current?.(updated);
    } else {
      const updated = current.replace(placeholder, "");
      setMarkdown(updated);
      doRenderRef.current(updated);
      cmSetDocRef.current?.(updated);
    }
  }, [uploadImage, setMarkdown]);
  const {
    containerRef: editorContainerRef,
    focus: cmFocus,
    setDoc: cmSetDoc,
    scrollToLine: cmScrollToLine,
    setSelection: cmSetSelection,
    refresh: cmRefresh,
    wrapSelection: cmWrapSelection,
    insertAtCursor: cmInsertAtCursor,
  } = useCodeMirror({
    initialDoc: markdown,
    onChange: (value: string) => handleChangeRef.current(value),
    onPaste: handlePasteForCM,
    onPasteImage: handlePasteImageForCM,
    theme,
    placeholder: "Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything...",
  });
  cmSetDocRef.current = cmSetDoc;
  const menuRef = useRef<HTMLDivElement>(null);

  // Set default view mode based on screen size
  useEffect(() => {
    if (isMobile) {
      setViewMode("split"); // vertical split on mobile
    }
  }, [isMobile]);

  // Refresh CM6 when editor pane becomes visible
  useEffect(() => {
    if (viewMode !== "preview") {
      requestAnimationFrame(() => cmRefresh());
    }
  }, [viewMode, cmRefresh]);

  // Track pane widths for responsive button labels
  useEffect(() => {
    const container = splitContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const w = entry.contentRect.width;
        if (el.dataset.pane === "render") { setRenderPaneNarrow(w < 500); setRenderPaneUnderNarrowWidth(w < 768); }
        if (el.dataset.pane === "editor") { setEditorPaneNarrow(w < 500); setEditorPaneUnderNarrowWidth(w < 768); }
      }
    });
    // Observe both panes directly
    const renderPane = container.querySelector('[data-pane="render"]');
    const editorPane = container.querySelector('[data-pane="editor"]');
    if (renderPane) observer.observe(renderPane);
    if (editorPane) observer.observe(editorPane);
    // Also observe container for full-width mode changes
    observer.observe(container);
    return () => observer.disconnect();
  }, [viewMode]);

  const renderIdRef = useRef(0);
  const doRender = useCallback(async (md: string) => {
    const thisRender = ++renderIdRef.current;
    setIsLoading(true);
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
      setWordCount(md.trim() ? md.trim().split(/\s+/).length : 0);
      setLineCount(md.split("\n").length);
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
  const loadTab = useCallback((tab: Tab) => {
    setActiveTabId(tab.id);
    setMarkdownRaw(tab.markdown);
    setHtml("");
    undoStack.current = [tab.markdown];
    redoStack.current = [];
    doRenderRef.current(tab.markdown);
    // Update permission + doc state based on tab
    setDocId(tab.cloudId || null);
    setIsSharedDoc(tab.permission === "readonly" || tab.permission === "editable");
    setIsOwner(tab.permission === "mine" || !tab.permission);
    setIsEditor(tab.permission === "editable");
    // Reset share modal state for the new tab (will be loaded when modal opens)
    setAllowedEmailsState([]);
    setAllowedEditorsState([]);
    // Update browser URL to reflect current document
    if (tab.cloudId) {
      window.history.replaceState(null, "", `/?doc=${tab.cloudId}`);
    } else {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  const switchTab = useCallback((tabId: string) => {
    // Use refs to get current values (avoid stale closures)
    const currentMd = markdownRef.current;
    const currentTabId = activeTabIdRef.current;

    setTabs((prev) => {
      // Save current tab
      const saved = prev.map((t) => {
        if (t.id !== currentTabId || t.readonly) return t;
        const derivedTitle = extractTitleFromMd(currentMd) || t.title || "Untitled";
        return { ...t, markdown: currentMd, title: derivedTitle };
      });
      // Load target tab
      const target = saved.find((t) => t.id === tabId);
      if (target) {
        // Use queueMicrotask to ensure setTabs finishes first
        queueMicrotask(() => loadTab(target));
      }
      return saved;
    });
  }, [loadTab]);

  const addTab = useCallback(async () => {
    const currentMd = markdownRef.current;
    const currentTabId = activeTabIdRef.current;

    const id = `tab-${tabIdCounter++}`;
    const initialMd = "# Untitled\n\n";
    const newTab: Tab = { id, title: "Untitled", markdown: initialMd, isDraft: true, permission: "mine" };

    setTabs((prev) => {
      const saved = prev.map((t) => {
        if (t.id !== currentTabId || t.readonly) return t;
        const derivedTitle = extractTitleFromMd(currentMd) || t.title || "Untitled";
        return { ...t, markdown: currentMd, title: derivedTitle };
      });
      return [...saved, newTab];
    });

    loadTab(newTab);
    setTitle("Untitled");

    // Auto-create on server (ensure anonymous ID for non-logged-in users)
    const anonId = user?.id ? undefined : ensureAnonymousId();
    const result = await autoSave.createDocument({
      markdown: initialMd,
      title: "Untitled",
      userId: user?.id,
      anonymousId: anonId,
    });
    if (result) {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, cloudId: result.id, editToken: result.editToken } : t));
      setDocId(result.id);
      // Update URL without navigation
      window.history.replaceState(null, "", `/?doc=${result.id}`);
    }
  }, [loadTab, autoSave, user?.id, anonymousId]);

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
          toolbar.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 10px 0;flex-wrap:nowrap;opacity:0;transition:opacity 0.15s";

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

    // Clean up previous dynamically-created ASCII toolbar elements (removing them also removes their listeners)
    previewRef.current.querySelectorAll(".ascii-render-btn, .ascii-toolbar").forEach(el => el.remove());

    const asciiDiagrams = previewRef.current.querySelectorAll(".ascii-diagram");
    if (asciiDiagrams.length === 0) return;

    // Remove any leftover code-header Copy buttons from highlightCode
    asciiDiagrams.forEach(el => {
      el.querySelectorAll(".code-header, .code-copy-btn").forEach(btn => btn.remove());
    });

    asciiDiagrams.forEach((el) => {

      // Toolbar at top — always visible
      const toolbar = document.createElement("div");
      toolbar.className = "ascii-toolbar";
      toolbar.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 10px 0;flex-wrap:nowrap";

      const btn = document.createElement("button");
      btn.className = "ascii-render-btn";
      btn.textContent = "Render";
      btn.title = "Convert to visual diagram using AI (Gemini). Enable AI ASCII RENDER toggle in the header to auto-convert all ASCII diagrams.";
      btn.style.cssText = `
        padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;
        background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent);
        border-radius:4px;cursor:pointer;line-height:14px;
      `;
      toolbar.appendChild(btn);

      // Copy button — matches code block copy style
      const srcText = el.querySelector("code")?.textContent || el.textContent || "";
      const copyBtn = document.createElement("button");
      copyBtn.title = "Copy ASCII source";
      copyBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg><span style="margin-left:4px">Copy</span>';
      copyBtn.style.cssText = "display:flex;align-items:center;padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;line-height:14px";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(srcText).then(() => {
          const orig = copyBtn.innerHTML;
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
        });
      });
      toolbar.appendChild(copyBtn);

      el.insertBefore(toolbar, el.firstChild);

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
          postToolbar.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 10px 0;flex-wrap:nowrap";

          // "Rendered" label
          const label = document.createElement("span");
          label.textContent = "Rendered";
          label.style.cssText = "padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;color:var(--text-faint);border:1px solid var(--border-dim);border-radius:4px;line-height:14px";
          postToolbar.appendChild(label);

          // Copy source button — matches code block copy style
          const postCopyBtn = document.createElement("button");
          postCopyBtn.title = "Copy ASCII source";
          postCopyBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg><span style="margin-left:4px">Copy</span>';
          postCopyBtn.style.cssText = "display:flex;align-items:center;padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;line-height:14px";
          postCopyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(srcText).then(() => {
              const orig = postCopyBtn.innerHTML;
              postCopyBtn.textContent = "Copied!";
              setTimeout(() => { postCopyBtn.innerHTML = orig; }, 1500);
            });
          });
          postToolbar.appendChild(postCopyBtn);
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
        const mode = (el as HTMLElement).dataset.mathMode;
        if (src) {
          // Store original MD syntax for replacement
          mathOriginalRef.current = mode === "display" ? `$$\n${src}\n$$` : `$${src}$`;
          setInitialMath(src);
          setShowMathModal(true);
        }
      });
    });
  }, [html, isLoading]);

  // Load shared content from URL — wait for auth to resolve first
  useEffect(() => {
    if (authLoading) return; // Wait until auth state is known
    (async () => {
      // Check hash-based sharing first
      const shared = await extractFromUrl();
      if (shared) {
        setMarkdown(shared);
        setIsSharedDoc(true);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, shared: true, title: extractTitleFromMd(shared) || "Shared Document", markdown: shared } : t));
        setViewMode("preview");
        await doRender(shared);
        return;
      }

      // Check ?from= or ?doc= parameter
      const params = new URLSearchParams(window.location.search);
      const fromId = params.get("from") || params.get("doc");
      if (fromId) {
        try {
          const headers: Record<string, string> = {};
          if (user?.id) headers["x-user-id"] = user.id;
          if (user?.email) headers["x-user-email"] = user.email;
          if (anonymousId) headers["x-anonymous-id"] = anonymousId;
          // Check for password from viewer (stored in sessionStorage)
          const savedPw = sessionStorage.getItem(`mdfy-pw-${fromId}`);
          if (savedPw) {
            headers["x-document-password"] = savedPw;
            sessionStorage.removeItem(`mdfy-pw-${fromId}`); // One-time use
          }
          const res = await fetch(`/api/docs/${fromId}`, { headers });
          if (res.ok) {
            const doc = await res.json();
            setMarkdownRaw(doc.markdown); // Use raw setter to avoid triggering auto-save during load
            if (doc.title) setTitle(doc.title);
            setDocId(fromId);
            setDocEditMode(doc.editMode || "token");
            if (doc.allowedEmails) setAllowedEmailsState(doc.allowedEmails);
            if (doc.allowedEditors) setAllowedEditorsState(doc.allowedEditors);

            const token = getEditToken(fromId);
            const ownerByToken = !!token;
            const ownerByAccount = !!doc.isOwner;
            const isPublicDoc = doc.editMode === "public";

            // Determine permission
            let perm: "mine" | "editable" | "readonly" = "readonly";
            if (ownerByToken || ownerByAccount) {
              perm = "mine";
              setIsOwner(true);
              setIsSharedDoc(false);
              if (!isMobile) setViewMode("split");
            } else if (isPublicDoc || doc.isEditor) {
              perm = "editable";
              setIsSharedDoc(true);
              setIsEditor(!!doc.isEditor);
              if (!isMobile) setViewMode("split");
            } else {
              perm = "readonly";
              setIsSharedDoc(true);
              setViewMode("preview");
            }

            // Update tab with cloudId and permission
            setTabs(prev => prev.map(t => t.id === activeTabId ? {
              ...t,
              cloudId: fromId,
              editToken: token || undefined,
              title: doc.title || "Shared Document",
              markdown: doc.markdown,
              permission: perm,
              shared: perm !== "mine",
            } : t));

            // Record visit (fire-and-forget)
            if (user?.id) {
              fetch("/api/user/visit", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": user.id },
                body: JSON.stringify({ documentId: fromId }),
              }).catch(() => {});
            }

            await doRender(doc.markdown);
            return;
          }
        } catch {
          // ignore, fall through to default
        }
      }

      await doRender(markdown);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Migrate anonymous documents to user account on sign-in (only on actual sign-in transition)
  const prevUserRef = useRef<string | undefined>(undefined); // undefined = not initialized
  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve

    const prevId = prevUserRef.current;
    const currentId = user?.id;

    // Only migrate on actual sign-in transition: was anonymous → now logged in
    // Read anonymousId directly from localStorage because the reactive `anonymousId` is already "" when user signs in
    const savedAnonId = typeof window !== "undefined" ? localStorage.getItem("mdfy-anon-id") || "" : "";
    if (currentId && prevId === "" && savedAnonId) {
      fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": currentId },
        body: JSON.stringify({ anonymousId: savedAnonId }),
      }).then(res => res.json()).then(data => {
        if (data.migrated > 0) {
          clearAnonymousId();
          setTabs(prev => prev.map(t => t.cloudId ? { ...t, permission: "mine" } : t));
        }
      }).catch(() => {});
    }

    // Track: "" means anonymous, user.id means logged in, undefined means not yet initialized
    prevUserRef.current = currentId || "";
  }, [user?.id, authLoading, anonymousId]);

  // Auto-create cloud IDs for tabs that don't have one (one-time migration, after auth resolves)
  const migrationDoneRef = useRef(false);
  useEffect(() => {
    if (authLoading || migrationDoneRef.current) return;
    migrationDoneRef.current = true;

    const tabsToMigrate = tabs.filter(t => !t.cloudId && !t.readonly && !t.deleted && t.markdown.length > 5);
    if (tabsToMigrate.length === 0) return;

    const uid = user?.id;
    const anonId = uid ? undefined : ensureAnonymousId();

    (async () => {
      for (const tab of tabsToMigrate.slice(0, 5)) {
        const result = await autoSave.createDocument({
          markdown: tab.markdown,
          title: tab.title,
          userId: uid,
          anonymousId: anonId,
        });
        if (result) {
          setTabs(prev => prev.map(t => t.id === tab.id
            ? { ...t, cloudId: result.id, editToken: result.editToken, isDraft: true, permission: "mine" }
            : t
          ));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Rehydrate cloud tabs that have empty markdown (e.g., after localStorage quota fallback)
  useEffect(() => {
    if (authLoading) return;
    const emptyCloudTabs = tabs.filter(t => t.cloudId && !t.markdown && !t.readonly && !t.deleted);
    if (emptyCloudTabs.length === 0) return;

    (async () => {
      for (const tab of emptyCloudTabs) {
        try {
          const headers: Record<string, string> = {};
          if (user?.id) headers["x-user-id"] = user.id;
          if (user?.email) headers["x-user-email"] = user.email;
          if (anonymousId) headers["x-anonymous-id"] = anonymousId;
          const res = await fetch(`/api/docs/${tab.cloudId}`, { headers });
          if (res.ok) {
            const doc = await res.json();
            if (doc.markdown) {
              setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, markdown: doc.markdown, title: doc.title || t.title } : t));
              // If this is the active tab, update the editor too
              if (tab.id === activeTabIdRef.current) {
                setMarkdownRaw(doc.markdown);
                doRender(doc.markdown);
              }
            }
          }
        } catch { /* silent — localStorage still has the tab metadata */ }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Flush pending auto-save before page unload (refresh, close, navigate)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
      if (!currentTab?.cloudId || currentTab.readonly || currentTab.deleted) return;

      // Use sendBeacon for reliable delivery during unload
      // 1. Save current content
      const payload = JSON.stringify({
        action: "auto-save",
        markdown: markdownRef.current,
        title: currentTab.title,
        userId: user?.id,
        anonymousId: (!user?.id) ? getAnonymousId() : undefined,
        editToken: currentTab.editToken,
      });
      navigator.sendBeacon(`/api/docs/${currentTab.cloudId}`, new Blob([payload], { type: "application/json" }));

      // 2. Create session-end snapshot (version history)
      if (sessionSnapshotCreated.current.has(currentTab.cloudId)) {
        const snapshotPayload = JSON.stringify({
          action: "snapshot",
          userId: user?.id,
          anonymousId: (!user?.id) ? getAnonymousId() : undefined,
          editToken: currentTab.editToken,
          changeSummary: "Session end",
        });
        navigator.sendBeacon(`/api/docs/${currentTab.cloudId}`, new Blob([snapshotPayload], { type: "application/json" }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tabs, user?.id]);

  // Session-based version snapshots:
  // - Create a snapshot when editing session begins (first edit on a doc with cloudId)
  // - Create a snapshot on beforeunload (session end)
  const sessionSnapshotCreated = useRef<Set<string>>(new Set());

  // Trigger snapshot on first edit of a document in this session
  const maybeCreateSessionSnapshot = useCallback((cloudId: string) => {
    if (sessionSnapshotCreated.current.has(cloudId)) return;
    sessionSnapshotCreated.current.add(cloudId);

    // Fire-and-forget: create snapshot of current server content
    const currentTab = tabs.find(t => t.cloudId === cloudId);
    fetch(`/api/docs/${cloudId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "snapshot",
        userId: user?.id,
        anonymousId: (!user?.id) ? getAnonymousId() : undefined,
        editToken: currentTab?.editToken,
        changeSummary: "Session start",
      }),
    }).catch(() => {});
  }, [tabs, user?.id]);

  // Fetch recently visited (shared with me) + server docs for logged-in users
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setRecentDocs([]);
      setServerDocs([]);
      return;
    }
    // Fetch recent visits — filter to non-owned docs only (Shared With Me)
    fetch("/api/user/recent", {
      headers: { "x-user-id": user.id },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.recent) {
          setRecentDocs(data.recent.filter((d: { isOwner: boolean }) => !d.isOwner));
        }
      })
      .catch(() => {});
    // Fetch user's own documents from server
    fetch("/api/user/documents", {
      headers: { "x-user-id": user.id },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.documents) {
          setServerDocs(data.documents);
        }
      })
      .catch(() => {});
  }, [user?.id, authLoading]);

  // Notification polling (every 30s for logged-in users)
  useEffect(() => {
    if (!user?.email) { setNotifications([]); setUnreadCount(0); return; }
    const fetchNotifs = () => {
      fetch("/api/notifications", { headers: { "x-user-email": user.email! } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
          }
        })
        .catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

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

    // cell-menu-btn removed — use right-click for table operations

    // Table context menu logic (right-click only)
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
        setShowDocEditModeMenu(false);
        setConfirmRotateToken(false);
      }
      setShowExportMenu(false);
      setShowEditModeMenu(false);
    };
    if (showMenu || showExportMenu || showEditModeMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showMenu, showExportMenu, showEditModeMenu]);

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

  // Handle paste in Beautified — convert CLI output or HTML to markdown, then re-render
  const handleWysiwygPaste = useCallback((e: React.ClipboardEvent) => {
    // Check for pasted image
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const placeholder = `![Uploading ${file.name || "image"}...]()\n`;
      document.execCommand("insertText", false, placeholder);
      (async () => {
        const url = await uploadImage(file);
        const current = markdownForImageRef.current;
        if (url) {
          const updated = current.replace(placeholder, `![${file.name || "image"}](${url})\n`);
          setMarkdown(updated);
          doRender(updated);
          cmSetDoc(updated);
        } else {
          const updated = current.replace(placeholder, "");
          setMarkdown(updated);
          doRender(updated);
          cmSetDoc(updated);
        }
      })();
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");

    // Check for CLI output first
    if (text && isCliOutput(text)) {
      e.preventDefault();
      const converted = cliToMarkdown(text);
      setMarkdown(converted);
      cmSetDoc(converted);
      doRender(converted);
      return;
    }

    // Check for HTML paste
    if (html && isHtmlContent(html)) {
      e.preventDefault();
      const md = htmlToMarkdown(html);
      // Insert at cursor position in contentEditable
      document.execCommand("insertText", false, md);
      return;
    }
  }, [setMarkdown, cmSetDoc, doRender, uploadImage]);

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
      // Keep wysiwygEditingRef true long enough for the re-render cycle to complete
      // (setMarkdown → doRender → html state → ref callback must all see wysiwygEditingRef=true)
      setTimeout(() => { wysiwygEditingRef.current = false; }, 500);
    }, 150);
  }, [setMarkdown, cmSetDoc]);

  // File drop handler
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);

      // Handle image file drops — upload and insert markdown
      const imageFiles = files.filter(f => f.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        let current = markdownForImageRef.current;
        for (const img of imageFiles) {
          const url = await uploadImage(img);
          if (url) {
            const imgMd = `![${img.name}](${url})\n\n`;
            current = current + imgMd;
            setMarkdown(current);
            doRender(current);
            cmSetDoc(current);
          }
        }
        return;
      }

      for (let idx = 0; idx < files.length; idx++) {
        try {
          const file = files[idx];
          const { markdown: md, title: name } = await importFile(file);
          if (!md) continue;
          const isPlainFormat = /\.(pdf|rtf|txt|csv|json|xml|pptx?|xlsx?|od[pst])$/i.test(file.name);
          // Always create a new tab for imports
          const tabId = `tab-${tabIdCounter++}`;
          setTabs((prev) => [...prev, { id: tabId, title: name, markdown: md }]);
          setTimeout(() => switchTab(tabId), 50);
          if (!isMobile) setViewMode("split");
          if (isPlainFormat && md.length > 50) {
            setMdfyPrompt({ text: md, filename: file.name, tabId });
          }
        } catch (err) {
          console.error(`Failed to import ${files[idx].name}:`, err);
        }
      }
    },
    [doRender, isMobile, markdown, uploadImage, cmSetDoc]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only show file drop overlay for external file drags, not internal sidebar drags
    if (e.dataTransfer.types.includes("Files") && !dragTabId && !dragFolderId) {
      setIsDragging(true);
    }
  }, [dragTabId, dragFolderId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Paste handling is now done inside useCodeMirror hook via onPaste callback

  // ─── Relative time helper ───
  const relativeTime = useCallback((dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }, []);

  // ─── History panel handlers ───
  const loadVersions = useCallback(async () => {
    if (!docId) return;
    setHistoryLoading(true);
    try {
      const data = await fetchVersions(docId);
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    }
    setHistoryLoading(false);
  }, [docId]);

  const handleToggleHistory = useCallback(() => {
    if (!showHistory && docId) {
      loadVersions();
    }
    setShowHistory(!showHistory);
    setPreviewVersion(null);
  }, [showHistory, docId, loadVersions]);

  const handlePreviewVersion = useCallback(async (versionId: number) => {
    if (!docId) return;
    if (previewVersion === versionId) {
      // Toggle off — restore current content
      setPreviewVersion(null);
      doRender(markdown);
      return;
    }
    setPreviewVersion(versionId);
    try {
      const data = await fetchVersion(docId, versionId);
      if (data.version?.markdown) {
        const result = await renderMarkdown(data.version.markdown);
        const processed = postProcessHtml(result.html);
        setHtml(processed);
      }
    } catch {
      // ignore
    }
  }, [docId, previewVersion, markdown, doRender]);

  const handleRestoreVersion = useCallback(async (versionId: number) => {
    if (!docId) return;
    const token = getEditToken(docId);
    if (!token) return;
    setRestoringVersion(versionId);
    try {
      const data = await fetchVersion(docId, versionId);
      if (data.version?.markdown) {
        await updateDocument(docId, token, data.version.markdown, data.version.title || undefined, { userId: user?.id, anonymousId: !user?.id ? getAnonymousId() : undefined, changeSummary: `Restored to version ${data.version.version_number}` });
        setMarkdown(data.version.markdown);
        doRender(data.version.markdown);
        if (data.version.title) setTitle(data.version.title);
        setPreviewVersion(null);
        await loadVersions();
      }
    } catch {
      // ignore
    }
    setRestoringVersion(null);
  }, [docId, doRender, loadVersions]);

  // Share — open modal for owners, quick copy for non-owners
  const handleShare = useCallback(async () => {
    if (!markdown.trim()) return;

    // If doc already has a cloudId and user is owner, open share modal
    const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
    const cid = currentTab?.cloudId || docId;

    const isMine = !currentTab?.permission || currentTab.permission === "mine";
    if (cid && isMine && isAuthenticated && user) {
      // Publish the draft first if needed
      if (currentTab?.isDraft) {
        try {
          await fetch(`/api/docs/${cid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "publish", userId: user.id }),
          });
          setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, isDraft: false } : t));
        } catch { /* ignore */ }
      }
      // Sync title + fetch sharing info before opening modal
      if (cid) {
        if (title) {
          fetch(`/api/docs/${cid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "auto-save", title, userId: user.id }),
          }).catch(() => {});
        }
        // Fetch current sharing state
        try {
          const res = await fetch(`/api/docs/${cid}`, { headers: { "x-user-id": user.id, "x-user-email": user.email || "" } });
          if (res.ok) {
            const doc = await res.json();
            if (doc.allowedEmails) setAllowedEmailsState(doc.allowedEmails);
            if (doc.allowedEditors) setAllowedEditorsState(doc.allowedEditors);
            if (doc.editMode) { setDocEditMode(doc.editMode); setEditMode(doc.editMode); }
          }
        } catch { /* ignore */ }
      }
      setShowShareModal(true);
      return;
    }

    // Non-owner with existing doc — just copy the link
    if (cid && !isMine) {
      const url = `${window.location.origin}/${cid}`;
      await copyToClipboard(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 3000);
      return;
    }

    // Not yet shared — create the document first
    setShareState("sharing");
    try {
      if (isAuthenticated && user) {
        const { url, editToken } = await createShortUrl(markdown, title, {
          userId: user.id,
          editMode,
        });
        const newDocId = url.split("/").pop()!;
        saveEditToken(newDocId, editToken);
        setDocId(newDocId);
        setIsOwner(true);
        setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, cloudId: newDocId, editToken, isDraft: false } : t));
        window.history.replaceState(null, "", `/?doc=${newDocId}`);
        // Open share modal immediately after creation
        setShareState("idle");
        setShowShareModal(true);
      } else {
        try {
          const anonId = ensureAnonymousId();
          const { url, editToken } = await createShortUrl(markdown, title, { anonymousId: anonId });
          const newDocId = url.split("/").pop()!;
          saveEditToken(newDocId, editToken);
          setDocId(newDocId);
          setIsOwner(true);
          setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, cloudId: newDocId, editToken, isDraft: false } : t));
          await copyToClipboard(url);
          window.history.replaceState(null, "", `/?doc=${newDocId}`);
          setShareState("copied");
          setTimeout(() => setShareState("idle"), 3000);
        } catch {
          const url = await createShareUrl(markdown);
          await copyToClipboard(url);
          setShareState("copied");
          setTimeout(() => setShareState("idle"), 3000);
        }
      }
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  }, [markdown, title, docId, tabs, isOwner, isAuthenticated, user, editMode]);

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

  // Download helpers
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadMd = useCallback(() => {
    downloadFile(markdown, `${title || "document"}.md`, "text/markdown");
    setShowMenu(false);
  }, [markdown, title, downloadFile]);

  const handleDownloadHtml = useCallback(() => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || "Document"}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 768px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.9em; }
  blockquote { border-left: 3px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  img { max-width: 100%; }
  h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
</style>
</head>
<body>
${html}
</body>
</html>`;
    downloadFile(fullHtml, `${title || "document"}.html`, "text/html");
    setShowExportMenu(false);
  }, [html, title, downloadFile]);

  const handleDownloadTxt = useCallback(() => {
    // Strip markdown syntax for plain text
    const plain = markdown
      .replace(/^#{1,6}\s+/gm, "")           // headings
      .replace(/\*\*(.*?)\*\*/g, "$1")         // bold
      .replace(/\*(.*?)\*/g, "$1")             // italic
      .replace(/~~(.*?)~~/g, "$1")             // strikethrough
      .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}.*\n?/g, "")) // code blocks
      .replace(/`(.*?)`/g, "$1")               // inline code
      .replace(/!\[.*?\]\(.*?\)/g, "")          // images
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")       // links
      .replace(/^[\-\*]\s+/gm, "• ")           // unordered lists
      .replace(/^\d+\.\s+/gm, (m) => m)        // keep ordered lists
      .replace(/^>\s+/gm, "  ")                // blockquotes
      .replace(/---+/g, "────────────────");    // horizontal rules
    downloadFile(plain, `${title || "document"}.txt`, "text/plain");
    setShowExportMenu(false);
  }, [markdown, title, downloadFile]);

  const handleCopyPlainText = useCallback(async () => {
    const plain = markdown
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}.*\n?/g, ""))
      .replace(/`(.*?)`/g, "$1")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/^[\-\*]\s+/gm, "• ")
      .replace(/^>\s+/gm, "  ");
    await copyToClipboard(plain);
    setShowExportMenu(false);
  }, [markdown]);

  // Update existing document
  const [updateState, setUpdateState] = useState<"idle" | "updating" | "done" | "error">("idle");
  const handleUpdate = useCallback(async () => {
    if (!docId || !markdown.trim()) return;
    const token = getEditToken(docId);
    // Can update if: has token, or is owner by account, or doc is public
    if (!token && !user?.id && docEditMode !== "public") return;
    setUpdateState("updating");
    try {
      await updateDocument(docId, token || "", markdown, title, {
        userId: user?.id,
        anonymousId: !user?.id ? getAnonymousId() : undefined,
        changeSummary: undefined,
      });
      setUpdateState("done");
      setTimeout(() => setUpdateState("idle"), 3000);
    } catch {
      setUpdateState("error");
      setTimeout(() => setUpdateState("idle"), 3000);
    }
  }, [docId, markdown, title, user]);

  // Document settings (owner only)
  const [showDocSettings, setShowDocSettings] = useState(false);
  const [showDocEditModeMenu, setShowDocEditModeMenu] = useState(false);
  const [confirmRotateToken, setConfirmRotateToken] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);
  const [changingEditMode, setChangingEditMode] = useState(false);

  const handleRotateToken = useCallback(async () => {
    if (!docId || !user?.id) return;
    if (!confirmRotateToken) { setConfirmRotateToken(true); return; }
    setRotatingToken(true);
    try {
      const newToken = await rotateEditToken(docId, user.id);
      saveEditToken(docId, newToken);
    } catch {
      // ignore
    }
    setRotatingToken(false);
    setConfirmRotateToken(false);
  }, [docId, user, confirmRotateToken]);

  const handleChangeDocEditMode = useCallback(async (newMode: "owner" | "token" | "public") => {
    if (!docId || !user?.id) return;
    setChangingEditMode(true);
    try {
      await changeEditMode(docId, user.id, newMode);
      setDocEditMode(newMode);
    } catch {
      // ignore
    }
    setChangingEditMode(false);
    setShowDocEditModeMenu(false);
  }, [docId, user]);

  // Delete document
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!docId) return;
    if (!confirmDeleteDoc) { setConfirmDeleteDoc(true); return; }
    const token = getEditToken(docId);
    if (!token) return;
    try {
      await deleteDocument(docId, token);
      setDocId(null);
      setIsOwner(false);
      window.history.replaceState(null, "", "/");
    } catch {
      // ignore
    }
    setConfirmDeleteDoc(false);
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
          setInlineInput({ label: "URL", onSubmit: (u) => { document.execCommand("createLink", false, u); setInlineInput(null); } });
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
        mathOriginalRef.current = null; // new math, not editing existing
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
    // Non-editable blocks: code, mermaid, math, tables, images, ascii diagrams
    const nonEditableSelector = "pre, .mermaid-container, .mermaid-rendered, .math-rendered, .katex-display, .ascii-diagram, table, img";
    article.querySelectorAll(nonEditableSelector).forEach(el => {
      (el as HTMLElement).contentEditable = "false";

      // Add editable spacer AFTER if missing — so cursor can be placed below
      const next = el.nextElementSibling;
      if (!next || (next.getAttribute("contenteditable") === "false" && !next.classList.contains("ce-spacer"))) {
        if (!el.nextElementSibling?.classList.contains("ce-spacer")) {
          const spacer = document.createElement("p");
          spacer.innerHTML = "<br>";
          spacer.className = "ce-spacer";
          el.parentNode?.insertBefore(spacer, el.nextSibling);
        }
      }

      // Add editable spacer BEFORE if missing — so cursor can be placed above
      const prev = el.previousElementSibling;
      if (!prev || (prev.getAttribute("contenteditable") === "false" && !prev.classList.contains("ce-spacer"))) {
        if (!el.previousElementSibling?.classList.contains("ce-spacer")) {
          const spacer = document.createElement("p");
          spacer.innerHTML = "<br>";
          spacer.className = "ce-spacer";
          el.parentNode?.insertBefore(spacer, el);
        }
      }
    });
    // Suppress browser object resizing/table controls
    try {
      document.execCommand("enableObjectResizing", false, "false");
      document.execCommand("enableInlineTableEditing", false, "false");
    } catch { /* not supported in all browsers */ }

    // MutationObserver: remove any browser-injected table controls (▾ dropdowns)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement) {
            // Chrome adds elements with data-column / data-row or specific classes
            if (node.tagName === "DIV" && (node.style.position === "absolute" || node.getAttribute("data-column") !== null)) {
              node.remove();
            }
          }
        }
      }
    });
    observer.observe(article, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [html]);

  const shareButtonLabel = {
    idle: "SHARE",
    sharing: "",
    copied: "COPIED!",
    error: "FAILED",
  }[shareState];

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-[9998] flex items-center justify-center border-2 border-dashed rounded-lg m-2"
          style={{ background: "var(--drag-bg)", borderColor: "var(--accent)" }}
        >
          <div className="text-center">
            <div className="text-4xl mb-3 opacity-60">•</div>
            <p className="text-lg font-medium" style={{ color: "var(--accent)" }}>Drop your file</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>MD, PDF, DOCX, PPTX, XLSX, HTML, CSV, LaTeX, RST, JSON, TXT</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Supports .md, .markdown, .txt</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 backdrop-blur-sm relative z-[100]"
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
            <button
              className="text-xs sm:text-sm pl-2 sm:pl-3 hidden sm:inline hover:text-[var(--accent)] transition-colors"
              style={{ color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}
              title="Click to rename"
              onClick={() => {
                setInlineInput({
                  label: "Document name",
                  defaultValue: title,
                  onSubmit: (trimmed) => {
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
                    setInlineInput(null);
                  },
                });
              }}
            >
              {title}
            </button>
          )}
          {/* Save status indicator — compact */}
          {autoSave.isSaving && (
            <span className="text-[10px] font-mono shrink-0 hidden sm:inline" style={{ color: "var(--text-faint)" }}>Saving...</span>
          )}
          {autoSave.error && !autoSave.isSaving && (
            <span className="text-[10px] font-mono shrink-0 hidden sm:inline" style={{ color: "#ef4444" }}>{autoSave.error}</span>
          )}
          {(() => {
            const ct = tabs.find(t => t.id === activeTabId);
            const perm = ct?.permission;
            if (perm === "readonly") return (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>VIEW ONLY</span>
            );
            if (perm === "editable") return (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>EDITABLE</span>
            );
            return null;
          })()}
        </div>

        {/* Center: Layout tabs with icons */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center rounded-lg p-0.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
        >
          {([
            { mode: "preview" as ViewMode, label: "BEAUTIFIED", icon: (
              <svg width="14" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M1 6s3-4.5 7-4.5S15 6 15 6s-3 4.5-7 4.5S1 6 1 6z"/>
                <circle cx="8" cy="6" r="2"/>
              </svg>
            )},
            { mode: "split" as ViewMode, label: "SPLIT", icon: (
              <svg width="14" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1" y="1" width="14" height="10" rx="1.5"/>
                <line x1="9" y1="1" x2="9" y2="11"/>
              </svg>
            )},
            { mode: "editor" as ViewMode, label: "MDFIED", icon: (
              <svg width="14" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M4 3.5L1.5 6L4 8.5M12 3.5l2.5 2.5L12 8.5" strokeLinecap="round"/>
              </svg>
            )},
          ]).map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-all"
              style={{
                background: viewMode === mode ? "var(--background)" : "transparent",
                color: viewMode === mode ? "var(--text-primary)" : "var(--text-faint)",
                boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
              }}
            >
              {icon}
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">

          {/* AI Render moved to BEAUTIFIED MD panel header */}

          {/* Theme toggle — hidden on mobile, in menu instead */}
          <button
            onClick={toggleTheme}
            className="px-2 h-6 rounded-md transition-colors text-[11px] hidden sm:flex items-center"
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
            {/* Notifications bell */}
            {user?.email && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      // Mark all as read
                      fetch("/api/notifications", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "x-user-email": user.email! },
                        body: JSON.stringify({ markAllRead: true }),
                      }).then(() => { setUnreadCount(0); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); }).catch(() => {});
                    }
                  }}
                  className="relative h-6 w-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ background: showNotifications ? "var(--accent-dim)" : "var(--toggle-bg)", color: showNotifications ? "var(--accent)" : "var(--text-muted)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4 6a4 4 0 018 0c0 2 1 3.5 2 4.5H2c1-1 2-2.5 2-4.5z"/><path d="M6 11v.5a2 2 0 004 0V11"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "var(--accent)", color: "#000" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div
                    className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-auto rounded-lg shadow-xl z-[9999]"
                    style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                  >
                    <div className="px-3 py-2 text-[10px] font-semibold" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}>
                      Notifications
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text-faint)" }}>No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          className="w-full text-left px-3 py-2.5 transition-colors hover:bg-[var(--menu-hover)] flex items-start gap-2.5"
                          style={{ borderBottom: "1px solid var(--border-dim)" }}
                          onClick={async () => {
                            setShowNotifications(false);
                            if (!n.documentId) return;
                            // Check if already open as a tab
                            const existing = tabs.find(t => !t.deleted && t.cloudId === n.documentId);
                            if (existing) {
                              switchTab(existing.id);
                              return;
                            }
                            // Fetch and open as new tab
                            try {
                              const headers: Record<string, string> = {};
                              if (user?.id) headers["x-user-id"] = user.id;
                              if (user?.email) headers["x-user-email"] = user.email;
                              const res = await fetch(`/api/docs/${n.documentId}`, { headers });
                              if (!res.ok) {
                                setNotifications(prev => prev.filter(x => x.documentId !== n.documentId));
                                return;
                              }
                              const d = await res.json();
                              const perm = d.isOwner ? "mine" : (d.isEditor || d.editMode === "public") ? "editable" : "readonly";
                              const newId = `tab-${Date.now()}`;
                              const newTab: Tab = { id: newId, title: d.title || n.documentTitle || "Untitled", markdown: d.markdown, cloudId: n.documentId, permission: perm as "mine" | "editable" | "readonly", shared: perm !== "mine" };
                              setTabs(prev => {
                                const saved = prev.map(t => t.id !== activeTabId || t.readonly ? t : { ...t, markdown: markdownRef.current, title: extractTitleFromMd(markdownRef.current) || t.title });
                                return [...saved, newTab];
                              });
                              loadTab(newTab);
                            } catch {
                              window.location.href = `/?from=${n.documentId}`;
                            }
                          }}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                            {n.fromUserName?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] leading-relaxed" style={{ color: n.read ? "var(--text-muted)" : "var(--text-primary)" }}>
                              <span className="font-medium">{n.fromUserName}</span> {n.message}
                            </p>
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                              {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: "var(--accent)" }} />}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="relative group">
              <button
                onClick={handleShare}
                disabled={shareState === "sharing"}
                className="px-2 h-6 rounded-md font-mono transition-colors text-[10px] font-medium flex items-center gap-1.5"
                style={{
                  background: shareState === "copied" ? "rgba(34, 197, 94, 0.2)" : "var(--accent-dim)",
                  color: shareState === "copied" ? "#4ade80" : "var(--accent)",
                }}
              >
                {shareState === "sharing" ? (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/></svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 1.5L14.5 4.5M7 9l-1 4 4-1 6.5-6.5-3-3L7 9z"/></svg>
                )}
                <span className="hidden lg:inline">{shareButtonLabel}</span>
              </button>
              <div className="absolute top-full mt-1.5 right-0 w-48 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
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
                  className="fixed w-48 rounded-lg shadow-xl"
                  style={{ zIndex: 9999, background: "var(--menu-bg)", border: "1px solid var(--border)", top: menuRef.current ? menuRef.current.getBoundingClientRect().bottom + 4 : 0, right: 8 }}
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
                      onClick={() => { toggleTheme(); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {theme === "dark" ? "Light mode" : "Dark mode"}
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
                        <div className="px-3 py-1.5">
                          <div className="text-[10px] font-mono uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Document Settings</div>
                          {/* Change permissions */}
                          <div className="relative">
                            <button
                              onClick={() => setShowDocEditModeMenu(!showDocEditModeMenu)}
                              className="w-full text-left text-xs py-1.5 transition-colors flex items-center justify-between"
                              style={{ color: "var(--text-tertiary)" }}
                              disabled={changingEditMode}
                            >
                              <span>Permissions</span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {(docEditMode === "owner" || docEditMode === "account" || docEditMode === "token") ? "Only me" : "Anyone with link"}
                              </span>
                            </button>
                            {showDocEditModeMenu && (
                              <div className="mt-1 mb-1 rounded-md overflow-hidden" style={{ background: "var(--toggle-bg)" }}>
                                {([
                                  { value: "owner" as const, label: "Only me", desc: "Only you can edit" },
                                  { value: "public" as const, label: "Anyone with link", desc: "Anyone who opens this link can edit" },
                                ] as const).map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleChangeDocEditMode(opt.value)}
                                    className="w-full text-left px-2.5 py-1.5 text-[11px] transition-colors"
                                    style={{ color: docEditMode === opt.value ? "var(--accent)" : "var(--text-secondary)" }}
                                  >
                                    <div className="font-medium">{opt.label}{docEditMode === opt.value && " \u2713"}</div>
                                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Rotate edit token */}
                          {confirmRotateToken ? (
                            <div className="py-1.5">
                              <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>This will invalidate all existing edit links.</p>
                              <div className="flex gap-1">
                                <button onClick={() => setConfirmRotateToken(false)} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}>Cancel</button>
                                <button onClick={handleRotateToken} disabled={rotatingToken} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                                  {rotatingToken ? "Rotating..." : "Confirm"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={handleRotateToken}
                              className="w-full text-left text-xs py-1.5 transition-colors"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              Rotate edit token
                            </button>
                          )}
                        </div>
                        <hr style={{ borderColor: "var(--border)" }} className="my-1" />
                        {confirmDeleteDoc ? (
                          <div className="px-3 py-2">
                            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>Delete this shared document?</p>
                            <div className="flex gap-1">
                              <button onClick={() => setConfirmDeleteDoc(false)} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}>Cancel</button>
                              <button onClick={handleDelete} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Delete</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={handleDelete}
                            className="w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{ color: "#ef4444" }}
                          >
                            Delete shared doc
                          </button>
                        )}
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
            const w = Math.max(160, Math.min(400, e.clientX - rect.left));
            setSidebarWidth(w);
            const el = wrapper.querySelector('[data-pane="sidebar"]') as HTMLElement;
            if (el) el.style.width = `${w}px`;
          }
        }}
        onMouseUp={() => { isDraggingSidebar.current = false; }}
        onClick={() => { if (docContextMenu) setDocContextMenu(null); if (folderContextMenu) setFolderContextMenu(null); if (sidebarContextMenu) setSidebarContextMenu(null); }}
      >

      {/* Sidebar */}
      {showSidebar ? (
        <>
        <div
          className="flex flex-col shrink-0"
          data-pane="sidebar"
          style={{ width: sidebarWidth, minWidth: 160, background: "var(--background)" }}
        >
          {/* Header — toggle button + MD FILES + New */}
          <div
            className="flex items-center justify-between px-2 py-1.5 text-[11px] font-mono shrink-0 select-none"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)", cursor: "default" }}
            onDoubleClick={() => setShowSidebar(false)}
          >
            <div className="flex items-center gap-1.5">
              <div className="relative group">
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 rounded transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="12" rx="2"/><line x1="5.5" y1="2" x2="5.5" y2="14"/></svg>
                </button>
                <div className="absolute top-full left-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  Close sidebar
                </div>
              </div>
              <span style={{ color: "var(--accent)" }}>MD FILES</span>
            </div>
            <div className="flex items-stretch gap-1">
              <div className="relative group flex">
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-1 h-6 px-1.5 rounded-md transition-colors text-[10px]"
                  style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v7M5 7.5L8 10l3-2.5"/><path d="M3 10v3h10v-3"/></svg>
                  {sidebarWidth >= 200 && "IMPORT"}
                </button>
                <div className="absolute top-full left-0 mt-1 w-52 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9999]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                  <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>Import Files</p>
                  <p style={{ marginBottom: 4 }}>Select multiple files at once. Supported formats:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["MD", "PDF", "DOCX", "PPTX", "XLSX", "HTML", "CSV", "LaTeX", "RST", "RTF", "JSON", "XML", "TXT"].map(f => (
                      <span key={f} className="px-1 py-0.5 rounded font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)", fontSize: 9 }}>{f}</span>
                    ))}
                  </div>
                  <div className="mt-2 space-y-0.5 text-[9px]" style={{ color: "var(--text-faint)" }}>
                    <div>PDF: max 4MB</div>
                    <div>PPTX / XLSX / Office: max 10MB</div>
                    <div>Text formats: no limit</div>
                    <div>AI structuring (mdfy): up to 30K chars</div>
                  </div>
                  <p className="mt-1.5" style={{ color: "var(--text-faint)" }}>Or drag & drop files anywhere</p>
                </div>
              </div>
              <div className="relative group flex">
                <button
                  onClick={addTab}
                  className="flex items-center gap-1 h-6 px-1.5 rounded-md transition-colors text-[10px]"
                  style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
                </button>
                <div className="absolute top-full left-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9999]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  Create a new blank document
                </div>
              </div>
            </div>
          </div>
          {/* Hidden file input for import */}
          <input
            ref={importFileRef}
            type="file"
            accept={getSupportedAcceptString()}
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (let idx = 0; idx < files.length; idx++) {
                try {
                  const file = files[idx];
                  const { markdown: md, title: name } = await importFile(file);
                  if (!md) continue;
                  const isPlainFormat = /\.(pdf|rtf|txt|csv|json|xml|pptx?|xlsx?|od[pst])$/i.test(file.name);
                  // Always create a new tab for imports
                  const tabId = `tab-${tabIdCounter++}`;
                  setTabs((prev) => [...prev, { id: tabId, title: name, markdown: md }]);
                  setTimeout(() => switchTab(tabId), 50);
                  if (!isMobile) setViewMode("split");
                  if (isPlainFormat && md.length > 50) {
                    setMdfyPrompt({ text: md, filename: file.name, tabId });
                  }
                } catch (err) {
                  console.error(`Failed to import ${files[idx].name}:`, err);
                }
              }
              e.target.value = "";
            }}
          />
          {/* Hidden file input for image upload */}
          <input
            ref={imageFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const placeholder = `![Uploading ${file.name}...]()\n`;
              const withPlaceholder = markdownForImageRef.current + placeholder;
              setMarkdown(withPlaceholder);
              doRender(withPlaceholder);
              cmSetDoc(withPlaceholder);
              const url = await uploadImage(file);
              const current = markdownForImageRef.current;
              if (url) {
                const updated = current.replace(placeholder, `![${file.name}](${url})\n`);
                setMarkdown(updated);
                doRender(updated);
                cmSetDoc(updated);
              } else {
                const updated = current.replace(placeholder, "");
                setMarkdown(updated);
                doRender(updated);
                cmSetDoc(updated);
              }
              e.target.value = "";
            }}
          />
          {/* Document list — 3 permanent sections */}
          <div className="flex-1 overflow-y-auto" onContextMenu={(e) => {
            e.preventDefault();
            setDocContextMenu(null);
            setFolderContextMenu(null);
            setSidebarContextMenu({ x: e.clientX, y: e.clientY });
          }}>
            {/* ── Section 1: MY DOCUMENTS ── */}
            {(() => {
              const myTabs = tabs.filter(t => !t.deleted && !t.readonly && t.permission !== "readonly" && t.permission !== "editable");
              const myTabCount = myTabs.length;
              return (
                <div className="pt-3">
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none"
                    onClick={() => setShowMyDocs(!showMyDocs)}
                  >
                    <span className="flex-1 text-[11px] font-medium" style={{ color: showMyDocs ? "var(--text-faint)" : "var(--text-muted)" }}>My Documents</span>
                    {showMyDocs && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSortMode(prev => prev === "newest" ? "oldest" : prev === "oldest" ? "az" : prev === "az" ? "za" : "newest"); }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title={`Sort: ${sortMode}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = `folder-${Date.now()}`;
                            setFolders(prev => [...prev, { id, name: "New Folder", collapsed: false }]);
                            setInlineInput({ label: "Folder name", defaultValue: "New Folder", onSubmit: (name) => { setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); setInlineInput(null); }});
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title="New folder"
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1 4h5l2-2h7v11H1z"/><line x1="8" y1="7" x2="8" y2="11"/><line x1="6" y1="9" x2="10" y2="9"/></svg>
                        </button>
                      </>
                    )}
                    {!showMyDocs && myTabCount > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{myTabCount}</span>}
                  </div>
                  {showMyDocs && (
                    <div className="space-y-0.5 pt-1 pb-1 pl-2 pr-2">
                      {/* Root-level documents (no folder, mine only) */}
                      {myTabs.filter(t => !t.folderId).sort((a, b) => {
                        if (sortMode === "az") return (a.title || "").localeCompare(b.title || "");
                        if (sortMode === "za") return (b.title || "").localeCompare(a.title || "");
                        const ai = tabs.indexOf(a), bi = tabs.indexOf(b);
                        return sortMode === "oldest" ? ai - bi : bi - ai;
                      }).map((tab) => (
                        <div
                          key={tab.id}
                          draggable
                          onDragStart={() => setDragTabId(tab.id)}
                          onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md cursor-pointer group text-xs transition-colors ${dragOverTarget === tab.id ? "ring-1 ring-[var(--accent)]" : ""}`}
                          style={{
                            background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                            color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                            opacity: dragTabId === tab.id ? 0.4 : 1,
                          }}
                          onClick={() => tab.id !== activeTabId && switchTab(tab.id)}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0">
                            <path d="M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/>
                            <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round"/>
                          </svg>
                          <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                          <button onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id }); }}
                            className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", padding: "2px" }}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/></svg>
                          </button>
                        </div>
                      ))}

                      {/* Folders */}
                      {[...folders].filter(f => !f.section || f.section === "my").sort((a, b) => {
                        if (sortMode === "az") return a.name.localeCompare(b.name);
                        if (sortMode === "za") return b.name.localeCompare(a.name);
                        const ai = folders.indexOf(a), bi = folders.indexOf(b);
                        return sortMode === "oldest" ? ai - bi : bi - ai;
                      }).map(folder => {
                        const folderTabs = tabs.filter(t => !t.deleted && t.folderId === folder.id);
                        return (
                          <div key={folder.id} className="mt-0.5">
                            <div
                              draggable
                              onDragStart={(e) => { setDragFolderId(folder.id); e.dataTransfer.effectAllowed = "move"; }}
                              onDragEnd={() => { setDragFolderId(null); setDragOverTarget(null); }}
                              className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-md cursor-pointer text-xs font-medium transition-colors group ${dragOverTarget === folder.id ? "ring-1 ring-[var(--accent)]" : ""}`}
                              style={{ color: "var(--text-muted)", background: dragOverTarget === folder.id ? "var(--accent-dim)" : "transparent", opacity: dragFolderId === folder.id ? 0.4 : 1 }}
                              onClick={() => setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, collapsed: !f.collapsed } : f))}
                              onDragOver={(e) => { e.preventDefault(); if (dragTabId) setDragOverTarget(folder.id); }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragTabId) {
                                  setTabs(prev => prev.map(t => t.id === dragTabId ? { ...t, folderId: folder.id } : t));
                                }
                                setDragTabId(null);
                                setDragFolderId(null);
                                setDragOverTarget(null);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFolderContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id });
                              }}
                            >
                              <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 -mr-1"
                                style={{ transform: folder.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                                <path d="M4 6l4 4 4-4" strokeLinecap="round"/>
                              </svg>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill={folder.collapsed ? "var(--text-faint)" : "none"} stroke="var(--text-faint)" strokeWidth="1.2" className="shrink-0"><path d="M1 4h5l2-2h7v11H1z"/></svg>
                              <span className="truncate flex-1">{folder.name}</span>
                              <span className="text-[9px] opacity-50 group-hover:opacity-0 transition-opacity ml-auto shrink-0">{folderTabs.length}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setFolderContextMenu({ x: rect.right, y: rect.bottom, folderId: folder.id });
                                }}
                                className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity -ml-5"
                                style={{ color: "var(--text-muted)", padding: "2px" }}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/></svg>
                              </button>
                            </div>
                            {!folder.collapsed && (
                              <div className="pl-3 pr-1 space-y-0.5 mt-0.5">
                                {[...folderTabs].sort((a, b) => {
                                  if (sortMode === "az") return (a.title || "").localeCompare(b.title || "");
                                  if (sortMode === "za") return (b.title || "").localeCompare(a.title || "");
                                  const ai = tabs.indexOf(a), bi = tabs.indexOf(b);
                                  return sortMode === "oldest" ? ai - bi : bi - ai;
                                }).map((tab) => (
                                  <div
                                    key={tab.id}
                                    draggable
                                    onDragStart={() => setDragTabId(tab.id)}
                                    onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-md cursor-pointer group text-xs transition-colors"
                                    style={{
                                      background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                                      color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                                      opacity: dragTabId === tab.id ? 0.4 : 1,
                                    }}
                                    onClick={() => tab.id !== activeTabId && switchTab(tab.id)}
                                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0">
                                      <path d="M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/>
                                      <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round"/>
                                    </svg>
                                    <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                                    <button onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id }); }}
                                      className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", padding: "2px" }}>
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Drop zone for removing from folder (root drop) */}
                      {dragTabId && (
                        <div
                          className="mx-2 mt-2 px-3 py-2 rounded-md text-[10px] text-center transition-colors"
                          style={{ border: "1px dashed var(--border)", color: "var(--text-faint)", background: dragOverTarget === "root" ? "var(--accent-dim)" : "transparent" }}
                          onDragOver={(e) => { e.preventDefault(); setDragOverTarget("root"); }}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragTabId) setTabs(prev => prev.map(t => t.id === dragTabId ? { ...t, folderId: undefined } : t));
                            setDragTabId(null);
                            setDragOverTarget(null);
                          }}
                        >
                          Move to root
                        </div>
                      )}

                      {myTabs.length === 0 && folders.length === 0 && (
                        <div className="px-2.5 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>No documents yet</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Section 2: SHARED WITH ME ── */}
            {(() => {
              // Shared tabs not in any folder (organized ones show under My Documents folders)
              const sharedTabs = tabs.filter(t => !t.deleted && !t.folderId && (t.permission === "readonly" || t.permission === "editable"));
              const openCloudIds = new Set(sharedTabs.map(t => t.cloudId).filter(Boolean));
              // All my document cloudIds — to exclude from shared section
              const myCloudIds = new Set(tabs.filter(t => !t.deleted && (!t.permission || t.permission === "mine") && t.cloudId).map(t => t.cloudId!));
              // Unread notification document IDs — for orange dot indicator
              const unreadDocIds = new Set(notifications.filter(n => !n.read && n.documentId).map(n => n.documentId));
              // Merge recentDocs + notification-based shared docs (exclude my own docs)
              const extraShared = recentDocs.filter(d => !openCloudIds.has(d.id) && !myCloudIds.has(d.id));
              const notifDocs = notifications
                .filter(n => n.type === "share" && n.documentId && !openCloudIds.has(n.documentId) && !myCloudIds.has(n.documentId) && !extraShared.some(d => d.id === n.documentId))
                .map(n => ({ id: n.documentId, title: n.documentTitle, isOwner: false, editMode: "view" }));
              const allExtra = [...extraShared, ...notifDocs];
              const totalShared = sharedTabs.length + allExtra.length;
              return (<>
                <div className="mt-3 mb-2" style={{ borderTop: "1px solid var(--border-dim)" }} />
                <div>
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none"
                    onClick={() => setShowSharedDocs(!showSharedDocs)}
                  >
                    <span className="flex-1 text-[11px] font-medium" style={{ color: showSharedDocs ? "var(--text-faint)" : "var(--text-muted)" }}>Shared with me</span>
                    {showSharedDocs && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSortMode(prev => prev === "newest" ? "oldest" : prev === "oldest" ? "az" : prev === "az" ? "za" : "newest"); }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title={`Sort: ${sortMode}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = `folder-${Date.now()}`;
                            setFolders(prev => [...prev, { id, name: "New Folder", collapsed: false, section: "shared" }]);
                            setInlineInput({ label: "Folder name", defaultValue: "New Folder", onSubmit: (name) => { setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); setInlineInput(null); }});
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title="New folder"
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1 4h5l2-2h7v11H1z"/><line x1="8" y1="7" x2="8" y2="11"/><line x1="6" y1="9" x2="10" y2="9"/></svg>
                        </button>
                      </>
                    )}
                    {!showSharedDocs && totalShared > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{totalShared}</span>}
                  </div>
                  {showSharedDocs && (
                    <div className="space-y-0.5 pt-1 pb-1 pl-2 pr-2">
                      {/* Shared tabs already open — draggable to folders */}
                      {sharedTabs.map((tab) => (
                        <div
                          key={tab.id}
                          draggable
                          onDragStart={() => setDragTabId(tab.id)}
                          onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md cursor-pointer group text-xs transition-colors ${dragOverTarget === tab.id ? "ring-1 ring-[var(--accent)]" : ""}`}
                          style={{
                            background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                            color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                            opacity: dragTabId === tab.id ? 0.4 : 1,
                          }}
                          onClick={() => tab.id !== activeTabId && switchTab(tab.id)}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                        >
                          {tab.permission === "readonly" ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0" strokeLinecap="round">
                              <rect x="4" y="8" width="8" height="6" rx="1.5"/><path d="M6 8V5.5a2 2 0 114 0V8"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.5 1.5L14.5 4.5M7 9l-1 4 4-1 6.5-6.5-3-3L7 9z"/>
                            </svg>
                          )}
                          <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                          {tab.cloudId && unreadDocIds.has(tab.cloudId) && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                          )}
                          <button onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id }); }}
                            className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", padding: "2px" }}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/></svg>
                          </button>
                        </div>
                      ))}
                      {/* Shared folders */}
                      {folders.filter(f => f.section === "shared").map(folder => {
                        const folderTabs = tabs.filter(t => !t.deleted && t.folderId === folder.id);
                        return (
                          <div key={folder.id} className="mt-0.5">
                            <div
                              className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-md cursor-pointer text-xs font-medium transition-colors group"
                              style={{ color: "var(--text-muted)" }}
                              onClick={() => setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, collapsed: !f.collapsed } : f))}
                              onDragOver={(e) => { e.preventDefault(); if (dragTabId) setDragOverTarget(folder.id); }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => { e.preventDefault(); if (dragTabId) { setTabs(prev => prev.map(t => t.id === dragTabId ? { ...t, folderId: folder.id } : t)); } setDragTabId(null); setDragOverTarget(null); }}
                            >
                              <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 -mr-1"
                                style={{ transform: folder.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                                <path d="M4 6l4 4 4-4" strokeLinecap="round"/>
                              </svg>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill={folder.collapsed ? "var(--text-faint)" : "none"} stroke="var(--text-faint)" strokeWidth="1.2" className="shrink-0"><path d="M1 4h5l2-2h7v11H1z"/></svg>
                              <span className="truncate flex-1">{folder.name}</span>
                              <span className="text-[9px] opacity-50 group-hover:opacity-0 transition-opacity ml-auto shrink-0">{folderTabs.length}</span>
                            </div>
                            {!folder.collapsed && (
                              <div className="pl-3 pr-1 space-y-0.5 mt-0.5">
                                {folderTabs.map(tab => (
                                  <div key={tab.id} draggable onDragStart={() => setDragTabId(tab.id)} onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-md cursor-pointer group text-xs transition-colors"
                                    style={{ background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent", color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)" }}
                                    onClick={() => tab.id !== activeTabId && switchTab(tab.id)}
                                  >
                                    {tab.permission === "editable" ? (
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0" strokeLinecap="round"><path d="M11.5 1.5L14.5 4.5M7 9l-1 4 4-1 6.5-6.5-3-3L7 9z"/></svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)"} strokeWidth="1.2" className="shrink-0" strokeLinecap="round"><rect x="4" y="8" width="8" height="6" rx="1.5"/><path d="M6 8V5.5a2 2 0 114 0V8"/></svg>
                                    )}
                                    <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Recent shared docs not yet open as tabs */}
                      {allExtra.map((doc) => (
                        <div
                          key={`shared-${doc.id}`}
                          role="button"
                          tabIndex={0}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md cursor-pointer group text-xs transition-colors hover:bg-[var(--accent-dim)]"
                          style={{ color: "var(--text-muted)" }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const existing = tabs.find(t => !t.deleted && t.cloudId === doc.id);
                            if (existing) { switchTab(existing.id); return; }
                            try {
                              const headers: Record<string, string> = {};
                              if (user?.id) headers["x-user-id"] = user.id;
                              const res = await fetch(`/api/docs/${doc.id}`, { headers });
                              if (!res.ok) {
                                // Remove dead doc from all lists
                                setRecentDocs(prev => prev.filter(d => d.id !== doc.id));
                                setNotifications(prev => prev.filter(n => n.documentId !== doc.id));
                                return;
                              }
                              const d = await res.json();
                              const perm = doc.editMode === "public" ? "editable" : "readonly";
                              const newId = `tab-${Date.now()}`;
                              const newTab: Tab = { id: newId, title: d.title || "Untitled", markdown: d.markdown, cloudId: doc.id, permission: perm as "mine" | "editable" | "readonly", shared: true };
                              setTabs(prev => {
                                const saved = prev.map(t => t.id !== activeTabId || t.readonly ? t : { ...t, markdown: markdownRef.current, title: extractTitleFromMd(markdownRef.current) || t.title });
                                return [...saved, newTab];
                              });
                              loadTab(newTab);
                              setDocId(doc.id);
                              setDocEditMode(d.editMode || "token");
                              setIsOwner(false);
                              setIsSharedDoc(true);
                              setTitle(d.title || "Untitled");
                            } catch { window.location.href = `/?from=${doc.id}`; }
                          }}
                        >
                          {doc.editMode === "public" ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-faint)" strokeWidth="1.2" className="shrink-0" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.5 1.5L14.5 4.5M7 9l-1 4 4-1 6.5-6.5-3-3L7 9z"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-faint)" strokeWidth="1.2" className="shrink-0" strokeLinecap="round">
                              <rect x="4" y="8" width="8" height="6" rx="1.5"/><path d="M6 8V5.5a2 2 0 114 0V8"/>
                            </svg>
                          )}
                          <span className="truncate flex-1">{doc.title || "Untitled"}</span>
                          {unreadDocIds.has(doc.id) && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                          )}
                        </div>
                      ))}
                      {totalShared === 0 && (
                        <div className="px-2.5 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>No shared documents</div>
                      )}
                    </div>
                  )}
                </div>
              </>);
            })()}

            {/* ── Section 3: TRASH ── */}
            {(() => {
              const trashTabs = tabs.filter(t => t.deleted);
              return (<>
                <div className="mt-3 mb-2" style={{ borderTop: "1px solid var(--border-dim)" }} />
                <div>
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none"
                    onClick={() => setShowTrash(!showTrash)}
                  >
                    <span className="flex-1 text-[11px] font-medium" style={{ color: showTrash ? "var(--text-faint)" : "var(--text-muted)" }}>Trash</span>
                    {!showTrash && trashTabs.length > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{trashTabs.length}</span>}
                  </div>
                  {showTrash && (
                    <div className="space-y-0.5 pt-1 pb-1 pl-2 pr-2">
                      {trashTabs.map(tab => (
                        <div key={tab.id} className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs group" style={{ color: "var(--text-faint)" }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="shrink-0 opacity-40">
                            <path d="M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/>
                            <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round"/>
                          </svg>
                          <span className="truncate flex-1 line-through opacity-60">{tab.title || "Untitled"}</span>
                          <button onClick={() => setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, deleted: false, deletedAt: undefined, folderId: undefined } : t))}
                            className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity px-1 rounded" style={{ color: "var(--accent)" }}>
                            Restore
                          </button>
                          <button onClick={() => setTabs(prev => prev.filter(t => t.id !== tab.id))}
                            className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity px-1 rounded" style={{ color: "var(--text-faint)" }}>
                            Delete
                          </button>
                        </div>
                      ))}
                      {trashTabs.length > 0 && (
                        <button
                          onClick={(e) => {
                            const btn = e.currentTarget;
                            if (btn.dataset.confirm === "true") {
                              setTabs(prev => prev.filter(t => !t.deleted));
                              btn.dataset.confirm = "";
                              btn.textContent = "Empty Trash";
                              btn.style.color = "var(--text-faint)";
                            } else {
                              btn.dataset.confirm = "true";
                              btn.textContent = `Delete ${trashTabs.length} permanently?`;
                              btn.style.color = "#ef4444";
                              setTimeout(() => { btn.dataset.confirm = ""; btn.textContent = "Empty Trash"; btn.style.color = "var(--text-faint)"; }, 3000);
                            }
                          }}
                          className="w-full text-[9px] px-2 py-1 rounded-md transition-colors text-center mt-1"
                          style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}
                        >
                          Empty Trash
                        </button>
                      )}
                      {trashTabs.length === 0 && (
                        <div className="px-2.5 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>Trash is empty</div>
                      )}
                    </div>
                  )}
                </div>
              </>);
            })()}
          </div>

          {/* Folder + Sort actions moved to section headers */}
          {/* Account section at bottom */}
          <div className="shrink-0 px-2 py-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
            {authLoading ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowAuthMenu(!showAuthMenu)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--accent-dim)]"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-5 h-5 rounded-full shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {(profile?.display_name || user?.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] truncate" style={{ color: "var(--text-primary)" }}>{profile?.display_name || user?.email?.split("@")[0]}</div>
                    <div className="text-[9px] truncate" style={{ color: "var(--text-faint)" }}>{user?.email}</div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><path d="M4 6l4 4 4-4"/></svg>
                </button>
                {showAuthMenu && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowAuthMenu(false)} />
                    <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg shadow-xl py-1 z-[9999]"
                      style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                      <div className="px-3 py-2 text-[10px]" style={{ color: "var(--text-faint)", borderBottom: "1px solid var(--border-dim)" }}>
                        <div className="font-medium" style={{ color: "var(--text-primary)" }}>{profile?.display_name}</div>
                        <div className="truncate">{user?.email}</div>
                        <div className="mt-1 px-1 py-0.5 rounded inline-block font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)", fontSize: 9 }}>
                          {(profile?.plan || "free").toUpperCase()}
                        </div>
                      </div>
                      {/* My Published Docs button removed — all docs visible in sidebar */}
                      <button
                        onClick={() => { signOut(); setShowAuthMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 12l3.5-4-3.5-4M14 8H6"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthMenu(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-xs hover:bg-[var(--accent-dim)]"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0"><circle cx="8" cy="6" r="3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
                {sidebarWidth >= 180 ? "Sign In / Sign Up" : "Sign In"}
              </button>
            )}
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
      ) : (
        /* Collapsed: just the toggle button as a narrow strip */
        <div
          className="flex flex-col shrink-0 items-center pt-1.5 gap-1"
          style={{ width: 36, borderRight: "1px solid var(--border-dim)", background: "var(--background)" }}
        >
          <div className="relative group">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="12" rx="2"/><line x1="5.5" y1="2" x2="5.5" y2="14"/></svg>
            </button>
            <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              Open sidebar
            </div>
          </div>
          <div className="relative group">
            <button
              onClick={addTab}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
            </button>
            <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              New document
            </div>
          </div>
          <div className="flex-1" />
          <div className="relative group pb-2">
            <button
              onClick={() => { setShowSidebar(true); setTimeout(() => setShowAuthMenu(true), 100); }}
              className="p-1 rounded transition-colors"
              style={{ color: isAuthenticated ? "var(--accent)" : "var(--text-faint)" }}
            >
              {isAuthenticated && profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="6" r="3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
              )}
            </button>
            <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              {isAuthenticated ? profile?.display_name || user?.email : "Sign in"}
            </div>
          </div>
        </div>
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
          pct = Math.max(25, Math.min(75, pct));
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
            className="flex flex-col"
            style={{
              background: "var(--background)",
              width: viewMode === "split" && !isMobile ? `${splitPercentRef.current}%` : "100%",
              height: viewMode === "split" && isMobile ? `${splitPercentRef.current}%` : undefined,
              flexShrink: 0,
              minWidth: viewMode === "split" && !isMobile ? 280 : undefined,
            }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-normal select-none"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)", cursor: "default" }}
              onDoubleClick={() => setViewMode(viewMode === "preview" ? "split" : "preview")}
            >
              <span className="shrink-0" style={{ color: "var(--accent)" }}>BEAUTIFIED</span>
              {/* Request to edit — for readonly shared docs */}
              {isSharedDoc && !canEdit && docId && user?.email && (
                <button
                  onClick={async () => {
                    try {
                      // Get doc owner info from server
                      const res = await fetch(`/api/docs/${docId}`, { headers: { "x-user-id": user?.id || "", "x-user-email": user.email! } });
                      if (!res.ok) return;
                      // Send request notification to owner
                      await fetch("/api/notifications", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          recipientEmail: "__owner__", // special: resolved server-side
                          type: "edit_request",
                          documentId: docId,
                          fromUserId: user.id,
                          fromUserName: user.email?.split("@")[0],
                          message: `requested edit access to "${title || "Untitled"}"`,
                        }),
                      });
                      // Show confirmation
                      setShareState("copied");
                      setTimeout(() => setShareState("idle"), 3000);
                    } catch { /* ignore */ }
                  }}
                  className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors text-[10px] font-medium"
                  style={{ background: shareState === "copied" ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.15)", color: shareState === "copied" ? "#4ade80" : "#60a5fa" }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <path d="M11.5 1.5L14.5 4.5M7 9l-1 4 4-1 6.5-6.5-3-3L7 9z"/>
                  </svg>
                  {shareState === "copied" ? "Request sent" : "Request to edit"}
                </button>
              )}
              {isSharedDoc && !isOwner && (
                <button
                  onClick={() => {
                    // Duplicate: create a new doc on server with this content — it's MY document
                    const id = `tab-${Date.now()}`;
                    const origMd = markdownRef.current;
                    const t = title ? `${title} (copy)` : "Untitled (copy)";
                    // Update the h1 in markdown to include (copy)
                    const md = origMd.replace(/^(#\s+.+)$/m, `# ${t}`);
                    const newTab: Tab = { id, title: t, markdown: md, permission: "mine", shared: false, isDraft: true };
                    setTabs(prev => [...prev, newTab]);
                    setIsSharedDoc(false);
                    setIsOwner(true);
                    setDocEditMode("owner");
                    loadTab(newTab);
                    // Auto-create on server
                    autoSave.createDocument({
                      markdown: md,
                      title: t,
                      userId: user?.id,
                      anonymousId: !user?.id ? ensureAnonymousId() : undefined,
                    }).then(result => {
                      if (result) {
                        setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, cloudId: result.id, editToken: result.editToken } : tab));
                        setDocId(result.id);
                        window.history.replaceState(null, "", `/?doc=${result.id}`);
                      }
                    });
                  }}
                  className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors text-[10px] font-medium"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg>
                  Duplicate to edit
                </button>
              )}
              <div className="flex items-center gap-2 normal-case shrink-0 flex-nowrap">
                {/* Toolbar toggle — only when editing is allowed */}
                {canEdit && <div className="relative group">
                  <button
                    onClick={() => setShowToolbar(!showToolbar)}
                    className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors"
                    style={{ background: showToolbar ? "var(--accent-dim)" : "var(--toggle-bg)", color: showToolbar ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 4h14M1 8h14M1 12h14"/><circle cx="5" cy="4" r="1.5" fill="currentColor"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="7" cy="12" r="1.5" fill="currentColor"/></svg>
                    {!renderPaneNarrow && <span className="text-[10px] font-medium">TOOLBAR</span>}
                    <span className="relative inline-flex items-center" style={{ width: 20, height: 11 }}>
                      <span className="absolute inset-0 rounded-full transition-colors" style={{ background: showToolbar ? "var(--accent)" : "var(--text-faint)", opacity: showToolbar ? 1 : 0.3 }} />
                      <span className="absolute rounded-full transition-transform" style={{ width: 7, height: 7, top: 2, background: "#fff", transform: showToolbar ? "translateX(11px)" : "translateX(2px)" }} />
                    </span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 p-2 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    Show formatting toolbar with bold, italic, headings, lists, and more.
                  </div>
                </div>}
                {/* Narrow view toggle — hidden when pane is already narrower than max-w-3xl (768px) */}
                <div className="relative group" style={{ display: isMobile || renderPaneUnderNarrowWidth ? "none" : undefined }}>
                  <button
                    onClick={() => setNarrowView(!narrowView)}
                    className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors"
                    style={{ background: narrowView ? "var(--accent-dim)" : "var(--toggle-bg)", color: narrowView ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 2v12M12 2v12M1 8h3M12 8h3" strokeLinecap="round"/><path d="M6 6.5L8 8l-2 1.5M10 6.5L8 8l2 1.5" strokeLinecap="round"/></svg>
                    {!renderPaneNarrow && <span className="text-[10px] font-medium">NARROW</span>}
                    <span className="relative inline-flex items-center" style={{ width: 20, height: 11 }}>
                      <span className="absolute inset-0 rounded-full transition-colors" style={{ background: narrowView ? "var(--accent)" : "var(--text-faint)", opacity: narrowView ? 1 : 0.3 }} />
                      <span className="absolute rounded-full transition-transform" style={{ width: 7, height: 7, top: 2, background: "#fff", transform: narrowView ? "translateX(11px)" : "translateX(2px)" }} />
                    </span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                    Limit content width for comfortable reading
                  </div>
                </div>
                {/* AI ASCII RENDER — mini toggle + hover tooltip */}
                <div className="relative group">
                  <button
                    onClick={toggleDiagramMode}
                    className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors"
                    style={{ background: diagramMode === "ai" ? "var(--accent-dim)" : "var(--toggle-bg)", color: diagramMode === "ai" ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.5 4.5L14 6l-4.5 1.5L8 12l-1.5-4.5L2 6l4.5-1.5z"/><path d="M12 10l.75 2.25L15 13l-2.25.75L12 16l-.75-2.25L9 13l2.25-.75z" opacity="0.6"/></svg>
                    {!renderPaneNarrow && <span className="text-[10px] font-medium">AI ASCII RENDER</span>}
                    <span className="relative inline-flex items-center" style={{ width: 20, height: 11 }}>
                      <span className="absolute inset-0 rounded-full transition-colors" style={{ background: diagramMode === "ai" ? "var(--accent)" : "var(--text-faint)", opacity: diagramMode === "ai" ? 1 : 0.3 }} />
                      <span className="absolute rounded-full transition-transform" style={{ width: 7, height: 7, top: 2, background: "#fff", transform: diagramMode === "ai" ? "translateX(11px)" : "translateX(2px)" }} />
                    </span>
                  </button>
                  <div className="absolute top-full right-0 mt-1 w-52 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    {diagramMode === "ai" ? (
                      <><p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>AI ASCII RENDER ON</p><p>ASCII art diagrams are automatically converted to styled visuals using AI (Gemini).</p></>
                    ) : (
                      <><p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>AI ASCII RENDER OFF</p><p>ASCII art shows as monospace text. Turn on to auto-convert box-drawing diagrams.</p></>
                    )}
                  </div>
                </div>
                {/* History toggle — only when document has been shared */}
                {docId && (
                  <div className="relative group">
                    <button
                      onClick={handleToggleHistory}
                      className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors"
                      style={{ background: showHistory ? "var(--accent-dim)" : "var(--toggle-bg)", color: showHistory ? "var(--accent)" : "var(--text-muted)" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>
                      {!renderPaneNarrow && <span className="text-[10px] font-medium">HISTORY</span>}
                      {versions.length > 0 && <span className="text-[9px] opacity-50">{versions.length}</span>}
                    </button>
                    {!showHistory && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                        Version history
                      </div>
                    )}
                  </div>
                )}
                {/* Export dropdown */}
                <div className="relative group">
                  <button
                    onClick={() => setShowExportMenu(prev => !prev)}
                    className="flex items-center justify-center h-6 px-2 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 10v3h10v-3M8 9V2M5 4.5L8 2l3 2.5"/></svg>
                  </button>
                  {!showExportMenu && (
                    <div className="absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      Export (download, print, copy)
                    </div>
                  )}
                  {showExportMenu && (
                    <div className="absolute top-full right-0 mt-1 w-56 rounded-lg shadow-xl py-1 z-[9999]"
                      style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                      {/* Download section */}
                      <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Download</div>
                      <button onClick={() => { handleDownloadMd(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/><path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round"/></svg>
                        Markdown (.md)
                      </button>
                      <button onClick={handleDownloadHtml} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M4 3.5L1.5 6L4 8.5M12 3.5l2.5 2.5L12 8.5M9 2l-2 12"/></svg>
                        HTML (.html)
                      </button>
                      <button onClick={handleDownloadTxt} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="3" y="1" width="10" height="14" rx="1"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>
                        Plain Text (.txt)
                      </button>
                      <div className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />
                      {/* Print section */}
                      <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Print</div>
                      <button onClick={() => { handleExportPdf(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1" y="5" width="14" height="7" rx="1"/><path d="M4 5V2h8v3M4 9h8v5H4z"/></svg>
                        PDF / Print
                      </button>
                      <div className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />
                      {/* Copy as section */}
                      <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Copy to Clipboard</div>
                      <button onClick={() => { handleCopyHtml(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M4 3.5L1.5 6L4 8.5M12 3.5l2.5 2.5L12 8.5"/></svg>
                        Raw HTML
                      </button>
                      <button onClick={() => { handleCopyRichText(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 8.5h4M5 11h5"/></svg>
                        Rich Text (Docs / Email)
                      </button>
                      <button onClick={() => { handleCopySlack(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 9.5a1.5 1.5 0 110-3H5v1.5A1.5 1.5 0 013.5 9.5zm3 0A1.5 1.5 0 015 8V3.5a1.5 1.5 0 113 0V8a1.5 1.5 0 01-1.5 1.5zm6-3a1.5 1.5 0 110 3H11V8a1.5 1.5 0 011.5-1.5zm-3 0A1.5 1.5 0 0111 8v4.5a1.5 1.5 0 11-3 0V8a1.5 1.5 0 011.5-1.5z"/></svg>
                        Slack (mrkdwn)
                      </button>
                      <button onClick={() => { handleCopyPlainText(); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="3" y="1" width="10" height="14" rx="1"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>
                        Plain Text
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* WYSIWYG Formatting Toolbar */}
            {/* Formatting toolbar — BEAUTIFIED MD only */}
            {showToolbar && canEdit && (
              <WysiwygToolbar
                onInsert={handleInsertBlock}
                onInsertTable={handleInsertTable}
                onInputPopup={(config) => setInlineInput({ ...config, onSubmit: (v) => { config.onSubmit(v); setInlineInput(null); } })}
                cmWrap={cmWrapSelection}
                cmInsert={cmInsertAtCursor}
                onImageUpload={() => imageFileRef.current?.click()}
              />
            )}
            <div className="flex-1 overflow-auto relative" ref={previewRef} onClick={(e) => {
              // Click on empty space below content → focus article and place cursor at end
              if (e.target === e.currentTarget) {
                const article = e.currentTarget.querySelector("article");
                if (article) {
                  article.focus();
                  // Place cursor at end of content
                  const sel = window.getSelection();
                  if (sel) {
                    const range = document.createRange();
                    range.selectNodeContents(article);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }
              }
            }}>
              <FloatingToolbar containerRef={previewRef} />
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="flex items-baseline">
                    <span className="text-lg font-extrabold" style={{ color: "var(--accent)" }}>md</span>
                    <span className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>fy</span>
                    <span className="text-lg font-extrabold" style={{ color: "var(--text-faint)" }}>.cc</span>
                  </div>
                  <div className="w-20 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border-dim)" }}>
                    <div className="h-full rounded-full" style={{ background: "var(--accent)", animation: "loadbar 1.2s ease-in-out infinite" }} />
                  </div>
                </div>
              ) : html ? (
                <article
                  ref={(el) => {
                    // Use a proper hash to detect actual content changes
                    const hash = String(html.length) + "-" + html.slice(0, 50) + html.slice(-50);
                    if (el && el.getAttribute("data-html-hash") !== hash) {
                      // Only update if change came from source (not from contentEditable editing)
                      if (!wysiwygEditingRef.current) {
                        el.innerHTML = html;
                      }
                      el.setAttribute("data-html-hash", hash);
                    }
                  }}
                  contentEditable={canEdit}
                  suppressContentEditableWarning
                  onInput={canEdit ? handleWysiwygInput : undefined}
                  onPaste={canEdit ? handleWysiwygPaste : undefined}
                  className={`mdcore-rendered focus:outline-none ${
                    viewMode === "preview" || narrowView
                      ? "p-3 sm:p-6 mx-auto max-w-3xl"
                      : "p-3 sm:p-6 max-w-none"
                  }`}
                  style={{ cursor: canEdit ? "text" : "default" }}
                />
              ) : (
                <article
                  contentEditable={canEdit}
                  suppressContentEditableWarning
                  onInput={canEdit ? handleWysiwygInput : undefined}
                  onPaste={canEdit ? handleWysiwygPaste : undefined}
                  className={`mdcore-rendered focus:outline-none ${
                    viewMode === "preview" || narrowView
                      ? "p-3 sm:p-6 mx-auto max-w-3xl"
                      : "p-3 sm:p-6 max-w-none"
                  }`}
                  style={{ cursor: "text", minHeight: "100%" }}
                  data-placeholder="true"
                  dangerouslySetInnerHTML={{ __html: "" }}
                />
              )}
              {/* ─── Version History Panel (slide-out overlay) ─── */}
              {showHistory && docId && (
                <div
                  className="absolute top-0 right-0 h-full flex flex-col z-[100]"
                  style={{
                    width: "min(320px, 100%)",
                    background: "var(--surface)",
                    borderLeft: "1px solid var(--border)",
                    boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* History header */}
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "var(--accent)" }}><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>Version History</span>
                      {versions.length > 0 && (
                        <span className="text-[9px] px-1 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{versions.length}</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowHistory(false); setPreviewVersion(null); if (previewVersion !== null) doRender(markdown); }}
                      className="flex items-center justify-center w-5 h-5 rounded transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                    </button>
                  </div>
                  {/* Version list */}
                  <div className="flex-1 overflow-y-auto">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }}><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/></svg>
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={{ color: "var(--text-faint)", marginBottom: 8 }}><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No versions yet</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>Versions are created each time you update the document.</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {versions.map((v, i) => {
                          const isCurrent = i === 0;
                          const isPreviewing = previewVersion === v.id;
                          return (
                            <div
                              key={v.id}
                              className="px-3 py-2 transition-colors cursor-pointer"
                              style={{
                                background: isPreviewing ? "var(--accent-dim)" : "transparent",
                                borderBottom: "1px solid var(--border-dim)",
                              }}
                              onClick={() => handlePreviewVersion(v.id)}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold" style={{ color: isPreviewing ? "var(--accent)" : "var(--text-primary)" }}>
                                    v{v.version_number}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[8px] px-1 py-0.5 rounded font-semibold uppercase" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>Current</span>
                                  )}
                                  {isPreviewing && (
                                    <span className="text-[8px] px-1 py-0.5 rounded font-semibold uppercase" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Previewing</span>
                                  )}
                                </div>
                                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{relativeTime(v.created_at)}</span>
                              </div>
                              {v.change_summary && (
                                <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{v.change_summary}</p>
                              )}
                              {v.title && (
                                <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-faint)" }}>{v.title}</p>
                              )}
                              {/* Restore button — not shown on current version */}
                              {!isCurrent && isOwner && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRestoreVersion(v.id); }}
                                  disabled={restoringVersion === v.id}
                                  className="mt-1.5 flex items-center gap-1 h-5 px-2 rounded text-[10px] font-medium transition-colors"
                                  style={{ background: "var(--toggle-bg)", color: "var(--text-secondary)" }}
                                >
                                  {restoringVersion === v.id ? (
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/></svg>
                                  ) : (
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8a6 6 0 1111.5-2.3"/><path d="M2 3v5h5"/></svg>
                                  )}
                                  {restoringVersion === v.id ? "Restoring..." : "Restore"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
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

        {/* Markdown pane (right/bottom) — always in DOM, hidden via CSS to keep CM6 alive */}
        <div
          data-pane="editor"
          className="flex-1 flex flex-col"
          style={{ display: viewMode === "preview" ? "none" : undefined, minWidth: viewMode === "split" && !isMobile ? 280 : undefined }}
        >
            <div
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-normal select-none"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)", cursor: "default" }}
              onDoubleClick={() => setViewMode(viewMode === "editor" ? "split" : "editor")}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="shrink-0" style={{ color: "var(--accent)" }}>MDFIED</span>
                {/* Flavor badge — click to convert */}
                <div className="relative">
                  <button
                    onClick={() => setShowFlavorMenu(!showFlavorMenu)}
                    className="px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors hover:brightness-110"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    {flavor.toUpperCase()} ▾
                  </button>
                  {showFlavorMenu && (
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setShowFlavorMenu(false)} />
                      <div className="absolute top-full left-0 mt-1 w-56 rounded-lg shadow-xl py-1 z-[9999]"
                        style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                        <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                          Current: {{ gfm: "GitHub Flavored", commonmark: "CommonMark", obsidian: "Obsidian", mdx: "MDX", pandoc: "Pandoc" }[flavor] || flavor}
                        </div>
                        <div className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />
                        <div className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Convert to</div>
                        {[
                          { id: "gfm", name: "GFM (GitHub)", desc: "Tables, task lists, strikethrough, autolinks" },
                          { id: "commonmark", name: "CommonMark", desc: "Standard Markdown — maximum compatibility" },
                          { id: "obsidian", name: "Obsidian", desc: "Wikilinks, callouts, embeds" },
                        ].filter(f => f.id !== flavor).map(target => (
                          <button
                            key={target.id}
                            onClick={async (e) => {
                              const md = markdownRef.current;
                              let converted = md;
                              // Conversion rules
                              if (flavor === "obsidian" && target.id !== "obsidian") {
                                // [[wikilinks]] → [text](text)
                                converted = converted.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "[$2]($1)");
                                converted = converted.replace(/\[\[([^\]]+)\]\]/g, "[$1]($1)");
                                // > [!note] callouts → > **Note:**
                                converted = converted.replace(/^>\s*\[!(\w+)\]\s*(.*)$/gm, "> **$1:** $2");
                              }
                              if (target.id === "obsidian" && flavor !== "obsidian") {
                                // [text](url) where text === url → [[text]]
                                converted = converted.replace(/\[([^\]]+)\]\(\1\)/g, "[[$1]]");
                              }
                              if (flavor === "mdx") {
                                // Remove JSX components
                                converted = converted.replace(/<[A-Z]\w+[^>]*\/>/g, "");
                                converted = converted.replace(/<[A-Z]\w+[^>]*>[\s\S]*?<\/[A-Z]\w+>/g, "");
                                // Remove import statements
                                converted = converted.replace(/^import\s+.*$/gm, "");
                                // Remove export default
                                converted = converted.replace(/^export\s+default\s+.*$/gm, "");
                              }
                              if (target.id === "commonmark") {
                                // Strikethrough ~~text~~ → text (not in CommonMark)
                                converted = converted.replace(/~~([^~]+)~~/g, "$1");
                                // Task lists → plain lists
                                converted = converted.replace(/^(\s*)- \[[ x]\] /gm, "$1- ");
                              }
                              // Clean up excessive blank lines
                              converted = converted.replace(/\n{3,}/g, "\n\n").trim();
                              if (converted === md) {
                                // Nothing to convert — show inline feedback on the clicked button
                                const btn = e.currentTarget as HTMLElement;
                                const orig = btn.innerHTML;
                                btn.innerHTML = `<div style="color:var(--accent);font-size:10px;padding:4px 0;text-align:center;font-weight:600">Already compatible</div>`;
                                setTimeout(() => { btn.innerHTML = orig; }, 1500);
                                return;
                              }
                              setShowFlavorMenu(false);
                              setMarkdown(converted);
                              cmSetDoc(converted);
                              doRender(converted);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            <div style={{ color: "var(--text-primary)" }}>{target.name}</div>
                            <div className="text-[9px]" style={{ color: "var(--text-faint)" }}>{target.desc}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {Object.entries(flavorDetails).filter(([,v])=>v).map(([key]) => (
                  <div key={key} className="relative group hidden sm:block">
                    <span className="px-1 py-0.5 rounded font-mono" style={{ background: "var(--badge-muted-bg)", color: "var(--badge-muted-color)" }}>+{key}</span>
                    <div className="absolute top-full left-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      {key === "math" ? "Math equations detected (KaTeX)" : key === "mermaid" ? "Mermaid diagrams detected" : key === "wikilinks" ? "Wiki-style links detected" : key === "jsx" ? "JSX/MDX syntax detected" : `${key} detected`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 normal-case shrink-0 flex-nowrap">
                {/* Narrow view toggle — hidden when pane is already narrower than max-w-3xl (768px) */}
                <div className="relative group" style={{ display: isMobile || editorPaneUnderNarrowWidth ? "none" : undefined }}>
                  <button
                    onClick={() => setNarrowSource(!narrowSource)}
                    className="flex items-center gap-1.5 h-6 px-2 rounded-md transition-colors"
                    style={{ background: narrowSource ? "var(--accent-dim)" : "var(--toggle-bg)", color: narrowSource ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 2v12M12 2v12M1 8h3M12 8h3" strokeLinecap="round"/><path d="M6 6.5L8 8l-2 1.5M10 6.5L8 8l2 1.5" strokeLinecap="round"/></svg>
                    {!editorPaneNarrow && <span className="text-[10px] font-medium">NARROW</span>}
                    <span className="relative inline-flex items-center" style={{ width: 20, height: 11 }}>
                      <span className="absolute inset-0 rounded-full transition-colors" style={{ background: narrowSource ? "var(--accent)" : "var(--text-faint)", opacity: narrowSource ? 1 : 0.3 }} />
                      <span className="absolute rounded-full transition-transform" style={{ width: 7, height: 7, top: 2, background: "#fff", transform: narrowSource ? "translateX(11px)" : "translateX(2px)" }} />
                    </span>
                  </button>
                  <div className="absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                    Limit content width for comfortable editing
                  </div>
                </div>
                {/* Copy MD */}
                <div className="relative group">
                  <button
                    onClick={() => { navigator.clipboard.writeText(markdownRef.current); }}
                    className="flex items-center justify-center h-6 px-2 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>Copy raw Markdown</div>
                </div>
                {/* Download .md */}
                <div className="relative group">
                  <button
                    onClick={handleDownloadMd}
                    className="flex items-center justify-center h-6 px-2 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"/></svg>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>Download as .md file</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <div
                ref={editorContainerRef}
                className={narrowSource ? "max-w-3xl mx-auto h-full" : "h-full"}
              />
            </div>
          </div>
      </div>
      </div>{/* end main content wrapper */}

      {/* Inline input popup (replaces all prompt() dialogs) */}
      {inlineInput && (
        <InlineInput
          label={inlineInput.label}
          defaultValue={inlineInput.defaultValue}
          onSubmit={inlineInput.onSubmit}
          onCancel={() => setInlineInput(null)}
          position={inlineInput.position}
        />
      )}

      {/* Footer — Left: Help + links, Right: stats + badges */}
      <footer
        className="flex items-center justify-between px-3 sm:px-5 py-1.5 text-[10px] font-mono"
        style={{ borderTop: "1px solid var(--border-dim)", color: "var(--text-muted)" }}
      >
        {/* Left: Help + navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative group">
            <button className="transition-colors" style={{ color: "var(--text-muted)" }}>Help</button>
            <div className="absolute bottom-full left-0 mb-1 w-72 p-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
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
              <div className="my-2" style={{ borderTop: "1px solid var(--border-dim)" }} />
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>Import</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {["MD", "PDF", "DOCX", "PPTX", "XLSX", "HTML", "CSV", "LaTeX", "RST", "RTF", "JSON", "XML", "TXT"].map(f => (
                  <span key={f} className="px-1 py-0.5 rounded font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)", fontSize: 9 }}>{f}</span>
                ))}
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Drag & drop or use IMPORT in sidebar</p>
              <div className="my-2" style={{ borderTop: "1px solid var(--border-dim)" }} />
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>Export</p>
              <div className="space-y-0.5 text-[10px]">
                {[
                  ["Download", "MD, HTML, TXT"],
                  ["Print", "PDF"],
                  ["Clipboard", "HTML, Rich Text, Slack, Plain"],
                ].map(([cat, fmts]) => (
                  <div key={cat} className="flex justify-between">
                    <span style={{ color: "var(--text-faint)" }}>{cat}</span>
                    <span>{fmts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <a href="/about" className="transition-colors" style={{ color: "var(--text-muted)" }}>About</a>
          <a href="/plugins" className="transition-colors" style={{ color: "var(--text-muted)" }}>Plugins</a>
          <a href="https://github.com/raymindai/mdcore" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://mdcore.ai" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer">mdcore.ai</a>
        </div>
        {/* Right: stats + engine badges */}
        <div className="flex items-center gap-3 shrink-0">
          <span>{wordCount.toLocaleString()} words</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span>{charCount.toLocaleString()} chars</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span>{lineCount.toLocaleString()} lines</span>
          {/* Flavor badges moved to SOURCE MD header */}
          <div className="relative group hidden sm:block">
            <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>RUST+WASM</span>
            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              Rendered by mdcore engine (comrak, Rust compiled to WebAssembly)
            </div>
          </div>
          <div className="relative group hidden sm:block">
            <span className="flex items-center gap-0.5" style={{ color: "var(--accent)" }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z"/></svg>
              {renderTime.toFixed(0)}ms
            </span>
            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
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
            width: 160,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {[
            { label: "Rename", action: () => {
              const tab = tabs.find(t => t.id === docContextMenu.tabId);
              if (!tab) return;
              setInlineInput({
                label: "Document name",
                defaultValue: tab.title,
                onSubmit: (trimmed) => {
                  setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: trimmed } : t));
                  if (tab.id === activeTabId) {
                    const md = markdownRef.current;
                    const lines = md.split("\n");
                    const h1Idx = lines.findIndex(l => /^#\s+/.test(l));
                    if (h1Idx >= 0) { lines[h1Idx] = `# ${trimmed}`; }
                    else { lines.unshift(`# ${trimmed}`, ""); }
                    const newMd = lines.join("\n");
                    setMarkdown(newMd);
                    doRender(newMd);
                    setTitle(trimmed);
                  }
                  setInlineInput(null);
                },
              });
            }},
            { label: "Duplicate", action: () => {
              const tab = tabs.find(t => t.id === docContextMenu.tabId);
              if (tab) {
                const id = `tab-${tabIdCounter++}`;
                const t = tab.title + " (copy)";
                setTabs(prev => [...prev, { id, title: t, markdown: tab.markdown, permission: "mine", shared: false, isDraft: true }]);
                autoSave.createDocument({
                  markdown: tab.markdown,
                  title: t,
                  userId: user?.id,
                  anonymousId: !user?.id ? ensureAnonymousId() : undefined,
                }).then(result => {
                  if (result) {
                    setTabs(prev => prev.map(x => x.id === id ? { ...x, cloudId: result.id, editToken: result.editToken } : x));
                  }
                });
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
            ...folders.map(f => ({
              label: `Move to ${f.name}`,
              action: () => setTabs(prev => prev.map(t => t.id === docContextMenu.tabId ? { ...t, folderId: f.id } : t)),
            })),
            ...(tabs.find(t => t.id === docContextMenu.tabId)?.folderId ? [{
              label: "Move to root",
              action: () => setTabs(prev => prev.map(t => t.id === docContextMenu.tabId ? { ...t, folderId: undefined } : t)),
            }] : []),
            ...(tabs.filter(t => !t.deleted).length > 1 ? [{ label: "Move to Trash", action: () => {
              setTabs(prev => prev.map(t => t.id === docContextMenu.tabId ? { ...t, deleted: true, deletedAt: Date.now() } : t));
              if (docContextMenu.tabId === activeTabId) {
                const remaining = tabs.filter(t => !t.deleted && t.id !== docContextMenu.tabId);
                if (remaining.length) switchTab(remaining[0].id);
              }
            }, danger: true }] : []),
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

      {/* mdfy AI structuring prompt */}
      {/* Sign In / Sign Up modal */}
      {showAuthMenu && !isAuthenticated && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => { setShowAuthMenu(false); setAuthEmailSent(false); }}>
          <div className="rounded-xl w-[560px] max-w-[90vw] max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 16px 64px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Sign in to <span style={{ color: "var(--accent)" }}>mdfy</span>.cc
              </h2>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Save, sync, and publish your documents</p>
            </div>

            {/* OAuth buttons */}
            <div className="px-6 space-y-2">
              <button
                onClick={() => { signInWithGoogle(); setShowAuthMenu(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-colors hover:brightness-110"
                style={{ background: "#4285F4", color: "#fff" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <button
                onClick={() => { signInWithGitHub(); setShowAuthMenu(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-colors hover:brightness-110"
                style={{ background: "#24292f", color: "#fff" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                Continue with GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 px-6 my-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-dim)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>OR</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-dim)" }} />
            </div>

            {/* Email */}
            <div className="px-6 mb-4">
              {authEmailSent ? (
                <div className="text-[12px] text-center py-3 rounded-lg" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                  Check your email for the login link
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && authEmailInput.trim()) {
                        const { error } = await signInWithEmail(authEmailInput.trim());
                        if (!error) setAuthEmailSent(true);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                  <button
                    onClick={async () => {
                      if (authEmailInput.trim()) {
                        const { error } = await signInWithEmail(authEmailInput.trim());
                        if (!error) setAuthEmailSent(true);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    Send Link
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px mx-6" style={{ background: "var(--border-dim)" }} />

            {/* Tiers comparison */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-3 gap-2">
                {/* Without account */}
                <div className="rounded-lg p-3" style={{ border: "1px solid var(--border-dim)", opacity: 0.6 }}>
                  <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-faint)" }}>No Account</div>
                  <ul className="space-y-1.5 text-[9px]" style={{ color: "var(--text-faint)" }}>
                    <li className="flex items-start gap-1"><span>+</span>Instant rendering</li>
                    <li className="flex items-start gap-1"><span>+</span>Import / Export</li>
                    <li className="flex items-start gap-1"><span>+</span>Share via hash URL</li>
                    <li className="flex items-start gap-1"><span>-</span>Local only</li>
                    <li className="flex items-start gap-1"><span>-</span>No cloud sync</li>
                    <li className="flex items-start gap-1"><span>-</span>No short URLs</li>
                  </ul>
                </div>
                {/* Free tier */}
                <div className="rounded-lg p-3" style={{ border: "1px solid var(--border-dim)" }}>
                  <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>Free</div>
                  <ul className="space-y-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Unlimited documents</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Cloud sync</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Short URL sharing</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>AI mdfy structuring</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--text-faint)" }}>-</span><span style={{ color: "var(--text-faint)" }}>7-day expiry</span></li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--text-faint)" }}>-</span><span style={{ color: "var(--text-faint)" }}>mdfy.cc badge</span></li>
                  </ul>
                </div>
                {/* Pro tier */}
                <div className="rounded-lg p-3" style={{ border: "1px solid var(--accent)" }}>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>Pro</span>
                    <span className="text-[8px] px-1 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>$8/mo</span>
                    <span className="text-[8px] px-1 py-0.5 rounded-full font-medium" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>COMING SOON</span>
                  </div>
                  <ul className="space-y-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Everything in Free</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>No expiry</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>No badge</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Custom domain</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>View analytics</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Password protect</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Priority AI mdfy</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 text-center">
              <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                Sign up is free. No credit card required.
              </p>
            </div>
          </div>
        </div>
      )}

      {mdfyPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => !mdfyLoading && setMdfyPrompt(null)}>
          <div className="rounded-xl p-5 w-80" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <div className="mb-3">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}><span style={{ color: "var(--accent)" }}>mdfy</span> this document?</span>
            </div>
            <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
              This file was imported as raw text — all formatting (headings, lists, tables, emphasis) was lost during extraction.
            </p>
            <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--accent)" }}>mdfy</strong> uses AI to detect the original structure and rebuild it as clean Markdown — headings, bullet points, tables, code blocks, and more.
            </p>
            <div className="flex gap-2">
              <button
                disabled={mdfyLoading}
                onClick={() => setMdfyPrompt(null)}
                className="flex-1 px-3 py-2 rounded-md text-[11px] font-medium transition-colors"
                style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              >
                Keep Raw
              </button>
              <button
                disabled={mdfyLoading}
                onClick={async () => {
                  setMdfyLoading(true);
                  try {
                    const structured = await mdfyText(mdfyPrompt.text, mdfyPrompt.filename);
                    // Update the tab with structured markdown
                    setTabs(prev => prev.map(t => t.id === mdfyPrompt.tabId ? { ...t, markdown: structured } : t));
                    if (mdfyPrompt.tabId === activeTabId) {
                      setMarkdown(structured);
                      doRender(structured);
                    }
                  } catch (err) {
                    console.error("mdfy failed:", err);
                  }
                  setMdfyLoading(false);
                  setMdfyPrompt(null);
                }}
                className="flex-1 px-3 py-2 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                {mdfyLoading ? (
                  <>
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>mdfy it</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar context menu */}
      {sidebarContextMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setSidebarContextMenu(null)} />
          <div className="fixed rounded-lg shadow-xl py-1" style={{ left: sidebarContextMenu.x, top: sidebarContextMenu.y, zIndex: 9999, background: "var(--menu-bg)", border: "1px solid var(--border)", width: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <button onClick={() => { addTab(); setSidebarContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>New Document</button>
            <button onClick={() => {
              const id = `folder-${Date.now()}`;
              setFolders(prev => [...prev, { id, name: "New Folder", collapsed: false }]);
              setInlineInput({ label: "Folder name", defaultValue: "New Folder", onSubmit: (name) => { setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); setInlineInput(null); }});
              setSidebarContextMenu(null);
            }} className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>New Folder</button>
            <div className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />
            <button onClick={() => {
              const fId = `folder-examples-${Date.now()}`;
              const t = Date.now();
              const newTabs = [
                { id: `tab-${t}-1`, title: extractTitleFromMd(SAMPLE_WELCOME), markdown: SAMPLE_WELCOME, folderId: fId },
                { id: `tab-${t}-2`, title: extractTitleFromMd(SAMPLE_IMPORT_EXPORT), markdown: SAMPLE_IMPORT_EXPORT, folderId: fId },
                { id: `tab-${t}-3`, title: extractTitleFromMd(SAMPLE_FEATURES), markdown: SAMPLE_FEATURES, folderId: fId },
                { id: `tab-${t}-4`, title: extractTitleFromMd(SAMPLE_FORMATTING), markdown: SAMPLE_FORMATTING, folderId: fId },
                { id: `tab-${t}-5`, title: extractTitleFromMd(SAMPLE_DIAGRAMS), markdown: SAMPLE_DIAGRAMS, folderId: fId },
                { id: `tab-${t}-6`, title: extractTitleFromMd(SAMPLE_ASCII), markdown: SAMPLE_ASCII, folderId: fId },
              ];
              setFolders(prev => [...prev, { id: fId, name: "Examples", collapsed: false }]);
              setTabs(prev => [...prev, ...newTabs]);
              setSidebarContextMenu(null);
            }} className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>Restore Examples</button>
          </div>
        </>
      )}

      {/* Folder context menu */}
      {folderContextMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setFolderContextMenu(null)} />
          <div
            className="fixed rounded-lg shadow-xl py-1"
            style={{
              left: folderContextMenu.x,
              top: folderContextMenu.y,
              zIndex: 9999,
              background: "var(--menu-bg)",
              border: "1px solid var(--border)",
              width: 160,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {[
              { label: "Rename", action: () => {
                const folder = folders.find(f => f.id === folderContextMenu.folderId);
                if (!folder) return;
                setInlineInput({ label: "Folder name", defaultValue: folder.name, onSubmit: (name) => {
                  setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name } : f));
                  setInlineInput(null);
                }});
              }},
              { label: "Collapse / Expand", action: () => {
                setFolders(prev => prev.map(f => f.id === folderContextMenu.folderId ? { ...f, collapsed: !f.collapsed } : f));
              }},
              { label: "Delete folder", action: () => {
                setFolderContextMenu(prev => prev ? { ...prev, confirmDelete: true } : null);
              }, danger: true, noClose: true },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); if (!(item as { noClose?: boolean }).noClose) setFolderContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: (item as { danger?: boolean }).danger ? "#ef4444" : "var(--text-secondary)" }}
              >
                {item.label}
              </button>
            ))}
            {folderContextMenu.confirmDelete && (
              <>
                <div className="px-3 py-1.5 text-[10px]" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-dim)" }}>
                  Documents will be moved to root.
                </div>
                <div className="flex gap-1 px-2 pb-1">
                  <button onClick={() => setFolderContextMenu(null)} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}>Cancel</button>
                  <button onClick={() => {
                    setTabs(prev => prev.map(t => t.folderId === folderContextMenu.folderId ? { ...t, folderId: undefined } : t));
                    setFolders(prev => prev.filter(f => f.id !== folderContextMenu.folderId));
                    setFolderContextMenu(null);
                  }} className="flex-1 px-2 py-1 rounded text-[10px]" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Delete</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Share Modal */}
      {showShareModal && (docId || tabs.find(t => t.id === activeTabId)?.cloudId) && user && (
        <ShareModal
          docId={(docId || tabs.find(t => t.id === activeTabId)?.cloudId)!}
          title={title}
          userId={user.id}
          ownerEmail={user.email || ""}
          currentEditMode={docEditMode}
          initialAllowedEmails={allowedEmails}
          initialAllowedEditors={allowedEditors}
          onClose={() => setShowShareModal(false)}
          onEditModeChange={(mode) => { setDocEditMode(mode); setEditMode(mode); }}
          onAllowedEmailsChange={setAllowedEmailsState}
        />
      )}

      {/* QR Code Modal */}
      {showQr && docId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
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
          className="fixed inset-0 z-[9999] flex items-center justify-center"
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
                  newMarkdown = markdown ? markdown + "\n\n" + md + "\n" : md + "\n";
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
          className="fixed inset-0 z-[9999] flex items-center justify-center"
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
                let newMarkdown: string;
                if (mathOriginalRef.current && markdown.includes(mathOriginalRef.current)) {
                  // Replace existing math expression
                  newMarkdown = markdown.replace(mathOriginalRef.current, md);
                } else {
                  // Insert new
                  newMarkdown = markdown ? markdown + "\n\n" + md + "\n" : md + "\n";
                }
                setMarkdown(newMarkdown);
                doRender(newMarkdown);
                setInitialMath(undefined);
                mathOriginalRef.current = null;
                setShowMathModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
