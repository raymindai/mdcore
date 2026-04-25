"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import katex from "katex";
import { htmlToMarkdown, isHtmlContent } from "@/lib/html-to-md";
import {
  isAiConversation,
  parseConversation,
  formatConversation,
} from "@/lib/ai-conversation";
import MdCanvas from "@/components/MdCanvas";
import MdfyLogo from "@/components/MdfyLogo";
import MathEditor from "@/components/MathEditor";
import DocStatusIcon from "@/components/DocStatusIcon";
import { extractTitleFromMd } from "@/lib/extract-title";
import { useCodeMirror } from "@/components/useCodeMirror";
import FloatingToolbar from "@/components/FloatingToolbar";
import ShareModal from "@/components/ShareModal";
import ToastContainer, { showToast } from "@/components/Toast";
import { importFile, getSupportedAcceptString, mdfyText } from "@/lib/file-import";
import { isCliOutput, cliToMarkdown } from "@/lib/cli-to-md";
import {
  Undo2, Redo2, List, ListOrdered, Indent, Outdent, Quote, Minus, Link,
  Image as ImageIcon, RemoveFormatting, Table, Code, ChevronDown, Pencil, Copy, Eye,
  Columns2, Bell, Share2, Menu, PanelLeft, Download, Plus, ArrowUpDown,
  FolderPlus, Folder, FolderOpen, File as FileIcon, MoreHorizontal,
  User, Users, Search, X, Trash2, RefreshCw, Lock, ShieldAlert, FileX,
  LogOut, HelpCircle, Clock, Upload, FileText, Sparkles, Zap, Loader2, RotateCcw, AlignLeft, BookOpen, CircleCheck,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { buildAuthHeaders } from "@/lib/auth-fetch";
import { useAutoSave } from "@/lib/useAutoSave";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { usePresence } from "@/lib/usePresence";
import { useCollaboration } from "@/lib/useCollaboration";
import { getAnonymousId, ensureAnonymousId, clearAnonymousId } from "@/lib/anonymous-id";
import {
  createShareUrl,
  createShortUrl,
  saveEditToken,
  getEditToken,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  restoreDocument,
  rotateEditToken,
  extractFromUrl,
  copyToClipboard,
  fetchVersions,
  fetchVersion,
} from "@/lib/share";

// ─── Sample documents for default tabs ───

const SAMPLE_WELCOME = `# Welcome to mdfy.cc

> **Your Markdown, Beautifully Published.**
> Import anything. Render beautifully. Share instantly.

## Get Started

1. **Type or paste** anything — Markdown, plain text, Claude Code output
2. **Import** files — PDF, Word, PowerPoint, Excel, HTML, CSV, LaTeX, and more
3. **Edit** inline in the Live view, or use Source for raw Markdown
4. **Share** with one click — generates a short URL like \`mdfy.cc/abc123\`

## What You Can Do

- **WYSIWYG editing** — click any text in the Live view and start typing
- **AI Tools** — Polish, Summary, TL;DR, Translate, Chat (right panel)
- **Document Outline** — heading structure panel on the right
- **Image Gallery** — upload, manage, and insert images (right panel)
- **Multi-format import** — drag & drop PDF, DOCX, PPTX, XLSX, or 10+ other formats
- **Export anywhere** — download as MD/HTML/TXT, print PDF, copy for Docs/Email/Slack
- **Flavor conversion** — click the flavor badge (GFM ▾) to convert between formats
- **Folders + Trash** — organize with folders, drag to move, soft delete with restore
- **Cross-platform sync** — edit on Web, VS Code, Mac Desktop, or CLI. Same URL everywhere

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

## Try It Now

- **Drop a PDF here** — see AI mdfy turn it into clean Markdown
- **Click +** in the sidebar to start a new doc from a template
- **Sign in** (sidebar bottom) for cloud sync and short URL sharing — free during the beta, no credit card

---

*Powered by **mdcore engine** — Rust + WASM*
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
import requests

response = requests.post("https://mdfy.cc/api/docs", json={
    "markdown": "# Hello World",
})
print(response.json()["id"])  # → "abc123"
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

> Click **"Convert to Mermaid"** on any ASCII diagram to transform it into a rendered Mermaid chart.

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

## Free During Beta

Everything is unlocked while we're testing — no credit card required.

\`\`\`
┌─ Beta (everyone) ──────┐
│ Unlimited documents    │
│ Documents never expire │
│ Cloud sync             │
│ Short URL sharing      │
│ AI mdfy structuring    │
│ All formats supported  │
└────────────────────────┘
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

Click the **Export** icon in the Live view header.

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

Click anywhere in the **Live** view to start editing. Format with the toolbar or keyboard shortcuts.

> No need to learn Markdown syntax — just type naturally.

## Flavor Detection & Conversion

mdfy.cc auto-detects your Markdown flavor:

- **GFM** — GitHub Flavored Markdown (tables, task lists, strikethrough)
- **CommonMark** — Standard, maximum compatibility
- **Obsidian** — Wikilinks, callouts, embeds
- **MDX** — Markdown + JSX components
- **Pandoc** — Citations, footnotes, definition lists

Click the **flavor badge** (e.g. \`GFM ▾\`) in the Source header to convert between flavors.

## CLI Output Support

Paste output from **Claude Code** or any terminal — unicode tables and checkmarks auto-convert:

Before (terminal output):

\`\`\`
┌──────────┬────────┐
│ Feature  │ Status │
├──────────┼────────┤
│ Auth     │ Done   │
│ Export   │ Done   │
└──────────┴────────┘
\`\`\`

After (auto-converted):

| Feature | Status |
|---------|--------|
| Auth    | Done   |
| Export  | Done   |

## AI Tools

Click the **AI** button in the header to open the AI panel:

- **Polish** — improve writing quality and clarity
- **Summary** — generate a concise summary at the top
- **TL;DR** — extract key bullet points
- **Translate** — translate to any language
- **Chat** — type a natural language instruction to edit the document

Changes are highlighted in orange and fade after 3 seconds.

## Document Outline

Click the **Outline** button to see your document structure. All headings (H1-H6) are listed with hierarchy. Click any heading to scroll directly to it.

## Image Gallery

Click the **Image** button to open the gallery panel:

- Upload images (WebP auto-conversion, max 10MB per file)
- Click any image to insert at cursor position
- Storage quota: Free 20MB, Pro 1GB

## Narrow View

Toggle **Narrow View** in the panel header to constrain content width for comfortable reading.

## Folders & Organization

- Create folders via **New Folder** at sidebar bottom
- **Right-click** documents to move to folders
- **Trash** section with restore and permanent delete
- **Sort** by newest, oldest, A-Z, Z-A

## Cross-Platform

Your documents sync across all mdfy channels:

- **Web** — mdfy.cc
- **VS Code** — Extension with WYSIWYG preview
- **Mac Desktop** — Native app with sidebar
- **CLI** — \`npm install -g mdfy-cli\`
- **Chrome Extension** — Capture from ChatGPT, Claude, Gemini
- **MCP Server** — AI agents create/read/update documents
`;

/** Truncate title respecting grapheme clusters (emoji-safe) */
function truncateTitle(title: string, max: number): string {
  if (title.length <= max) return title;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const segments = [...segmenter.segment(title)];
    if (segments.length <= max) return title;
    return segments.slice(0, max).map(s => s.segment).join("") + "...";
  }
  return title.slice(0, max) + "...";
}

/** DiceBear identicon avatar URL — fallback when no profile/OAuth avatar */
function dicebearUrl(seed: string, size = 40): string {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}
/** Resolve best avatar: profile DB → OAuth metadata → DiceBear */
function resolveAvatar(profile: { avatar_url?: string | null } | null, user: { email?: string; user_metadata?: { avatar_url?: string } } | null, size = 40): string {
  return profile?.avatar_url || user?.user_metadata?.avatar_url || dicebearUrl(user?.email || "user", size);
}

// DocStatusIcon → @/components/DocStatusIcon
// extractTitleFromMd → @/lib/extract-title

// ─── Document Templates ───

const DOCUMENT_TEMPLATES: { name: string; icon: string; markdown: string }[] = [
  {
    name: "Blank",
    icon: "M4 2h8l4 4v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z",
    markdown: "# Untitled\n\n",
  },
  {
    name: "Meeting Notes",
    icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
    markdown: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Attendees:**

---

## Agenda

1.
2.
3.

## Discussion

### Topic 1



### Topic 2



## Action Items

- [ ]
- [ ]
- [ ]

## Next Meeting

**Date:** TBD
`,
  },
  {
    name: "Report",
    icon: "M9 17v-2m3 2v-4m3 4v-6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
    markdown: `# Report Title

**Author:**
**Date:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

---

## Executive Summary



## Background



## Findings

### Finding 1



### Finding 2



## Recommendations

1.
2.
3.

## Conclusion

`,
  },
  {
    name: "README",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    markdown: `# Project Name

> Short description of the project.

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`javascript
import { feature } from 'project-name';

feature();
\`\`\`

## API

### \`feature(options)\`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`option1\` | \`string\` | \`""\` | Description |
| \`option2\` | \`boolean\` | \`false\` | Description |

## Contributing

1. Fork the repo
2. Create your feature branch (\`git checkout -b feature/amazing\`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT
`,
  },
  {
    name: "Blog Post",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    markdown: `# Blog Post Title

*Published on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*

---

Introduction paragraph that hooks the reader.

## The Problem



## The Solution



## How It Works

### Step 1



### Step 2



### Step 3



## Results



## Conclusion



---

*Thanks for reading! Share this post if you found it useful.*
`,
  },
  {
    name: "AI Conversation",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    markdown: `# AI Conversation Summary

**AI:** ChatGPT / Claude / Gemini
**Date:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Topic:**

---

## Key Takeaways

1.
2.
3.

## Conversation

### Prompt 1

>

### Response 1



### Prompt 2

>

### Response 2



## Follow-up Questions

- [ ]
- [ ]
`,
  },
];

const EXAMPLE_OWNER = "master@mdfy.cc";
const EXAMPLES_FOLDER_ID = "folder-shared-examples";

const INITIAL_FOLDERS: Folder[] = [];

const EXAMPLE_TABS: Tab[] = [
  { id: "tab-welcome", title: extractTitleFromMd(SAMPLE_WELCOME), markdown: SAMPLE_WELCOME, readonly: true, permission: "readonly", ownerEmail: EXAMPLE_OWNER },
  { id: "tab-import", title: extractTitleFromMd(SAMPLE_IMPORT_EXPORT), markdown: SAMPLE_IMPORT_EXPORT, readonly: true, permission: "readonly", ownerEmail: EXAMPLE_OWNER },
  { id: "tab-features", title: extractTitleFromMd(SAMPLE_FEATURES), markdown: SAMPLE_FEATURES, readonly: true, permission: "readonly", ownerEmail: EXAMPLE_OWNER },
  { id: "tab-syntax", title: extractTitleFromMd(SAMPLE_FORMATTING), markdown: SAMPLE_FORMATTING, readonly: true, permission: "readonly", ownerEmail: EXAMPLE_OWNER },
  { id: "tab-diagrams", title: extractTitleFromMd(SAMPLE_DIAGRAMS), markdown: SAMPLE_DIAGRAMS, readonly: true, permission: "readonly", ownerEmail: EXAMPLE_OWNER },
  { id: "tab-ascii", title: extractTitleFromMd(SAMPLE_ASCII), markdown: SAMPLE_ASCII, readonly: true, permission: "readonly", ownerEmail: EXAMPLE_OWNER },
];

const INITIAL_TABS: Tab[] = [
  ...EXAMPLE_TABS,
];

type ViewMode = "split" | "preview" | "editor";

type Theme = "dark" | "light";

type AccentColor = "orange" | "blue" | "purple" | "pink" | "green" | "teal" | "red" | "yellow";

type ColorScheme = "default" | "nord" | "dracula" | "solarized" | "monokai" | "onedark";

const ACCENT_COLORS: { name: AccentColor; label: string; dark: string; light: string }[] = [
  { name: "orange", label: "Orange", dark: "#fb923c", light: "#ea580c" },
  { name: "blue", label: "Blue", dark: "#60a5fa", light: "#2563eb" },
  { name: "purple", label: "Purple", dark: "#a78bfa", light: "#7c3aed" },
  { name: "pink", label: "Pink", dark: "#f472b6", light: "#ec4899" },
  { name: "green", label: "Green", dark: "#4ade80", light: "#16a34a" },
  { name: "teal", label: "Teal", dark: "#2dd4bf", light: "#0d9488" },
  { name: "red", label: "Red", dark: "#f87171", light: "#dc2626" },
  { name: "yellow", label: "Yellow", dark: "#fbbf24", light: "#d97706" },
];

const COLOR_SCHEMES: { name: ColorScheme; label: string; preview: string }[] = [
  { name: "default", label: "Default", preview: "#fb923c" },
  { name: "nord", label: "Nord", preview: "#88c0d0" },
  { name: "dracula", label: "Dracula", preview: "#ff79c6" },
  { name: "solarized", label: "Solarized", preview: "#2aa198" },
  { name: "monokai", label: "Monokai", preview: "#ffd866" },
  { name: "onedark", label: "One Dark", preview: "#61afef" },
];

// Mapping from scheme to its natural accent color name
const SCHEME_ACCENT_MAP: Record<ColorScheme, AccentColor> = {
  default: "orange",
  nord: "teal",
  dracula: "pink",
  solarized: "teal",
  monokai: "yellow",
  onedark: "blue",
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mdfy-theme") as Theme) || "dark";
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window === "undefined") return "orange";
    return (localStorage.getItem("mdfy-accent") as AccentColor) || "orange";
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window === "undefined") return "default";
    return (localStorage.getItem("mdfy-scheme") as ColorScheme) || "default";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (accentColor === "orange") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", accentColor);
    }
  }, [accentColor]);

  useEffect(() => {
    if (colorScheme === "default") {
      document.documentElement.removeAttribute("data-scheme");
    } else {
      document.documentElement.setAttribute("data-scheme", colorScheme);
    }
  }, [colorScheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("mdfy-theme", t); } catch { /* quota exceeded */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const setAccentColor = useCallback((a: AccentColor) => {
    setAccentColorState(a);
    if (a === "orange") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", a);
    }
    try { localStorage.setItem("mdfy-accent", a); } catch { /* quota exceeded */ }
  }, []);

  const setColorScheme = useCallback((s: ColorScheme) => {
    setColorSchemeState(s);
    if (s === "default") {
      document.documentElement.removeAttribute("data-scheme");
    } else {
      document.documentElement.setAttribute("data-scheme", s);
    }
    try { localStorage.setItem("mdfy-scheme", s); } catch { /* quota exceeded */ }
    // When switching to a scheme with its own accent, also update accent to match
    if (s !== "default") {
      const nativeAccent = SCHEME_ACCENT_MAP[s];
      setAccentColorState(nativeAccent);
      if (nativeAccent === "orange") {
        document.documentElement.removeAttribute("data-accent");
      } else {
        document.documentElement.setAttribute("data-accent", nativeAccent);
      }
      try { localStorage.setItem("mdfy-accent", nativeAccent); } catch { /* quota exceeded */ }
    }
  }, []);

  return { theme, toggleTheme, accentColor, setAccentColor, colorScheme, setColorScheme };
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
  editMode?: string;       // "owner" | "token" | "view" | "public"
  sharedWithCount?: number; // number of non-owner people shared with
  isSharedByMe?: boolean;  // legacy: I've shared this doc with others
  isRestricted?: boolean;  // legacy: shared with specific people
  ownerEmail?: string;     // owner's email (for shared docs)
  source?: string;         // origin: "vscode" | "chrome" | null
  lastOpenedAt?: number;   // timestamp of last open
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
function TBtn({ tip, preview, active, onClick, children }: {
  tip: string; preview?: React.ReactNode; active?: boolean; onClick: () => void; children: React.ReactNode;
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
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-1.5 rounded-lg
          opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]
          ${preview ? "p-2.5 w-48" : "px-2 py-1 whitespace-nowrap"}`}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
      >
        {preview ? (
          <>
            <div className="mb-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{tip}</div>
            <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 6 }}>{preview}</div>
          </>
        ) : (
          <span className="text-[10px]">{tip}</span>
        )}
      </div>
    </div>
  );
}

// ─── WYSIWYG Fixed Toolbar (Markdown-compatible only) ───
function WysiwygToolbar({ onInsert, onInsertTable, onInputPopup, cmWrap, cmInsert, onImageUpload, onUndo, onRedo }: {
  onInsert: (type: "code" | "math" | "mermaid") => void;
  onInsertTable: (cols: number, rows: number) => void;
  onInputPopup: (config: { label: string; onSubmit: (v: string) => void }) => void;
  cmWrap: (prefix: string, suffix?: string) => void;
  cmInsert: (text: string) => void;
  onImageUpload: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const mod = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "Cmd" : "Ctrl";
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

  // Detect if focus is in SOURCE (CM6) or LIVE (contentEditable)
  const isInCM6 = () => !!document.activeElement?.closest(".cm-editor");

  // Smart exec: routes to execCommand (Preview) or CM6 wrap (Source)
  const exec = (cmd: string, value?: string) => {
    // Undo/Redo always uses app's undo stack, not browser's execCommand
    if (cmd === "undo") { onUndo(); return; }
    if (cmd === "redo") { onRedo(); return; }
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
        <TBtn tip={`Undo (${mod}+Z)`} onClick={() => exec("undo")}>
          <Undo2 size={I} />
        </TBtn>
        <TBtn tip={`Redo (${mod}+Shift+Z)`} onClick={() => exec("redo")}>
          <Redo2 size={I} />
        </TBtn>
      </div>
      {sep}
      {/* Headings */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Heading 1 — # text" active={blockType==="h1"} onClick={() => fmtBlock("h1")}
          preview={<div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>Heading 1</div>}>
          <span className="text-[10px] font-bold">H1</span></TBtn>
        <TBtn tip="Heading 2 — ## text" active={blockType==="h2"} onClick={() => fmtBlock("h2")}
          preview={<div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>Heading 2</div>}>
          <span className="text-[10px] font-bold">H2</span></TBtn>
        <TBtn tip="Heading 3 — ### text" active={blockType==="h3"} onClick={() => fmtBlock("h3")}
          preview={<div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>Heading 3</div>}>
          <span className="text-[10px] font-semibold">H3</span></TBtn>
        <TBtn tip="Heading 4 — #### text" active={blockType==="h4"} onClick={() => fmtBlock("h4")}
          preview={<div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Heading 4</div>}>
          <span className="text-[10px]">H4</span></TBtn>
        <TBtn tip="Heading 5 — ##### text" active={blockType==="h5"} onClick={() => fmtBlock("h5")}
          preview={<div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Heading 5</div>}>
          <span className="text-[10px]">H5</span></TBtn>
        <TBtn tip="Heading 6 — ###### text" active={blockType==="h6"} onClick={() => fmtBlock("h6")}
          preview={<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.025em" }}>Heading 6</div>}>
          <span className="text-[10px]">H6</span></TBtn>
        <TBtn tip="Paragraph — normal text" active={blockType==="p"} onClick={() => fmtBlock("p")}
          preview={<div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Normal paragraph text</div>}>
          <span className="text-[10px]">P</span></TBtn>
      </div>
      {sep}
      {/* Text style */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip={`Bold (${mod}+B) → **text**`} active={active.bold} onClick={() => exec("bold")}
          preview={<span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>Bold text</span>}>
          <span className="font-bold text-[12px]">B</span></TBtn>
        <TBtn tip={`Italic (${mod}+I) → *text*`} active={active.italic} onClick={() => exec("italic")}
          preview={<span style={{ fontStyle: "italic", color: "var(--text-secondary)", fontSize: 13 }}>Italic text</span>}>
          <span className="italic text-[12px]">I</span></TBtn>
        <TBtn tip="Strikethrough → ~~text~~" active={active.strikethrough} onClick={() => exec("strikeThrough")}
          preview={<span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: 13 }}>Strikethrough</span>}>
          <span className="line-through text-[12px]">S</span></TBtn>
        <TBtn tip="Inline code → `code`" active={active.code} onClick={wrapCode}
          preview={<code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, background: "var(--border)", padding: "2px 6px", borderRadius: 4, color: "var(--accent)" }}>inline code</code>}>
          <span className="font-mono text-[10px]">{`</>`}</span></TBtn>
      </div>
      {sep}
      {/* Lists */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Bullet list → - item" active={active.ul} onClick={() => exec("insertUnorderedList")}
          preview={<div style={{ fontSize: 12 }}><div style={{ color: "var(--text-muted)" }}>• First item</div><div style={{ color: "var(--text-muted)" }}>• Second item</div></div>}>
          <List size={I} />
        </TBtn>
        <TBtn tip="Numbered list → 1. item" active={active.ol} onClick={() => exec("insertOrderedList")}
          preview={<div style={{ fontSize: 12 }}><div style={{ color: "var(--text-muted)" }}>1. First item</div><div style={{ color: "var(--text-muted)" }}>2. Second item</div></div>}>
          <ListOrdered size={I} />
        </TBtn>
        <TBtn tip="Task list → - [ ] item" onClick={() => { if (isInCM6()) { cmInsert("- [ ] "); } else { exec("insertUnorderedList"); } }}
          preview={<div style={{ fontSize: 12 }}><div style={{ color: "var(--text-muted)" }}>☐ To do item</div><div style={{ color: "var(--accent)" }}>☑ Done item</div></div>}>
          <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="5" height="5" rx="1"/><path d="M3.5 4.5l1 1 2-2" strokeLinecap="round"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="3" width="5" height="2" rx="0.5" fill="currentColor"/><rect x="9" y="10" width="5" height="2" rx="0.5" fill="currentColor"/></svg>
        </TBtn>
        <TBtn tip="Indent" onClick={() => exec("indent")}>
          <Indent size={I} />
        </TBtn>
        <TBtn tip="Outdent" onClick={() => exec("outdent")}>
          <Outdent size={I} />
        </TBtn>
      </div>
      {sep}
      {/* Block elements */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip="Blockquote → > text" active={blockType==="blockquote"} onClick={() => fmtBlock("blockquote")}
          preview={<div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 8, color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>Quoted text</div>}>
          <Quote size={I} />
        </TBtn>
        <TBtn tip="Horizontal rule → ---" onClick={() => exec("insertHorizontalRule")}>
          <Minus size={I} />
        </TBtn>
      </div>
      {sep}
      {/* Insert */}
      <div className="flex items-center gap-0.5 shrink-0">
        <TBtn tip={`Link (${mod}+K) → [text](url)`} onClick={() => onInputPopup({ label: "URL", onSubmit: (u) => exec("createLink", u) })}>
          <Link size={I} />
        </TBtn>
        <TBtn tip="Upload image" onClick={() => onImageUpload()}>
          <ImageIcon size={I} />
        </TBtn>
        <TBtn tip="Clear formatting" onClick={() => exec("removeFormat")}>
          <RemoveFormatting size={I} />
        </TBtn>
      </div>
      {sep}
      {/* Insert */}
      <div className="flex items-center gap-0.5 shrink-0">
      <div className="relative" ref={tableGridRef}>
        <TBtn tip="Insert table" onClick={() => setShowTableGrid(v => !v)}>
          <Table size={I} />
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
        <Code size={I} />
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
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const mod = isMac ? "Cmd" : "Ctrl";
  const { theme, toggleTheme, accentColor, setAccentColor, colorScheme, setColorScheme } = useTheme();
  const { user, profile, loading: authLoading, accessToken, isAuthenticated, signInWithGoogle, signInWithGitHub, signInWithEmail, signOut } = useAuth();
  // Only use anonymousId when not logged in
  const anonymousId = (!user?.id && typeof window !== "undefined") ? getAnonymousId() : "";
  const authHeaders = useMemo(() => buildAuthHeaders({ accessToken, userId: user?.id, userEmail: user?.email, anonymousId }), [accessToken, user?.id, user?.email, anonymousId]);
  const authHeadersRef = useRef(authHeaders);
  authHeadersRef.current = authHeaders;
  const autoSave = useAutoSave({ debounceMs: 2500 });
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [authEmailInput, setAuthEmailInput] = useState("");
  const [authEmailSent, setAuthEmailSent] = useState(false);
  const [folders, setFolders] = useState<Folder[]>(() => {
    if (typeof window === "undefined") return INITIAL_FOLDERS;
    try { const s = localStorage.getItem("mdfy-folders"); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; } } catch { /* */ }
    return INITIAL_FOLDERS;
  });
  const [showMyDocs, setShowMyDocs] = useState(true);
  const [showSharedDocs, setShowSharedDocs] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  // Cloud docs section removed — all docs auto-save to cloud
  const [recentDocs, setRecentDocs] = useState<{ id: string; title: string; visitedAt: string; isOwner: boolean; editMode: string }[]>([]);
  const [_serverDocs, setServerDocs] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewerShareModal, setShowViewerShareModal] = useState(false);
  const [allowedEmails, setAllowedEmailsState] = useState<string[]>([]);
  const [allowedEditors, setAllowedEditorsState] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; type: string; documentId: string; documentTitle: string; fromUserName: string; message: string; read: boolean; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mdfyPrompt, setMdfyPrompt] = useState<{ text: string; filename: string; tabId: string } | null>(null);
  const [mdfyLoading, setMdfyLoading] = useState(false);
  const [mdfyElapsed, setMdfyElapsed] = useState(0);
  const [showFlavorMenu, setShowFlavorMenu] = useState(false);

  // Tick elapsed time while AI mdfy is processing
  useEffect(() => {
    if (!mdfyLoading) {
      setMdfyElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setMdfyElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [mdfyLoading]);

  // Diagram rendering mode removed — ASCII diagrams use "Convert to Mermaid" button per diagram

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
            // Deduplicate by ID and cloudId
            const seenIds = new Set<string>();
            const seenCloudIds = new Set<string>();
            const deduped = parsed.filter((t: Tab) => {
              if (seenIds.has(t.id)) return false;
              seenIds.add(t.id);
              if (t.cloudId) {
                if (seenCloudIds.has(t.cloudId)) return false;
                seenCloudIds.add(t.cloudId);
              }
              return true;
            });
            // Remove duplicate example docs (same ownerEmail but non-canonical IDs)
            // and strip folderId — examples live in their own section now
            const canonicalExampleIds = new Set(EXAMPLE_TABS.map(e => e.id));
            const cleaned = deduped.filter((t: Tab) => {
              if (t.ownerEmail === EXAMPLE_OWNER && !canonicalExampleIds.has(t.id)) return false;
              return true;
            }).map((t: Tab) => {
              if (canonicalExampleIds.has(t.id)) { const { folderId: __, ...rest } = t; return rest; }
              return t;
            });
            return cleaned;
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

  // Global safety net: immediately remove cloudId duplicates from state
  useEffect(() => {
    const seen = new Set<string>();
    let hasDup = false;
    for (const t of tabs) {
      if (t.cloudId) {
        if (seen.has(t.cloudId)) { hasDup = true; break; }
        seen.add(t.cloudId);
      }
    }
    if (hasDup) {
      const keep = new Set<string>();
      setTabs(prev => prev.filter(t => {
        if (!t.cloudId) return true;
        if (keep.has(t.cloudId)) return false;
        keep.add(t.cloudId);
        return true;
      }));
    }
  }, [tabs]);

  // Sync document folder changes to server
  const prevFolderMapRef = useRef<Map<string, string | undefined>>(new Map());
  useEffect(() => {
    const newMap = new Map<string, string | undefined>();
    for (const t of tabs) {
      if (t.cloudId) newMap.set(t.cloudId, t.folderId);
    }
    // Compare and sync changes
    for (const [cloudId, folderId] of newMap) {
      const prev = prevFolderMapRef.current.get(cloudId);
      if (prev !== folderId && prevFolderMapRef.current.has(cloudId)) {
        // Folder changed — update server
        fetch(`/api/docs/${cloudId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeadersRef.current },
          body: JSON.stringify({ action: "move-to-folder", folderId: folderId || null }),
        }).catch(() => {});
      }
    }
    prevFolderMapRef.current = newMap;
  }, [tabs]);

  // Persist tabs + folders + active tab to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const updatedTabs = tabs.map(t => t.id === activeTabId ? { ...t, markdown } : t);
        // Deduplicate by cloudId + strip non-canonical example docs before persisting
        const seenCloud = new Set<string>();
        const _canonicalIds = new Set(EXAMPLE_TABS.map(e => e.id));
        const cleanTabs = updatedTabs.filter(t => {
          if (t.cloudId) {
            if (seenCloud.has(t.cloudId)) return false;
            seenCloud.add(t.cloudId);
          }
          if (t.ownerEmail === EXAMPLE_OWNER && !_canonicalIds.has(t.id)) return false;
          return true;
        });
        localStorage.setItem("mdfy-tabs", JSON.stringify(cleanTabs));
        localStorage.setItem("mdfy-active-tab", activeTabId);
        localStorage.setItem("mdfy-folders", JSON.stringify(folders));
        localStorage.setItem("mdfy-hidden-examples", JSON.stringify([...hiddenExampleIds]));
        localStorage.setItem("mdfy-show-examples", JSON.stringify(showExamples));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activeTabId, markdown, folders]);

  // Ref for isCollaborating to avoid stale closures in triggerAutoSave
  const isCollaboratingRef2 = useRef(false);

  // Trigger auto-save without undo tracking (used by undo/redo)
  const triggerAutoSave = useCallback((val: string) => {
    const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
    if (currentTab?.cloudId && !currentTab.readonly && !currentTab.deleted) {
      maybeCreateSessionSnapshot(currentTab.cloudId);
      // When Yjs collaboration is active, skip conflict detection
      // (CRDT handles merging, so both users save the same merged content)
      if (isCollaboratingRef2.current) {
        autoSave.setLastServerUpdatedAt("");
      }
      autoSave.scheduleSave({
        cloudId: currentTab.cloudId,
        markdown: val,
        title: currentTab.title,
        userId: user?.id,
        userEmail: user?.email,
        anonymousId,
        editToken: currentTab.editToken,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, user?.id, user?.email, anonymousId, autoSave]);

  // Ref for Yjs collaboration — populated later, used by setMarkdown
  const collabApplyLocalRef = useRef<((md: string) => void) | null>(null);

  // Wrapper that tracks undo history + triggers auto-save + broadcasts via Yjs
  const setMarkdown = useCallback((val: string) => {
    setMarkdownRaw(val);
    // Debounce undo snapshots (don't save every keystroke)
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      const last = undoStack.current[undoStack.current.length - 1];
      if (val !== last) {
        undoStack.current.push(val);
        // Trim stack: max 50 entries, max ~5MB total
        while (undoStack.current.length > 50) undoStack.current.shift();
        let totalSize = undoStack.current.reduce((sum, s) => sum + s.length, 0);
        while (totalSize > 5 * 1024 * 1024 && undoStack.current.length > 1) {
          totalSize -= undoStack.current.shift()!.length;
        }
        redoStack.current = [];
      }
    }, 500);
    triggerAutoSave(val);
    // Broadcast local change to Yjs peers
    collabApplyLocalRef.current?.(val);
  }, [triggerAutoSave]);

  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    const prev = undoStack.current[undoStack.current.length - 1];
    setMarkdownRaw(prev);
    doRender(prev);
    triggerAutoSave(prev);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAutoSave]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    setMarkdownRaw(next);
    doRender(next);
    triggerAutoSave(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAutoSave]);

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
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isSharedDoc, setIsSharedDoc] = useState(false); // opened from URL — read-only unless owner
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [narrowView, setNarrowView] = useState(true);
  const [narrowSource, setNarrowSource] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showOutlinePanel, setShowOutlinePanel] = useState(true);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [userImages, setUserImages] = useState<{ name: string; url: string; size: number; createdAt: string }[]>([]);
  const [imageQuota, setImageQuota] = useState<{ used: number; total: number; plan: string } | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [aiProcessing, setAiProcessing] = useState<string | null>(null);
  const [showTranslatePicker, setShowTranslatePicker] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<{ role: "user" | "ai"; text: string; canUndo?: boolean }[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [inlineInput, setInlineInput] = useState<{ label: string; defaultValue?: string; onSubmit: (v: string) => void; position?: { x: number; y: number } } | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  // Presence: track other editors on the same document
  const presenceUser = useMemo(() => user ? { id: user.id, email: user.email, displayName: profile?.display_name || user.email, avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null } : null, [user, profile]);
  const { otherEditors } = usePresence(docId, presenceUser);

  // ─── Yjs CRDT Collaboration ───
  // Remote change handler: update markdown, render, and sync CM6
  const collabRemoteHandler = useCallback((newMarkdown: string) => {
    setMarkdownRaw(newMarkdown);
    doRenderRef.current(newMarkdown);
    cmSetDocRef.current?.(newMarkdown);
    triggerAutoSave(newMarkdown);
  }, [triggerAutoSave]);
  const { applyLocalChange: collabApplyLocal, forceReset: collabForceReset, peerCount: collabPeerCount, isCollaborating } = useCollaboration(
    docId,
    markdown,
    collabRemoteHandler,
  );
  collabApplyLocalRef.current = collabApplyLocal;
  const collabForceResetRef = useRef(collabForceReset);
  collabForceResetRef.current = collabForceReset;
  isCollaboratingRef2.current = isCollaborating;

  const [isOwner, setIsOwner] = useState(false);
  const [docEditMode, setDocEditMode] = useState<"owner" | "account" | "token" | "view" | "public">("token");
  // Can edit: not shared, or owner (owner-only permission model)
  const [isEditor, setIsEditor] = useState(false);
  // Only the document owner can edit. Non-owners must duplicate to edit.
  const canEdit = !isSharedDoc || isOwner;
  const [showQr, setShowQr] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [canvasMermaid, setCanvasMermaid] = useState<string | undefined>();
  const mermaidIsNewRef = useRef(false); // true = inserting new, false = editing existing
  const mermaidSourceIndexRef = useRef<number>(-1); // character offset of mermaid block in markdown
  const prevMermaidCodesRef = useRef<string[]>([]); // track mermaid codes to skip redundant re-renders
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
  const mathSourceIndexRef = useRef<number>(-1); // character offset of the math block in markdown
  const [showMathModal, setShowMathModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarClosing(true);
      setTimeout(() => { setShowSidebar(false); setSidebarClosing(false); }, 250);
    } else {
      setShowSidebar(false);
    }
  }, [isMobile]);
  const [editorPlaceholder, setEditorPlaceholder] = useState<"sign-in" | "restricted" | "not-found" | "deleted" | null>(null);
  const [deletedDocId, setDeletedDocId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const isDraggingSidebar = useRef(false);

  // FLIP animation for sidebar tab list — tracks positions before/after re-render
  const sidebarListRef = useRef<HTMLDivElement>(null);
  const tabPositionsRef = useRef<Map<string, number>>(new Map());

  // Before render: snapshot current positions
  useEffect(() => {
    const container = sidebarListRef.current;
    if (!container) return;
    const map = new Map<string, number>();
    container.querySelectorAll<HTMLElement>("[data-tab-id]").forEach(el => {
      map.set(el.dataset.tabId!, el.getBoundingClientRect().top);
    });
    tabPositionsRef.current = map;
  });

  // After render: animate position changes
  useLayoutEffect(() => {
    const container = sidebarListRef.current;
    if (!container) return;
    const oldPositions = tabPositionsRef.current;
    if (oldPositions.size === 0) return;

    container.querySelectorAll<HTMLElement>("[data-tab-id]").forEach(el => {
      const id = el.dataset.tabId!;
      const oldTop = oldPositions.get(id);
      if (oldTop == null) return;
      const newTop = el.getBoundingClientRect().top;
      const delta = oldTop - newTop;
      if (Math.abs(delta) < 2) return; // skip negligible changes

      el.style.transform = `translateY(${delta}px)`;
      el.style.transition = "none";
      // Force layout recalculation so browser registers the initial transform
      void el.offsetHeight;
      el.style.transition = "transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1)";
      el.style.transform = "";
      // Clean up inline styles after animation
      el.addEventListener("transitionend", () => {
        el.style.transition = "";
        el.style.transform = "";
      }, { once: true });
    });
  });
  const importFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [docContextMenu, setDocContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folderId: string; confirmDelete?: boolean } | null>(null);
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sharedSortMode, setSharedSortMode] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [docFilter, setDocFilter] = useState<"all" | "private" | "shared" | "synced">("all");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [cloudSearchResults, setCloudSearchResults] = useState<Array<{ id: string; title: string; snippet: string; isDraft: boolean; viewCount: number; source: string | null; updatedAt: string }>>([]);
  const [isCloudSearching, setIsCloudSearching] = useState(false);
  const cloudSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [showSidebarHelp, setShowSidebarHelp] = useState(false);
  const [showSidebarSearch, setShowSidebarSearch] = useState(false);
  const [showSharedOwner, setShowSharedOwner] = useState(false);
  // Onboarding banner — first visit only
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    // First visit — always show
    if (!localStorage.getItem("mdfy-onboarded")) return true;
    // Return visit — show if user has no own documents (only examples)
    try {
      const saved = localStorage.getItem("mdfy-tabs");
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasOwnDocs = Array.isArray(parsed) && parsed.some((t: { ownerEmail?: string; deleted?: boolean }) => !t.deleted && t.ownerEmail !== "master@mdfy.cc");
        if (!hasOwnDocs) return true;
      }
    } catch {}
    return false;
  });
  const [toolbarHintDismissed, setToolbarHintDismissed] = useState(() => typeof window !== "undefined" ? !!localStorage.getItem("mdfy-toolbar-hint-dismissed") : true);
  // Document view count (owner only)
  const [viewCount, setViewCount] = useState(0);
  // Command palette (Cmd+K)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");
  const [cmdSearchResults, setCmdSearchResults] = useState<Array<{ id: string; title: string; snippet: string }>>([]);
  const [isCmdSearching, setIsCmdSearching] = useState(false);
  const cmdSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showExamples, setShowExamples] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("mdfy-show-examples") !== "false";
  });
  const [examplesCollapsed, setExamplesCollapsed] = useState(true);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [hiddenExampleIds, setHiddenExampleIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("mdfy-hidden-examples");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const lastClickedTabIdRef = useRef<string | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [_renderPaneNarrow, setRenderPaneNarrow] = useState(false);
  const [renderPaneUnderNarrowWidth, setRenderPaneUnderNarrowWidth] = useState(false);
  const [_editorPaneNarrow, setEditorPaneNarrow] = useState(false);
  const [editorPaneUnderNarrowWidth, setEditorPaneUnderNarrowWidth] = useState(false);
  const splitPercentRef = useRef(60);
  const isDraggingSplit = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  // ─── Image upload helper ───
  /** Compress image client-side before upload (max 2000px, 0.85 quality) */
  const compressImage = useCallback(async (file: File): Promise<File> => {
    // Skip compression for SVG, GIF (animated), or small files (<200KB)
    if (file.type === "image/svg+xml" || file.type === "image/gif" || file.size < 200 * 1024) return file;
    return new Promise((resolve) => {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const MAX = 2000;
        let { width, height } = img;
        if (width <= MAX && height <= MAX && file.size < 1024 * 1024) { resolve(file); return; }
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          canvas.toBlob((blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
            } else { resolve(file); }
          }, "image/webp", 0.85);
        } catch { resolve(file); }
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
      img.src = blobUrl;
    });
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.append("file", compressed);
    const uploadHeaders: Record<string, string> = { ...authHeaders };
    if (!user?.id) { const anonId = ensureAnonymousId(); if (anonId) uploadHeaders["x-anonymous-id"] = anonId; }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        if (err.requiresAuth) setShowAuthMenu(true);
        else showToast(err.error || "Upload failed", "error");
        return null;
      }
      const data = await res.json();
      if (!data.url) { showToast("Upload failed — no URL returned", "error"); return null; }
      // Refresh image panel if it's open
      if (showImagePanel) {
        fetch("/api/upload/list", { headers: authHeaders })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) { setUserImages(d.images || []); setImageQuota(d.quota); } })
          .catch(() => {});
      }
      return data.url;
    } catch (e) {
      showToast(e instanceof DOMException && e.name === "AbortError" ? "Upload timed out" : "Upload failed", "error");
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, compressImage, showImagePanel, authHeaders]);

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
  const handlePasteImageForCM = useCallback(async (file: File, cursorOffset: number) => {
    const placeholder = `![Uploading ${file.name}...]()\n`;
    // Insert placeholder at cursor position instead of appending to end
    const md = markdownForImageRef.current;
    const before = md.slice(0, cursorOffset);
    const after = md.slice(cursorOffset);
    const withPlaceholder = before + placeholder + after;
    setMarkdown(withPlaceholder);
    doRenderRef.current(withPlaceholder);
    cmSetDocRef.current?.(withPlaceholder);
    const url = await uploadImage(file);
    const current = markdownForImageRef.current;
    const imageTag = url ? `![${file.name}](${url})\n` : "";
    if (current.includes(placeholder)) {
      const updated = current.replace(placeholder, imageTag);
      setMarkdown(updated);
      doRenderRef.current(updated);
      cmSetDocRef.current?.(updated);
    } else if (url) {
      // Placeholder was lost (e.g. user edited) — append image at end
      const updated = current + "\n" + imageTag;
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
    getCursorPos: cmGetCursorPos,
    refresh: cmRefresh,
    wrapSelection: cmWrapSelection,
    insertAtCursor: cmInsertAtCursor,
  } = useCodeMirror({
    initialDoc: markdown,
    onChange: (value: string) => handleChangeRef.current(value),
    onCursorActivity: (line: number) => onCursorActivityRef.current?.(line),
    onPaste: handlePasteForCM,
    onPasteImage: handlePasteImageForCM,
    theme,
    placeholder: "Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything...",
  });
  cmSetDocRef.current = cmSetDoc;

  // Source → Preview sync: highlight corresponding preview element when cursor moves in CM
  const prevHighlightRef = useRef<HTMLElement | null>(null);
  const cursorSyncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearHighlight = useCallback(() => {
    if (prevHighlightRef.current) {
      prevHighlightRef.current.style.boxShadow = "";
      prevHighlightRef.current.style.background = "";
      prevHighlightRef.current.style.borderRadius = "";
      prevHighlightRef.current.style.transition = "";
      prevHighlightRef.current = null;
    }
  }, []);

  const lastCursorPosRef = useRef(0);
  const onCursorActivityRef = useRef<((line: number) => void) | null>(null);
  onCursorActivityRef.current = (line: number) => {
    // Save cursor position for image insert etc.
    const pos = cmGetCursorPos();
    if (pos > 0) lastCursorPosRef.current = pos;
    // Debounce to avoid scroll jank during selection drag
    if (cursorSyncTimer.current) clearTimeout(cursorSyncTimer.current);
    cursorSyncTimer.current = setTimeout(() => {
      if (viewMode === "editor") return;
      const article = previewRef.current?.querySelector("article");
      if (!article) return;

      clearHighlight();

      // Account for frontmatter offset
      const mdLines = markdownRef.current.split("\n");
      let fmOffset = 0;
      if (mdLines[0]?.trim() === "---") {
        for (let i = 1; i < mdLines.length; i++) {
          if (mdLines[i]?.trim() === "---") { fmOffset = i + 1; break; }
        }
      }
      const sourceLine = line - fmOffset;

      // Find the tightest data-sourcepos range containing this line
      const els = article.querySelectorAll("[data-sourcepos]");
      let bestEl: HTMLElement | null = null;
      let bestRange = Infinity;
      els.forEach(el => {
        const sp = el.getAttribute("data-sourcepos");
        if (!sp) return;
        const m = sp.match(/^(\d+):\d+-(\d+):\d+$/);
        if (!m) return;
        const start = parseInt(m[1]);
        const end = parseInt(m[2]);
        if (sourceLine >= start && sourceLine <= end) {
          const range = end - start;
          if (range < bestRange) {
            bestRange = range;
            bestEl = el as HTMLElement;
          }
        }
      });

      if (bestEl) {
        (bestEl as HTMLElement).style.boxShadow = "inset 3px 0 0 var(--accent)";
        (bestEl as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 6%, transparent)";
        (bestEl as HTMLElement).style.borderRadius = "0 4px 4px 0";
        (bestEl as HTMLElement).style.transition = "background 0.2s, box-shadow 0.2s";
        (bestEl as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
        prevHighlightRef.current = bestEl;
      }
    }, 80);
  };

  // Clean up highlight on tab switch or unmount
  useEffect(() => clearHighlight, [clearHighlight]);

  const menuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Set default view mode based on screen size + auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode("preview"); // Live view only on mobile by default
      setShowSidebar(false); // Auto-close sidebar when entering mobile viewport
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
      // Reset mermaid cache so diagrams re-render after full HTML replacement
      prevMermaidCodesRef.current = [];
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

      // Defer expensive stats and AI detection for large documents
      const computeStats = () => {
        if (thisRender !== renderIdRef.current) return;
        setWordCount(md.trim() ? md.trim().split(/\s+/).length : 0);
        setLineCount(md.split("\n").length);
        if (md.length > 50 && isAiConversation(md)) {
          setShowAiBanner(true);
        } else {
          setShowAiBanner(false);
        }
      };
      if (md.length > 50000 && typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(computeStats);
      } else {
        computeStats();
      }
    } catch (e) {
      console.error("Render error:", e);
      setIsLoading(false);
    }
  }, []);

  // Keep doRenderRef in sync
  doRenderRef.current = doRender;

  // ─── Tab management ───
  const loadTab = useCallback((tab: Tab) => {
    // Clear any placeholder overlay when loading a real document
    setEditorPlaceholder(null);
    // Update ref IMMEDIATELY so doRender uses correct tab ID
    activeTabIdRef.current = tab.id;
    setActiveTabId(tab.id);
    setTitle(tab.title || undefined);
    // Cancel any pending debounced render from CodeMirror
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Update permission + doc state based on tab
    setDocId(tab.cloudId || null);
    setIsSharedDoc(tab.permission === "readonly" || tab.permission === "editable");
    setIsOwner(tab.permission === "mine" || !tab.permission);
    setIsEditor(false);
    // Reset share modal state + view count for the new tab
    setViewCount(0);
    setAllowedEmailsState([]);
    setAllowedEditorsState([]);
    // Fetch view count for cloud docs
    if (tab.cloudId && (tab.permission === "mine" || !tab.permission)) {
      fetch(`/api/docs/${tab.cloudId}`, { method: "HEAD" })
        .then(r => { const vc = r.headers.get("x-view-count"); if (vc) setViewCount(parseInt(vc) || 0); })
        .catch(() => {});
    }
    setShowViewerShareModal(false);
    // Update browser URL to reflect current document
    if (tab.cloudId) {
      window.history.replaceState(null, "", `/?doc=${tab.cloudId}`);
    } else {
      window.history.replaceState(null, "", "/");
    }

    // If cloud tab has no content, fetch it from server
    if (tab.cloudId && !tab.markdown) {
      setMarkdownRaw("");
      setIsLoading(true);
      fetch(`/api/docs/${tab.cloudId}`, { headers: authHeadersRef.current })
        .then(res => res.ok ? res.json() : null)
        .then(doc => {
          if (!doc || activeTabIdRef.current !== tab.id) return;
          const md = doc.markdown || "";
          const t = doc.title || tab.title;
          setMarkdownRaw(md);
          setTitle(t);
          undoStack.current = [md];
          redoStack.current = [];
          doRenderRef.current(md);
          // Seed the conflict detection timestamp
          if (doc.updated_at) autoSave.setLastServerUpdatedAt(doc.updated_at);
          setTabs(prev => prev.map(x => x.id === tab.id ? { ...x, markdown: md, title: t } : x));
        })
        .catch(() => {
          doRenderRef.current("");
        })
        .finally(() => {
          if (activeTabIdRef.current === tab.id) setIsLoading(false);
        });
    } else {
      setMarkdownRaw(tab.markdown);
      undoStack.current = [tab.markdown];
      redoStack.current = [];
      doRenderRef.current(tab.markdown);
    }
  }, []);

  // Track whether current navigation is from popstate (back/forward) to avoid pushing duplicate history entries
  const isPopstateRef = useRef(false);

  const switchTab = useCallback((tabId: string) => {
    // Flush any pending WYSIWYG edits before switching
    if (wysiwygDebounce.current) {
      clearTimeout(wysiwygDebounce.current);
      wysiwygDebounce.current = undefined;
      const article = previewRef.current?.querySelector("article");
      if (article) {
        const clone = article.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".code-copy-btn, .code-header, .code-lang-label, .mermaid-edit-btn, .mermaid-toolbar, .ascii-render-btn, .ascii-toggle-btn, .ce-spacer").forEach(n => n.remove());
        clone.querySelectorAll(".table-wrapper").forEach(w => { const t = w.querySelector("table"); if (t) w.replaceWith(t); });
        const flushedMd = htmlToMarkdown(clone.innerHTML);
        setMarkdownRaw(flushedMd);
        markdownRef.current = flushedMd;
      }
    }
    // Use refs to get current values (avoid stale closures)
    const currentMd = markdownRef.current;
    const currentTabId = activeTabIdRef.current;
    const fromPopstate = isPopstateRef.current;
    isPopstateRef.current = false;

    setTabs((prev) => {
      // Save current tab's markdown + stamp lastOpenedAt on target tab
      const saved = prev.map((t) => {
        if (t.id === tabId) return { ...t, lastOpenedAt: Date.now() };
        if (t.id !== currentTabId || t.readonly) return t;
        return { ...t, markdown: currentMd };
      });
      // Load target tab
      const target = saved.find((t) => t.id === tabId);
      if (target) {
        queueMicrotask(() => {
          loadTab(target);
          // Push history entry for user-initiated tab switches (not back/forward)
          if (!fromPopstate) {
            const url = target.cloudId ? `/?doc=${target.cloudId}` : "/";
            window.history.pushState({ mdfyTabId: target.id, mdfyDocId: target.cloudId || null }, "", url);
          }
        });
      }
      return saved;
    });
  }, [loadTab]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const docParam = params.get("doc");
      if (docParam) {
        const existing = tabs.find(t => t.cloudId === docParam && !t.deleted);
        if (existing) {
          isPopstateRef.current = true;
          switchTab(existing.id);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [tabs, switchTab]);

  // Multi-select: compute visible doc order for shift-range
  const visibleMyDocIds = useMemo(() => {
    const allMyTabs = tabs.filter(t => !t.deleted && !t.readonly && t.permission !== "readonly" && t.permission !== "editable");
    const myTabs = docFilter === "all" ? allMyTabs
      : docFilter === "private" ? allMyTabs.filter(t => !t.isSharedByMe && !t.isRestricted)
      : docFilter === "shared" ? allMyTabs.filter(t => t.isSharedByMe || t.isRestricted)
      : docFilter === "synced" ? allMyTabs.filter(t => t.source && ["vscode", "desktop", "cli", "mcp"].includes(t.source))
      : allMyTabs;
    const sortFn = (a: Tab, b: Tab) => {
      if (sortMode === "az") return (a.title || "").localeCompare(b.title || "");
      if (sortMode === "za") return (b.title || "").localeCompare(a.title || "");
      const now = Date.now();
      const at = a.lastOpenedAt || now;
      const bt = b.lastOpenedAt || now;
      return sortMode === "newest" ? bt - at : at - bt;
    };
    const rootIds = myTabs.filter(t => !t.folderId && (!sidebarSearch || (t.title || "").toLowerCase().includes(sidebarSearch.toLowerCase()) || (t.markdown || "").toLowerCase().includes(sidebarSearch.toLowerCase()))).sort(sortFn).map(t => t.id);
    const myFolderIds = folders.filter(f => !f.section || f.section === "my").filter(f => !f.collapsed).flatMap(f =>
      tabs.filter(t => !t.deleted && t.folderId === f.id && (!sidebarSearch || (t.title || "").toLowerCase().includes(sidebarSearch.toLowerCase()) || (t.markdown || "").toLowerCase().includes(sidebarSearch.toLowerCase()))).sort(sortFn).map(t => t.id)
    );
    // Shared tabs (for shift-select across sections)
    const sharedRootIds = tabs.filter(t => !t.deleted && !t.folderId && (t.permission === "readonly" || t.permission === "editable") && !hiddenExampleIds.has(t.id)).map(t => t.id);
    const sharedFolderIds = folders.filter(f => f.section === "shared").filter(f => !f.collapsed).flatMap(f =>
      tabs.filter(t => !t.deleted && t.folderId === f.id && !hiddenExampleIds.has(t.id)).map(t => t.id)
    );
    return [...rootIds, ...myFolderIds, ...sharedRootIds, ...sharedFolderIds];
  }, [tabs, docFilter, sortMode, sidebarSearch, folders, hiddenExampleIds]);

  const handleDocClick = useCallback((tabId: string, e: React.MouseEvent) => {
    setShowOnboarding(false);
    if (e.metaKey || e.ctrlKey) {
      setSelectedTabIds(prev => { const next = new Set(prev); if (next.has(tabId)) next.delete(tabId); else next.add(tabId); return next; });
      lastClickedTabIdRef.current = tabId;
    } else if (e.shiftKey && lastClickedTabIdRef.current) {
      const lastIdx = visibleMyDocIds.indexOf(lastClickedTabIdRef.current);
      const curIdx = visibleMyDocIds.indexOf(tabId);
      if (lastIdx >= 0 && curIdx >= 0) {
        setSelectedTabIds(new Set(visibleMyDocIds.slice(Math.min(lastIdx, curIdx), Math.max(lastIdx, curIdx) + 1)));
      }
    } else {
      setSelectedTabIds(new Set());
      lastClickedTabIdRef.current = tabId;
      if (tabId !== activeTabId) switchTab(tabId);
    }
  }, [visibleMyDocIds, activeTabId, switchTab]);

  // Clear selection on filter/search change
  useEffect(() => { setSelectedTabIds(new Set()); }, [docFilter, sidebarSearch, sortMode]);

  // Debounced cloud search when sidebarSearch has 3+ chars
  useEffect(() => {
    if (cloudSearchTimerRef.current) clearTimeout(cloudSearchTimerRef.current);
    if (sidebarSearch.length < 3) {
      setCloudSearchResults([]);
      setIsCloudSearching(false);
      return;
    }
    setIsCloudSearching(true);
    const controller = new AbortController();
    cloudSearchTimerRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(sidebarSearch)}`, { headers: authHeadersRef.current, signal: controller.signal })
        .then(res => res.ok ? res.json() : { results: [] })
        .then(data => {
          setCloudSearchResults(data.results || []);
          setIsCloudSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setCloudSearchResults([]);
            setIsCloudSearching(false);
          }
        });
    }, 400);
    return () => { if (cloudSearchTimerRef.current) clearTimeout(cloudSearchTimerRef.current); controller.abort(); };
  }, [sidebarSearch]);

  // Debounced search for Cmd+K palette (3+ chars, no matching commands)
  useEffect(() => {
    if (cmdSearchTimerRef.current) clearTimeout(cmdSearchTimerRef.current);
    if (!showCommandPalette || cmdSearch.length < 3) {
      setCmdSearchResults([]);
      setIsCmdSearching(false);
      return;
    }
    setIsCmdSearching(true);
    const controller = new AbortController();
    cmdSearchTimerRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(cmdSearch)}`, { headers: authHeadersRef.current, signal: controller.signal })
        .then(res => res.ok ? res.json() : { results: [] })
        .then(data => {
          setCmdSearchResults(data.results || []);
          setIsCmdSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setCmdSearchResults([]);
            setIsCmdSearching(false);
          }
        });
    }, 400);
    return () => { if (cmdSearchTimerRef.current) clearTimeout(cmdSearchTimerRef.current); controller.abort(); };
  }, [cmdSearch, showCommandPalette]);

  const addTabWithContent = useCallback(async (initialMd: string) => {
    const currentMd = markdownRef.current;
    const currentTabId = activeTabIdRef.current;

    const id = `tab-${tabIdCounter++}`;
    const tabTitle = extractTitleFromMd(initialMd) || "Untitled";
    const newTab: Tab = { id, title: tabTitle, markdown: initialMd, isDraft: true, permission: "mine" };

    setTabs((prev) => {
      const saved = prev.map((t) => {
        if (t.id !== currentTabId || t.readonly) return t;
        return { ...t, markdown: currentMd };
      });
      return [...saved, newTab];
    });

    loadTab(newTab);
    setTitle(tabTitle);

    // Auto-create on server (ensure anonymous ID for non-logged-in users)
    const anonId = user?.id ? undefined : ensureAnonymousId();
    const result = await autoSave.createDocument({
      markdown: initialMd,
      title: tabTitle,
      userId: user?.id,
      anonymousId: anonId,
    });
    if (result) {
      setTabs(prev => {
        // Remove any duplicate cloud-tab that server sync may have created for this cloudId
        const withoutDup = prev.filter(t => !(t.cloudId === result.id && t.id !== id));
        return withoutDup.map(t => t.id === id ? { ...t, cloudId: result.id, editToken: result.editToken } : t);
      });
      setDocId(result.id);
      // Update URL without navigation
      window.history.replaceState(null, "", `/?doc=${result.id}`);
      // BUG 8 fix: If content changed during cloud creation window, trigger save
      const currentMd = markdownRef.current;
      if (currentMd !== initialMd) {
        autoSave.scheduleSave({
          cloudId: result.id,
          markdown: currentMd,
          title: tabTitle,
          userId: user?.id,
          userEmail: user?.email,
          anonymousId: anonId,
          editToken: result.editToken,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTab, autoSave, user?.id, user?.email, anonymousId]);

  const addTab = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  const _closeTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (tabId === activeTabId) {
      const next = newTabs[Math.min(idx, newTabs.length - 1)];
      loadTab(next); // Use loadTab to properly sync all state (docId, URL, permissions)
    }
  }, [tabs, activeTabId, loadTab]);

  // Mermaid rendering after DOM update
  // Finds <pre lang="mermaid"> directly in DOM (no regex on HTML strings)
  useEffect(() => {
    if (!previewRef.current || isLoading) return;

    // Find all <pre> with lang="mermaid" that haven't been rendered yet
    const mermaidPres = previewRef.current.querySelectorAll('pre[lang="mermaid"]');
    if (mermaidPres.length === 0) { prevMermaidCodesRef.current = []; return; }

    // Extract current mermaid codes and skip re-render if unchanged
    const currentCodes = Array.from(mermaidPres).map(pre => {
      const codeEl = pre.querySelector("code");
      return (codeEl?.textContent || pre.textContent || "").trim();
    });
    const prev = prevMermaidCodesRef.current;
    if (prev.length === currentCodes.length && prev.every((c, i) => c === currentCodes[i])) return;
    prevMermaidCodesRef.current = currentCodes;

    const isDark = theme === "dark";

    // Use mermaid from CDN (window.mermaid) — webpack can't handle mermaid's dynamic chunk imports
    const waitForMermaid = (): Promise<typeof import("mermaid").default> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).mermaid) return Promise.resolve((window as any).mermaid);
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).mermaid) { clearInterval(check); resolve((window as any).mermaid); }
        }, 50);
        setTimeout(() => { clearInterval(check); reject(new Error("Mermaid load timeout")); }, 10000);
      });
    };

    waitForMermaid().catch(() => { console.warn("[mdfy] Mermaid failed to load"); return null; }).then(async (mermaid) => {
      if (!mermaid) return;
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

          // Build container — store original source for Turndown roundtrip
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-container";
          wrapper.setAttribute("data-original-code", code);
          const sourcepos = pre.getAttribute("data-sourcepos");
          if (sourcepos) wrapper.setAttribute("data-sourcepos", sourcepos);

          // Toolbar: Edit | Copy
          const toolbar = document.createElement("div");
          toolbar.className = "mermaid-toolbar";
          toolbar.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 10px 0;flex-wrap:nowrap;opacity:0;transition:opacity 0.15s";

          const btnStyle = "padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;border-radius:4px;cursor:pointer;line-height:14px";

          // "Edit" button — Mermaid visual editor
          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.style.cssText = `${btnStyle};background:none;color:var(--text-muted);border:1px solid var(--border-dim)`;
          editBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            mermaidIsNewRef.current = false;
            mermaidSourceIndexRef.current = -1;
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
            // Find the exact character offset of this mermaid block in markdown
            const block = "```mermaid\n" + code + "\n```";
            const md = markdownRef.current;
            // Count which occurrence of this exact block is being edited
            // by checking the order of mermaid containers in the rendered output
            const allMermaidWrappers = previewRef.current?.querySelectorAll(".mermaid-container") || [];
            let occurrenceIndex = 0;
            for (const mw of allMermaidWrappers) {
              if (mw === wrapper) break;
              // Check if this wrapper has the same code via data-original-code
              const mwOrigCode = mw.getAttribute("data-original-code") || "";
              if (mwOrigCode === code) {
                occurrenceIndex++;
              }
            }
            let searchFrom = 0;
            for (let n = 0; n <= occurrenceIndex; n++) {
              const idx = md.indexOf(block, searchFrom);
              if (idx === -1) { searchFrom = -1; break; }
              searchFrom = n < occurrenceIndex ? idx + block.length : idx;
            }
            if (searchFrom === -1) return;
            mermaidSourceIndexRef.current = searchFrom;
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
  }, [html, isLoading, theme, viewMode]);

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
      // Skip if already has toolbar or already rendered
      if (el.querySelector(".ascii-toolbar")) return;
      if ((el as HTMLElement).dataset.asciiRendered) return;

      // Toolbar at top — always visible
      const toolbar = document.createElement("div");
      toolbar.className = "ascii-toolbar";
      toolbar.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 10px 0;flex-wrap:nowrap";

      const btn = document.createElement("button");
      btn.className = "ascii-render-btn";
      btn.textContent = "Convert to Mermaid";
      btn.title = "Convert this ASCII diagram to Mermaid code using AI";
      btn.style.cssText = `
        padding:4px 10px;font-size:11px;font-family:ui-monospace,monospace;
        background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent);
        border-radius:4px;cursor:pointer;line-height:14px;
      `;
      toolbar.appendChild(btn);

      // Copy button
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

        btn.textContent = "Converting...";
        btn.style.opacity = "0.7";
        btn.style.pointerEvents = "none";

        try {
          // Render ASCII to canvas image for vision AI
          let imageBase64: string | undefined;
          try {
            const lines = asciiText.split("\n");
            const fontSize = 14;
            const lineHeight = fontSize * 1.5;
            const charWidth = fontSize * 0.6;
            const padding = 24;
            const maxLineLen = Math.max(...lines.map(l => l.length));
            const canvasW = Math.ceil(maxLineLen * charWidth + padding * 2);
            const canvasH = Math.ceil(lines.length * lineHeight + padding * 2);
            const canvas = document.createElement("canvas");
            canvas.width = canvasW * 2;
            canvas.height = canvasH * 2;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.scale(2, 2);
              ctx.fillStyle = "#0a0a0c";
              ctx.fillRect(0, 0, canvasW, canvasH);
              ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
              ctx.fillStyle = "#e4e4e7";
              ctx.textBaseline = "top";
              lines.forEach((line, i) => {
                ctx.fillText(line, padding, padding + i * lineHeight);
              });
              imageBase64 = canvas.toDataURL("image/png");
            }
          } catch { /* fallback to text-only */ }

          const docContext = markdown?.substring(0, 2000) || "";
          const res = await fetch("/api/ascii-to-mermaid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ascii: asciiText, image: imageBase64, context: docContext }),
          });

          if (!res.ok) throw new Error("API error");
          const data = await res.json();
          const mermaidCode = data.mermaid;
          if (!mermaidCode) throw new Error("No mermaid output");

          // Replace ASCII block with ```mermaid block in markdown source
          // Find the ASCII text in markdown and replace with mermaid code block
          const currentMd = markdown || "";
          // The ASCII is inside a ```text or ``` block — find and replace
          const escaped = asciiText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Try matching with any language tag or no tag
          const blockRegex = new RegExp("```[a-z]*\\n" + escaped.replace(/\n/g, "\\n") + "\\n```", "s");
          let newMd = currentMd;
          if (blockRegex.test(currentMd)) {
            newMd = currentMd.replace(blockRegex, "```mermaid\n" + mermaidCode + "\n```");
          } else {
            // Fallback: try to find the raw ASCII text and wrap it
            const idx = currentMd.indexOf(asciiText);
            if (idx !== -1) {
              // Find the enclosing ``` block
              const before = currentMd.lastIndexOf("```", idx);
              const after = currentMd.indexOf("```", idx + asciiText.length);
              if (before !== -1 && after !== -1) {
                newMd = currentMd.substring(0, before) + "```mermaid\n" + mermaidCode + "\n" + currentMd.substring(after);
              }
            }
          }

          if (newMd !== currentMd) {
            setMarkdown(newMd);
            cmSetDoc(newMd);
            doRender(newMd);
          }
        } catch {
          btn.textContent = "Failed";
          btn.style.color = "#ef4444";
          setTimeout(() => {
            btn.textContent = "Convert to Mermaid";
            btn.style.opacity = "1";
            btn.style.pointerEvents = "";
            btn.style.color = "var(--accent)";
          }, 2000);
        }
      });
      // User clicks Render button manually per diagram
    });
  }, [html, isLoading, theme]);

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
          const orig = mode === "display" ? `$$\n${src}\n$$` : `$${src}$`;
          mathOriginalRef.current = orig;
          // Find the exact character offset of THIS math block (not just the first match)
          // by counting which occurrence of this math text it is in the rendered output
          const allMathEls = previewRef.current?.querySelectorAll(".math-rendered[data-math-src]") || [];
          let occurrenceIndex = 0;
          for (const mel of allMathEls) {
            const mSrc = decodeURIComponent((mel as HTMLElement).dataset.mathSrc || "");
            const mMode = (mel as HTMLElement).dataset.mathMode;
            const mOrig = mMode === "display" ? `$$\n${mSrc}\n$$` : `$${mSrc}$`;
            if (mOrig === orig) {
              if (mel === el) break;
              occurrenceIndex++;
            }
          }
          // Find the nth occurrence of this math block in markdown
          const md = markdownRef.current;
          let searchFrom = 0;
          for (let n = 0; n <= occurrenceIndex; n++) {
            const idx = md.indexOf(orig, searchFrom);
            if (idx === -1) { searchFrom = -1; break; }
            searchFrom = n < occurrenceIndex ? idx + orig.length : idx;
          }
          mathSourceIndexRef.current = searchFrom;
          setInitialMath(src);
          setShowMathModal(true);
        }
      });
    });
  }, [html, isLoading]);

  // Track auth state changes: notify user when session expires silently
  useEffect(() => {
    if (!authLoading && !isAuthenticated && user === null) {
      // User was previously logged in but is now logged out
      const wasLoggedIn = localStorage.getItem("mdfy-was-logged-in");
      if (wasLoggedIn) {
        showToast("You've been signed out. Sign in again to sync.", "info");
        localStorage.removeItem("mdfy-was-logged-in");
      }
    }
    if (isAuthenticated && user) {
      localStorage.setItem("mdfy-was-logged-in", "1");
    }
  }, [isAuthenticated, user, authLoading]);

  // Listen for session expiry events from useAuth
  useEffect(() => {
    const handler = () => {
      showToast("Session expired. Please sign in again.", "info");
    };
    window.addEventListener("mdfy-session-expired", handler);
    return () => window.removeEventListener("mdfy-session-expired", handler);
  }, []);

  // Load shared content from URL — wait for auth to resolve first
  useEffect(() => {
    if (authLoading) return; // Wait until auth state is known
    (async () => {
      // Check hash-based sharing first
      const shared = await extractFromUrl();
      if (shared) {
        // Check if this is a desktop file open (has filename in hash)
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const desktopFile = hashParams.get("file");

        if (desktopFile) {
          // Desktop app: create new tab with local filename
          const tabId = `tab-${Date.now()}`;
          const title = desktopFile.replace(/\.[^.]+$/, "");
          setTabs(prev => [...prev, { id: tabId, title, markdown: shared }]);
          setActiveTabId(tabId);
          setMarkdown(shared);
          setIsSharedDoc(false);
          /* viewMode preserved — user controls it */
          await doRender(shared);
          cmSetDocRef.current?.(shared);
          // Clear hash to prevent reload issues
          window.history.replaceState(null, "", "/");
          return;
        }

        // Create new tab for shared content (don't overwrite current tab)
        const sharedTabId = `tab-${Date.now()}`;
        const sharedTitle = extractTitleFromMd(shared) || "Shared Document";
        const sharedTab: Tab = { id: sharedTabId, title: sharedTitle, markdown: shared, shared: true };
        setTabs(prev => {
          const curTabId = activeTabIdRef.current;
          const saved = prev.map(t => t.id === curTabId ? { ...t, markdown: markdownRef.current } : t);
          return [...saved, sharedTab];
        });
        loadTab(sharedTab);
        setIsSharedDoc(true);
        setViewMode("preview");
        // loadTab already triggers doRender — no duplicate call
        window.history.replaceState(null, "", "/");
        return;
      }

      // Handle PWA share_target: ?title=...&text=...&url=...
      const shareParams = new URLSearchParams(window.location.search);
      const shareText = shareParams.get("text");
      const shareUrl = shareParams.get("url");
      if (shareText || shareUrl) {
        const shareTitle = shareParams.get("title") || "";
        const parts: string[] = [];
        if (shareTitle) parts.push(`# ${shareTitle}\n`);
        if (shareText) parts.push(shareText);
        if (shareUrl) parts.push(`\n${shareUrl}`);
        const shareMd = parts.join("\n");
        const tabId = `tab-${Date.now()}`;
        const tab: Tab = { id: tabId, title: shareTitle || "Shared", markdown: shareMd };
        setTabs(prev => [...prev, tab]);
        loadTab(tab);
        window.history.replaceState(null, "", "/");
        return;
      }

      // Check ?from= or ?doc= parameter
      const params = new URLSearchParams(window.location.search);
      const docParam = params.get("from") || params.get("doc");
      // Validate doc ID: only allow alphanumeric, hyphen, underscore (nanoid charset)
      const fromId = docParam && /^[\w-]+$/.test(docParam) ? docParam : null;
      // Save editToken from URL if provided (from Chrome extension)
      const urlToken = params.get("token");
      if (fromId && urlToken) {
        saveEditToken(fromId, urlToken);
        // Clean up URL to remove token
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("token");
        window.history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search);
      }
      if (fromId) {
        try {
          const headers: Record<string, string> = { ...authHeaders };
          // Check for password from viewer (stored in sessionStorage)
          try {
            const savedPw = sessionStorage.getItem(`mdfy-pw-${fromId}`);
            if (savedPw) {
              headers["x-document-password"] = savedPw;
              sessionStorage.removeItem(`mdfy-pw-${fromId}`); // One-time use
            }
          } catch { /* sessionStorage unavailable */ }
          const res = await fetch(`/api/docs/${fromId}`, { headers });
          if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            if (errorBody.restricted) {
              setEditorPlaceholder("restricted");
            } else if (!isAuthenticated) {
              setEditorPlaceholder("sign-in");
            } else {
              setEditorPlaceholder("not-found");
            }
            return;
          }
          {
            // Check if this doc was previously deleted by the user BEFORE loading content
            const prevDeleted = tabs.find(t => t.cloudId === fromId && t.deleted);
            if (prevDeleted) {
              setDeletedDocId(fromId);
              setEditorPlaceholder("deleted");
              return;
            }

            const doc = await res.json();
            setEditorPlaceholder(null);
            setMarkdownRaw(doc.markdown);
            if (doc.title) setTitle(doc.title);
            setDocId(fromId);
            setDocEditMode(doc.editMode || "token");
            if (doc.allowedEmails) setAllowedEmailsState(doc.allowedEmails);
            if (doc.allowedEditors) setAllowedEditorsState(doc.allowedEditors);
            if (typeof doc.view_count === "number") setViewCount(doc.view_count);

            const token = getEditToken(fromId);
            const ownerByToken = !!token;
            const ownerByAccount = !!doc.isOwner;

            // Determine permission — owner-only edit model
            let perm: "mine" | "editable" | "readonly" = "readonly";
            if (ownerByToken || ownerByAccount) {
              perm = "mine";
              setIsOwner(true);
              setIsSharedDoc(false);
              /* viewMode preserved — user controls it */
            } else {
              perm = "readonly";
              setIsSharedDoc(true);
              setIsEditor(false);
              setViewMode("preview");
            }

            const docIsSharedByMe = perm === "mine" && (
              doc.editMode === "view" || doc.editMode === "public"
            );
            const othersCount = doc.allowedEmails?.filter((e: string) => e.toLowerCase() !== (user?.email || "").toLowerCase()).length || 0;
            const tabProps = {
              markdown: doc.markdown,
              title: doc.title || undefined,
              permission: perm,
              editToken: token || undefined,
              isDraft: doc.is_draft === false ? false : true,
              isSharedByMe: docIsSharedByMe || false,
              isRestricted: othersCount > 0,
              editMode: doc.editMode || "token",
              sharedWithCount: othersCount,
              ownerEmail: doc.ownerEmail || undefined,
            };

            // Render content immediately (don't depend on setTabs callback timing)
            const prevActiveId = activeTabIdRef.current; // Save before overwriting
            activeTabIdRef.current = "";
            await doRender(doc.markdown);

            // Update tabs state (functional updater for latest state)
            const newTabId = `tab-${Date.now()}`;
            setTabs(prev => {
              const existing = prev.find(t => t.cloudId === fromId);
              if (existing) {
                const merged = { ...existing, ...tabProps, title: doc.title || existing.title, editToken: existing.editToken || token || undefined };
                activeTabIdRef.current = merged.id;
                setActiveTabId(merged.id);
                return prev.map(t => t.cloudId === fromId ? merged : t);
              }
              const newTab: Tab = {
                id: newTabId, cloudId: fromId, ...tabProps,
                title: doc.title || "Shared Document",
                shared: perm !== "mine",
              };
              activeTabIdRef.current = newTab.id;
              setActiveTabId(newTab.id);
              // Save previous tab's markdown before adding new one
              const saved = prev.map(t => t.id === prevActiveId && !t.readonly ? { ...t, markdown: markdownRef.current } : t);
              return [...saved, newTab];
            });
            window.history.replaceState(null, "", `/?doc=${fromId}`);

            // Record visit (fire-and-forget)
            if (user?.id) {
              fetch("/api/user/visit", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ documentId: fromId }),
              }).catch(() => {});
            }

            // loadTab already triggers doRender — no duplicate call needed
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
        headers: { "Content-Type": "application/json", ...authHeaders },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const res = await fetch(`/api/docs/${tab.cloudId}`, { headers: authHeaders });
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

      // BUG 15 fix: Skip if no edits were made during this session
      if (!sessionSnapshotCreated.current.has(currentTab.cloudId)) return;

      // Use sendBeacon for reliable delivery during unload
      // 1. Save current content
      const payload = JSON.stringify({
        action: "auto-save",
        markdown: markdownRef.current,
        title: currentTab.title,
        userId: user?.id,
        userEmail: user?.email,
        anonymousId: (!user?.id) ? getAnonymousId() : undefined,
        editToken: currentTab.editToken,
      });
      navigator.sendBeacon(`/api/docs/${currentTab.cloudId}`, new Blob([payload], { type: "application/json" }));

      // 2. Create session-end snapshot (version history)
      const snapshotPayload = JSON.stringify({
        action: "snapshot",
        userId: user?.id,
        anonymousId: (!user?.id) ? getAnonymousId() : undefined,
        editToken: currentTab.editToken,
        changeSummary: "Session end",
      });
      navigator.sendBeacon(`/api/docs/${currentTab.cloudId}`, new Blob([snapshotPayload], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, user?.id]);

  // Show conflict modal when auto-save detects a 409
  useEffect(() => {
    if (autoSave.conflict) {
      setShowConflictModal(true);
    }
  }, [autoSave.conflict]);

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

  // Fetch recently visited (shared with me) + server docs for logged-in OR anonymous users
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id && !anonymousId) {
      setRecentDocs([]);
      setServerDocs([]);
      return;
    }
    // Fetch recent visits — only for logged-in users (Shared With Me)
    if (user?.id) fetch("/api/user/recent", { headers: authHeaders })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.recent) {
          setRecentDocs(data.recent.filter((d: { isOwner: boolean }) => !d.isOwner));
        }
      })
      .catch(() => {});
    // Fetch user's own documents from server
    fetch("/api/user/documents", { headers: authHeaders })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.documents) {
          setServerDocs(data.documents);
          // Mark tabs that have sharing enabled
          const sharedDocIds = new Set(
            data.documents
              .filter((d: { edit_mode?: string }) => d.edit_mode === "view" || d.edit_mode === "public")
              .map((d: { id: string }) => d.id)
          );
          // Sync isDraft + restricted from server
          const publishedIds = new Set(
            data.documents
              .filter((d: { is_draft?: boolean }) => d.is_draft === false)
              .map((d: { id: string }) => d.id)
          );
          const ownerEmailLower = user?.email?.toLowerCase();
          const restrictedIds = new Set(
            data.documents
              .filter((d: { allowed_emails?: string[]; edit_mode?: string }) => {
                // Only "restricted" if there are actual non-owner recipients
                if (!d.allowed_emails || d.allowed_emails.length === 0) return false;
                // Filter out owner email (case-insensitive)
                const others = d.allowed_emails.filter((e: string) => e.toLowerCase() !== ownerEmailLower);
                return others.length > 0;
              })
              .map((d: { id: string }) => d.id)
          );
          // Build source + folder + editMode + sharedCount maps from server docs
          const sourceMap = new Map<string, string | null>(
            data.documents.map((d: { id: string; source?: string | null }) => [d.id, d.source ?? null])
          );
          const folderMap = new Map<string, string | null>(
            data.documents.map((d: { id: string; folder_id?: string | null }) => [d.id, d.folder_id ?? null])
          );
          const editModeMap = new Map<string, string>(
            data.documents.map((d: { id: string; edit_mode?: string }) => [d.id, d.edit_mode || "token"])
          );
          const computeSharedCount = (allowedEmails: string[] | undefined, ownerEmail: string | undefined) => {
            if (!allowedEmails) return 0;
            return allowedEmails.filter(e => e.toLowerCase() !== (ownerEmail || "").toLowerCase()).length;
          };
          const sharedCountMap = new Map<string, number>(
            data.documents.map((d: { id: string; allowed_emails?: string[] }) => [d.id, computeSharedCount(d.allowed_emails, ownerEmailLower)])
          );
          setTabs(prev => {
            // Update existing tabs with server state
            const updated = prev.map(t => {
              if (!t.cloudId) return t;
              const serverFolderId = folderMap.get(t.cloudId);
              const newDraft = publishedIds.has(t.cloudId) ? false : true;
              const newShared = sharedDocIds.has(t.cloudId) ? true : false;
              const newRestricted = restrictedIds.has(t.cloudId) ? true : false;
              const newSource = sourceMap.get(t.cloudId) || undefined;
              const newFolder = serverFolderId || t.folderId;
              const newEditMode = editModeMap.get(t.cloudId) || "token";
              const newSharedCount = sharedCountMap.get(t.cloudId) || 0;
              if (t.isDraft === newDraft && t.isSharedByMe === newShared && t.isRestricted === newRestricted && t.source === newSource && t.folderId === newFolder && t.editMode === newEditMode && t.sharedWithCount === newSharedCount) return t;
              return { ...t, isDraft: newDraft, isSharedByMe: newShared, isRestricted: newRestricted, source: newSource, folderId: newFolder, editMode: newEditMode, sharedWithCount: newSharedCount };
            });
            // Create tabs for server docs that don't have local tabs
            const existingCloudIds = new Set(updated.filter(t => t.cloudId).map(t => t.cloudId!));
            const newTabs = data.documents
              .filter((d: { id: string }) => !existingCloudIds.has(d.id))
              .map((d: { id: string; title?: string; source?: string; is_draft?: boolean; folder_id?: string }) => ({
                id: `cloud-${d.id}`,
                title: d.title || "Untitled",
                markdown: "",
                cloudId: d.id,
                isDraft: d.is_draft !== false,
                source: d.source || undefined,
                folderId: d.folder_id || undefined,
                permission: "mine" as const,
              }));
            return [...updated, ...newTabs];
          });
        }
      })
      .catch(() => {});
    // Fetch server folders and merge with local (skip Examples folder)
    if (user?.id) fetch("/api/user/folders", { headers: authHeaders })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.folders) {
          setFolders(prev => {
            const serverFolders = data.folders.map((f: { id: string; name: string; section?: string; collapsed?: boolean; sort_order?: number }) => ({
              id: f.id, name: f.name, collapsed: f.collapsed || false, section: (f.section || "my") as "my" | "shared",
            }));
            // Merge server folders (server wins on conflict), drop legacy Examples folder
            const serverIds = new Set(serverFolders.map((f: { id: string }) => f.id));
            const localOnly = prev.filter(f => f.id !== EXAMPLES_FOLDER_ID && !serverIds.has(f.id) && !f.id.startsWith("folder-"));
            // Upload local-only folders to server (one-time migration)
            const toUpload = prev.filter(f => f.id !== EXAMPLES_FOLDER_ID && !serverIds.has(f.id) && f.id.startsWith("folder-"));
            for (const f of toUpload) {
              fetch("/api/user/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ id: f.id, name: f.name, section: f.section || "my" }),
              }).catch(() => {});
            }
            return [...localOnly, ...serverFolders, ...toUpload];
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Notification initial fetch (Realtime handles subsequent updates)
  useEffect(() => {
    if (!user?.email) { setNotifications([]); setUnreadCount(0); return; }
    const controller = new AbortController();
    fetch("/api/notifications", { headers: authHeadersRef.current, signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
    return () => { controller.abort(); };
  }, [user?.email]);

  // Ref for latest markdown (avoids stale closures in Realtime + preview handlers)
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;

  // Ref for Yjs collaboration state (avoids stale closures in Realtime handler)
  const isCollaboratingRef = useRef(isCollaborating);
  isCollaboratingRef.current = isCollaborating;

  // ─── Supabase Realtime: Editor document changes ───
  // Subscribe to document updates when a cloud document is active in the editor.
  // If local is clean → auto-pull; if dirty → show toast with Pull/Ignore.
  const realtimeLastSaveRef = useRef<number>(0); // timestamp of our own last save
  useEffect(() => {
    // Mark our own save timestamp whenever autoSave completes
    if (autoSave.lastSaved) {
      realtimeLastSaveRef.current = autoSave.lastSaved.getTime();
    }
  }, [autoSave.lastSaved]);

  useEffect(() => {
    const currentTab = tabs.find(t => t.id === activeTabId);
    const cloudId = currentTab?.cloudId;
    if (!cloudId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`editor-doc-${cloudId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${cloudId}` },
        async (payload: { new: Record<string, unknown> }) => {
          // Skip if this update was triggered by our own save (within 3s window)
          const now = Date.now();
          if (now - realtimeLastSaveRef.current < 3000) return;

          const newData = payload.new;

          // Handle permission/meta changes
          if (newData.edit_mode !== undefined) {
            setDocEditMode(newData.edit_mode as "owner" | "account" | "token" | "view" | "public");
            setEditMode(newData.edit_mode as "owner" | "account" | "token" | "view" | "public");
          }
          if (newData.is_draft !== undefined) {
            setTabs(prev => prev.map(t => t.cloudId === cloudId ? { ...t, isDraft: newData.is_draft as boolean } : t));
          }

          // When Yjs collaboration is active, content sync is handled by useCollaboration.
          // Skip the postgres_changes content fetch to avoid conflicts with CRDT merging.
          if (isCollaboratingRef.current) return;

          // Fetch the latest document content from server
          // (Realtime payload.new may not include all columns depending on REPLICA IDENTITY)
          try {
            const res = await fetch(`/api/docs/${cloudId}`, { headers: authHeadersRef.current });
            if (!res.ok) return;
            const doc = await res.json();
            const serverMd = doc.markdown as string;
            const serverTitle = (doc.title as string) || undefined;

            // Compare to current markdown
            const localMd = markdownRef.current;
            if (serverMd === localMd) return; // no actual content change

            // Check if local has unsaved changes (user is actively editing)
            // Compare current editor content with last saved version
            const currentTabData = tabs.find(t => t.id === activeTabIdRef.current);
            const lastSavedMd = currentTabData?.markdown || "";
            const hasLocalChanges = localMd !== lastSavedMd || autoSave.isSaving;

            if (!hasLocalChanges) {
              // Auto-pull silently — user hasn't made local changes
              const oldMd = localMd;
              setMarkdownRaw(serverMd);
              if (serverTitle) setTitle(serverTitle);
              doRender(serverMd);
              cmSetDocRef.current?.(serverMd);
              if (doc.updated_at) autoSave.setLastServerUpdatedAt(doc.updated_at as string);
              setTabs(prev => prev.map(t => t.cloudId === cloudId ? { ...t, markdown: serverMd, title: serverTitle || t.title } : t));
              highlightDiff(oldMd, serverMd);
              showToast("Document updated from another source", "info");
            } else {
              // User has unsaved changes — DON'T overwrite, just notify
              showToast("This document was updated by someone else. Your changes are preserved. Save to keep yours, or reload to see theirs.", "info");
            }
          } catch { /* fetch failed, ignore */ }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, docId]);

  // ─── Supabase Realtime: Notifications ───
  // Subscribe to new notifications for the logged-in user.
  useEffect(() => {
    if (!user?.email) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`notifications-${user.email}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_email=eq.${user.email}` },
        (payload: { new: Record<string, unknown> }) => {
          const notif = payload.new as unknown as { id: number; type: string; document_id: string; document_title: string; from_user_name: string; message: string; read: boolean; created_at: string };
          // Add to notifications state
          setNotifications(prev => [{
            id: notif.id,
            type: notif.type,
            documentId: notif.document_id,
            documentTitle: notif.document_title,
            fromUserName: notif.from_user_name,
            message: notif.message,
            read: notif.read,
            createdAt: notif.created_at,
          }, ...prev]);
          setUnreadCount(prev => prev + 1);
          showToast(notif.message || "New notification", "info");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.email]);

  // ─── Supabase Realtime: Sidebar document list ───
  // Subscribe to document changes for the current user to auto-update the sidebar.
  useEffect(() => {
    if (!user?.id) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`sidebar-docs-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `user_id=eq.${user.id}` },
        () => {
          // Skip if this is likely our own save (within 3s of auto-save)
          if (autoSave.lastSaved && Date.now() - autoSave.lastSaved.getTime() < 3000) return;
          // Debounce: coalesce rapid updates into a single fetch
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
          try {
            const res = await fetch("/api/user/documents", { headers: authHeadersRef.current });
            if (!res.ok) return;
            const data = await res.json();
            if (!data?.documents) return;
            setServerDocs(data.documents);

            // Sync tab state from server (isDraft, isSharedByMe, isRestricted, source, folderId)
            const sharedDocIds = new Set(
              data.documents
                .filter((d: { edit_mode?: string }) => d.edit_mode === "view" || d.edit_mode === "public")
                .map((d: { id: string }) => d.id)
            );
            const publishedIds = new Set(
              data.documents
                .filter((d: { is_draft?: boolean }) => d.is_draft === false)
                .map((d: { id: string }) => d.id)
            );
            const ownerEmailLower2 = user?.email?.toLowerCase();
            const restrictedIds = new Set(
              data.documents
                .filter((d: { allowed_emails?: string[] }) => {
                  if (!d.allowed_emails || d.allowed_emails.length === 0) return false;
                  const others = d.allowed_emails.filter((e: string) => e.toLowerCase() !== ownerEmailLower2);
                  return others.length > 0;
                })
                .map((d: { id: string }) => d.id)
            );
            const sourceMap = new Map<string, string | null>(
              data.documents.map((d: { id: string; source?: string | null }) => [d.id, d.source ?? null])
            );
            const editModeMap2 = new Map<string, string>(
              data.documents.map((d: { id: string; edit_mode?: string }) => [d.id, d.edit_mode || "token"])
            );
            const computeSharedCount2 = (allowedEmails: string[] | undefined, ownerEmail: string | undefined) => {
              if (!allowedEmails) return 0;
              return allowedEmails.filter(e => e.toLowerCase() !== (ownerEmail || "").toLowerCase()).length;
            };
            const sharedCountMap2 = new Map<string, number>(
              data.documents.map((d: { id: string; allowed_emails?: string[] }) => [d.id, computeSharedCount2(d.allowed_emails, ownerEmailLower2)])
            );

            setTabs(prev => {
              const existingCloudIds = new Set(prev.filter(t => t.cloudId).map(t => t.cloudId!));
              // Update existing tabs
              const updated = prev.map(t => {
                if (!t.cloudId) return t;
                const newDraft = publishedIds.has(t.cloudId) ? false : true;
                const newShared = sharedDocIds.has(t.cloudId) ? true : false;
                const newRestricted = restrictedIds.has(t.cloudId) ? true : false;
                const newSource = sourceMap.get(t.cloudId) || undefined;
                const newEditMode = editModeMap2.get(t.cloudId) || "token";
                const newSharedCount = sharedCountMap2.get(t.cloudId) || 0;
                // Only create new object if something actually changed
                if (t.isDraft === newDraft && t.isSharedByMe === newShared && t.isRestricted === newRestricted && t.source === newSource && t.editMode === newEditMode && t.sharedWithCount === newSharedCount) return t;
                return { ...t, isDraft: newDraft, isSharedByMe: newShared, isRestricted: newRestricted, source: newSource, editMode: newEditMode, sharedWithCount: newSharedCount };
              });
              // Add new server docs that don't have local tabs
              const newTabs = data.documents
                .filter((d: { id: string }) => !existingCloudIds.has(d.id))
                .map((d: { id: string; title?: string; source?: string; is_draft?: boolean; folder_id?: string }) => ({
                  id: `cloud-${d.id}`,
                  title: d.title || "Untitled",
                  markdown: "",
                  cloudId: d.id,
                  isDraft: d.is_draft !== false,
                  source: d.source || undefined,
                  folderId: d.folder_id || undefined,
                  permission: "mine" as const,
                }));
              // Remove tabs for deleted server docs
              const serverDocIds = new Set(data.documents.map((d: { id: string }) => d.id));
              const filtered = updated.filter(t => {
                if (!t.cloudId) return true; // keep local-only tabs
                if (t.id === activeTabIdRef.current) return true; // keep active tab
                return serverDocIds.has(t.cloudId);
              });
              return [...filtered, ...newTabs];
            });
          } catch { /* offline */ }
          }, 1500);
        }
      )
      .subscribe();

    return () => { if (debounceTimer) clearTimeout(debounceTimer); supabase.removeChannel(channel); };
  }, [user?.id]);

  // Preview: click to scroll to source + double-click to inline edit

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
            cmSetDocRef.current?.(newMd);
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

    // Image click → lightbox
    const handleImgClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;
      // Skip images in code blocks
      if (target.closest("pre, code")) return;
      const img = target as HTMLImageElement;
      if (!img.src) return;
      e.preventDefault(); e.stopPropagation();
      // Close existing lightbox if any
      document.querySelector(".mdcore-lightbox")?.remove();
      const overlay = document.createElement("div");
      overlay.className = "mdcore-lightbox";
      const fullImg = document.createElement("img");
      fullImg.src = img.src;
      fullImg.alt = img.alt || "";
      overlay.appendChild(fullImg);
      const closeLightbox = () => { overlay.remove(); document.removeEventListener("keydown", esc); };
      const esc = (ev: KeyboardEvent) => { if (ev.key === "Escape") closeLightbox(); };
      overlay.addEventListener("click", closeLightbox);
      document.addEventListener("keydown", esc);
      document.body.appendChild(overlay);
    };

    // Image right-click → context menu (alignment, size, alt text)
    const handleImgContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;
      e.preventDefault(); e.stopPropagation();
      const img = target as HTMLImageElement;
      // Remove any existing menu
      document.querySelector(".mdcore-img-menu")?.remove();
      const menu = document.createElement("div");
      menu.className = "mdcore-img-menu";
      menu.style.position = "fixed";
      const menuW = 170, menuH = 300;
      menu.style.left = `${Math.min(e.clientX, window.innerWidth - menuW)}px`;
      menu.style.top = `${Math.min(e.clientY, window.innerHeight - menuH)}px`;

      const findImgInMd = () => {
        const md = markdownRef.current;
        const src = img.src;
        // Match ![...](url) where url matches
        const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escaped}\\)`);
        const match = md.match(regex);
        if (match) return { full: match[0], alt: match[1], index: match.index! };
        // Try matching by filename
        const filename = src.split("/").pop()?.split("?")[0] || "";
        if (filename) {
          const fnRegex = new RegExp(`!\\[([^\\]]*)\\]\\([^)]*${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^)]*\\)`);
          const fnMatch = md.match(fnRegex);
          if (fnMatch) return { full: fnMatch[0], alt: fnMatch[1], index: fnMatch.index! };
        }
        return null;
      };

      const replaceAlt = (newAlt: string) => {
        const found = findImgInMd();
        if (!found) return;
        const newMd = markdownRef.current.slice(0, found.index) + found.full.replace(`![${found.alt}]`, `![${newAlt}]`) + markdownRef.current.slice(found.index + found.full.length);
        setMarkdown(newMd);
        cmSetDoc(newMd);
        doRender(newMd);
      };

      const items: { label: string; icon: string; action: () => void; separator?: boolean }[] = [
        { label: "Align left", icon: "≡", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["center","left","right"].includes(p.trim().toLowerCase())); parts.push("left"); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "Align center", icon: "≡", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["center","left","right"].includes(p.trim().toLowerCase())); parts.push("center"); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "Align right", icon: "≡", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["center","left","right"].includes(p.trim().toLowerCase())); parts.push("right"); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "", icon: "", action: () => {}, separator: true },
        { label: "Small (25%)", icon: "◻", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["small","medium","large"].includes(p.trim().toLowerCase()) && !/^\d+%$/.test(p.trim())); parts.push("small"); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "Medium (50%)", icon: "◻", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["small","medium","large"].includes(p.trim().toLowerCase()) && !/^\d+%$/.test(p.trim())); parts.push("medium"); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "Large (75%)", icon: "◻", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["small","medium","large"].includes(p.trim().toLowerCase()) && !/^\d+%$/.test(p.trim())); parts.push("large"); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "Full width", icon: "◻", action: () => { const f = findImgInMd(); if (f) { const parts = f.alt.split("|").filter(p => !["small","medium","large"].includes(p.trim().toLowerCase()) && !/^\d+%$/.test(p.trim())); replaceAlt(parts.join("|")); } menu.remove(); } },
        { label: "", icon: "", action: () => {}, separator: true },
        { label: "Edit caption", icon: "✎", action: () => {
          menu.remove();
          const found = findImgInMd();
          if (!found) return;
          const cleanAlt = found.alt.split("|")[0].trim();
          setInlineInput({
            label: "Image caption / alt text",
            defaultValue: cleanAlt,
            onSubmit: (newCaption) => {
              const markers = found.alt.split("|").slice(1).join("|");
              replaceAlt(markers ? `${newCaption}|${markers}` : newCaption);
              setInlineInput(null);
            },
          });
        }},
        { label: "Delete image", icon: "✕", action: () => {
          menu.remove();
          const found = findImgInMd();
          if (!found) return;
          const newMd = markdownRef.current.slice(0, found.index) + markdownRef.current.slice(found.index + found.full.length).replace(/^\n{1,2}/, "\n");
          setMarkdown(newMd);
          cmSetDoc(newMd);
          doRender(newMd);
        }},
      ];

      items.forEach(item => {
        if (item.separator) {
          const sep = document.createElement("div");
          sep.style.cssText = "height:1px;margin:3px 6px;background:var(--border-dim)";
          menu.appendChild(sep);
        } else {
          const btn = document.createElement("button");
          btn.textContent = `${item.icon}  ${item.label}`;
          btn.addEventListener("click", item.action);
          menu.appendChild(btn);
        }
      });

      document.body.appendChild(menu);
      const dismiss = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) { menu.remove(); document.removeEventListener("click", dismiss); document.removeEventListener("keydown", escDismiss); } };
      const escDismiss = (ev: KeyboardEvent) => { if (ev.key === "Escape") { menu.remove(); document.removeEventListener("click", dismiss); document.removeEventListener("keydown", escDismiss); } };
      requestAnimationFrame(() => { document.addEventListener("click", dismiss); document.addEventListener("keydown", escDismiss); });
    };

    preview.addEventListener("click", handleClick);
    preview.addEventListener("click", handleImgClick);
    preview.addEventListener("contextmenu", handleImgContext);
    preview.addEventListener("dblclick", handleDblClick);
    return () => {
      preview.removeEventListener("click", handleClick);
      preview.removeEventListener("click", handleImgClick);
      preview.removeEventListener("contextmenu", handleImgContext);
      preview.removeEventListener("dblclick", handleDblClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const isCheckedInDom = target.checked;
      const lines = markdownRef.current.split("\n");
      let found = 0;
      let matched = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*- \[([ xX])\]/.test(lines[i])) {
          if (found === checkboxIndex) {
            // Safety: verify the line's checkbox state is opposite of DOM target
            const lineIsChecked = /- \[x\]/i.test(lines[i]);
            if (lineIsChecked === isCheckedInDom) break; // state mismatch, abort
            if (lineIsChecked) {
              lines[i] = lines[i].replace(/- \[x\]/i, "- [ ]");
            } else {
              lines[i] = lines[i].replace(/- \[ \]/, "- [x]");
            }
            matched = true;
            break;
          }
          found++;
        }
      }
      if (!matched) { e.preventDefault(); return; }
      const newMd = lines.join("\n");
      setMarkdown(newMd);
      doRender(newMd);
      cmSetDocRef.current?.(newMd);
      e.preventDefault();
    };

    // Table cell double-click to edit (keep original cell size)
    const handleTableDblClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const cell = target.closest("td, th") as HTMLTableCellElement | null;
      if (!cell) return;

      // Determine column index for precise cell replacement
      const row = cell.closest("tr");
      const colIndex = row ? Array.from(row.children).indexOf(cell) : -1;

      // Find table sourcepos for accurate line mapping
      const table = cell.closest("table");
      const tableEl = table?.closest("[data-sourcepos]") as HTMLElement | null;
      const sp = tableEl?.getAttribute("data-sourcepos");
      const spMatch = sp?.match(/^(\d+):\d+-(\d+):\d+$/);

      // Calculate frontmatter offset
      const currentMdLines = markdownRef.current.split("\n");
      let fmOffset = 0;
      if (currentMdLines[0]?.trim() === "---") {
        for (let k = 1; k < currentMdLines.length; k++) {
          if (currentMdLines[k]?.trim() === "---") { fmOffset = k + 1; while (fmOffset < currentMdLines.length && !currentMdLines[fmOffset]?.trim()) fmOffset++; break; }
        }
      }

      // Determine which markdown row this cell maps to
      const rowIndex = table ? Array.from(table.querySelectorAll("tr")).indexOf(row!) : -1;
      const isHeader = cell.tagName === "TH";
      // header = row 0 in DOM -> line tableStart (row 0 in md)
      // separator line = tableStart + 1
      // data rows start at tableStart + 2, rowIndex includes header row (rowIndex 0 = header)
      const tableStart = spMatch ? parseInt(spMatch[1]) - 1 + fmOffset : -1;
      const mdRowLine = tableStart >= 0
        ? (isHeader ? tableStart : tableStart + 1 + rowIndex)
        : -1;

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
          if (mdRowLine >= 0 && mdRowLine < lines.length && colIndex >= 0) {
            // Parse table row into cells, replace the exact target cell, rebuild
            const tableCells = lines[mdRowLine].split("|").slice(1, -1); // remove leading/trailing empty
            if (colIndex < tableCells.length) {
              // Preserve cell padding style
              const oldCell = tableCells[colIndex];
              const leadingSpace = oldCell.match(/^(\s*)/)?.[1] || " ";
              const trailingSpace = oldCell.match(/(\s*)$/)?.[1] || " ";
              tableCells[colIndex] = leadingSpace + newText + trailingSpace;
              lines[mdRowLine] = "|" + tableCells.join("|") + "|";
            }
          } else {
            // Cannot reliably identify the cell without sourcepos — abort edit
            cell.setAttribute("style", originalStyle);
            cell.innerHTML = originalContent;
            return;
          }
          const newMd = lines.join("\n");
          setMarkdown(newMd);
          doRender(newMd);
          cmSetDocRef.current?.(newMd);
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

      // Calculate frontmatter offset — use markdownRef for fresh state
      const mdLines = markdownRef.current.split("\n");
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
      requestAnimationFrame(() => document.addEventListener("click", closeMenu));

      menu.addEventListener("click", (ev) => {
        const btn = (ev.target as HTMLElement).closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");

        // Re-read markdown fresh at click time to avoid stale data
        const freshLines = markdownRef.current.split("\n");
        const tableLines = freshLines.slice(tableStart, tableEnd + 1);
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

        freshLines.splice(tableStart, tableEnd - tableStart + 1, ...newTableLines);
        const newMd = freshLines.join("\n");
        setMarkdown(newMd);
        doRender(newMd);
        cmSetDocRef.current?.(newMd);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, isLoading, markdown, doRender]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setConfirmRotateToken(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      setShowEditModeMenu(false);
    };
    if (showMenu || showExportMenu || showEditModeMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showMenu, showExportMenu, showEditModeMenu]);

  // Guard to skip cmSetDoc when the change originated from CM6 itself
  const cmUpdateRef = useRef(false);

  // Debounced render — called when CM6 content changes
  const handleChange = useCallback(
    (value: string) => {
      cmUpdateRef.current = true;
      setMarkdown(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Increase debounce for large documents to avoid lag
      const len = value.length;
      const debounceTime = len > 200000 ? 1000 : len > 100000 ? 750 : len > 50000 ? 500 : len > 20000 ? 300 : 150;
      debounceRef.current = setTimeout(() => doRender(value), debounceTime);
    },
    [doRender, setMarkdown]
  );
  // Keep CM6 onChange ref in sync
  handleChangeRef.current = handleChange;

  // Sync external markdown changes (undo/redo, tab switch, inline edit) → CM6
  useEffect(() => {
    if (cmUpdateRef.current) {
      cmUpdateRef.current = false;
      return;
    }
    cmSetDoc(markdown);
  }, [markdown, cmSetDoc]);

  // WYSIWYG: contentEditable preview → markdown source sync
  const wysiwygEditingRef = useRef(false);
  const wysiwygDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Handle paste in Preview — convert CLI output or HTML to markdown, then re-render
  const handleWysiwygPaste = useCallback((e: React.ClipboardEvent) => {
    // Check for pasted images (handle multiple)
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length > 0) {
      e.preventDefault();
      // Save cursor position BEFORE async upload so we insert at the right place
      saveInsertPosition();
      (async () => {
        const originTabId = activeTabIdRef.current;
        for (const imageItem of imageItems) {
          const file = imageItem.getAsFile();
          if (!file) continue;
          const ts = Date.now();
          const placeholder = `![Uploading ${file.name || "image"}-${ts}...]()\n`;
          // Insert placeholder at cursor position
          const withPh = insertBlockAtCursor(placeholder);
          setMarkdown(withPh); doRender(withPh); cmSetDoc(withPh);
          const url = await uploadImage(file);
          const imgMd = url ? `![${file.name || "image"}](${url})\n` : "";
          if (activeTabIdRef.current === originTabId) {
            // Still on the same tab — replace placeholder in current markdown
            const current = markdownForImageRef.current;
            const updated = current.replace(placeholder, imgMd);
            markdownForImageRef.current = updated;
            setMarkdown(updated); doRender(updated); cmSetDoc(updated);
          } else {
            // Tab changed — update the original tab's markdown via setTabs
            setTabs(prev => prev.map(t => {
              if (t.id !== originTabId) return t;
              const updated = (t.markdown || "").replace(placeholder, imgMd);
              return { ...t, markdown: updated };
            }));
          }
        }
      })();
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");

    // Check for CLI output first — insert at cursor, don't replace document
    if (text && isCliOutput(text)) {
      e.preventDefault();
      const converted = cliToMarkdown(text);
      document.execCommand("insertText", false, converted);
      return;
    }

    // Check for HTML paste — insert converted markdown at cursor
    if (html && isHtmlContent(html)) {
      e.preventDefault();
      const md = htmlToMarkdown(html);
      document.execCommand("insertText", false, md);
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- saveInsertPosition/insertBlockAtCursor are stable refs defined later
  }, [setMarkdown, cmSetDoc, doRender, uploadImage]);

  const handleWysiwygInput = useCallback(() => {
    wysiwygEditingRef.current = true;
    if (wysiwygDebounce.current) clearTimeout(wysiwygDebounce.current);
    wysiwygDebounce.current = setTimeout(() => {
      const article = previewRef.current?.querySelector("article");
      if (!article) return;

      // Helper: strip UI elements from a cloned element
      const stripUiElements = (el: HTMLElement) => {
        el.querySelectorAll(".code-copy-btn, .code-header, .code-lang-label, .mermaid-edit-btn, .mermaid-toolbar, .ascii-render-btn, .ascii-toggle-btn, .ce-spacer").forEach(n => n.remove());
        el.querySelectorAll(".table-wrapper").forEach(wrapper => {
          const table = wrapper.querySelector("table");
          if (table) wrapper.replaceWith(table);
        });
      };

      // Helper: compute frontmatter line offset
      const computeFrontmatterOffset = (md: string): number => {
        const lines = md.split("\n");
        if (lines[0]?.trim() !== "---") return 0;
        for (let i = 1; i < lines.length; i++) {
          if (lines[i]?.trim() === "---") return i + 1;
        }
        return 0;
      };

      // --- Partial update strategy using data-sourcepos ---
      // Instead of converting the entire document on every keystroke,
      // find the specific edited block and convert only that block.
      // This preserves unedited markdown constructs perfectly.
      let didPartialUpdate = false;
      try {
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          // Walk from cursor to nearest ancestor with data-sourcepos
          let node: Node | null = sel.getRangeAt(0).startContainer;
          if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
          let editedBlock: HTMLElement | null = null;
          while (node && node !== article) {
            if ((node as HTMLElement).getAttribute?.("data-sourcepos")) {
              editedBlock = node as HTMLElement;
              break;
            }
            node = (node as HTMLElement).parentElement;
          }

          if (editedBlock) {
            const sourcepos = editedBlock.getAttribute("data-sourcepos");
            const spMatch = sourcepos?.match(/^(\d+):\d+-(\d+):\d+$/);
            if (spMatch) {
              const startLine = parseInt(spMatch[1]) - 1; // 0-indexed
              const endLine = parseInt(spMatch[2]) - 1;

              const md = markdownRef.current;
              const lines = md.split("\n");
              const fmOffset = computeFrontmatterOffset(md);
              const actualStart = startLine + fmOffset;
              const actualEnd = endLine + fmOffset;

              // Sanity check: sourcepos must reference valid lines
              if (actualStart >= 0 && actualEnd < lines.length && actualStart <= actualEnd) {
                // Clone and strip UI from just the edited block
                const clone = editedBlock.cloneNode(true) as HTMLElement;
                stripUiElements(clone);

                // Convert only this block to markdown
                const blockMd = htmlToMarkdown(clone.outerHTML).trim();

                // Replace only the corresponding lines in the original markdown
                const before = lines.slice(0, actualStart);
                const after = lines.slice(actualEnd + 1);
                const newMd = [...before, blockMd, ...after].join("\n");

                // Validate: the partial update should produce reasonable output
                // If the new markdown is drastically shorter, something went wrong
                if (newMd.length > md.length * 0.5 || md.length < 20) {
                  setMarkdown(newMd);
                  cmSetDoc(newMd);
                  didPartialUpdate = true;

                  // Sync title from edited markdown to sidebar
                  const h1Match = newMd.match(/^#\s+(.+)/m);
                  if (h1Match) {
                    const newTitle = h1Match[1].trim();
                    setTitle(newTitle);
                    const curTabId = activeTabIdRef.current;
                    setTabs(prev => prev.map(t => t.id === curTabId ? { ...t, title: newTitle } : t));
                  }
                }
              }
            }
          }
        }
      } catch {
        // Any error in partial update path — fall through to full conversion
      }

      // --- Fallback: full document conversion ---
      // Used when: no cursor/selection, no data-sourcepos found, block was deleted,
      // blocks were merged/split, or partial update validation failed.
      if (!didPartialUpdate) {
        const clone = article.cloneNode(true) as HTMLElement;
        stripUiElements(clone);
        const newMd = htmlToMarkdown(clone.innerHTML);
        setMarkdown(newMd);
        cmSetDoc(newMd);

        // Sync title from edited markdown to sidebar
        const h1Match = newMd.match(/^#\s+(.+)/m);
        if (h1Match) {
          const newTitle = h1Match[1].trim();
          setTitle(newTitle);
          const curTabId = activeTabIdRef.current;
          setTabs(prev => prev.map(t => t.id === curTabId ? { ...t, title: newTitle } : t));
        }
      }

      // Keep wysiwygEditingRef true long enough for the re-render cycle to complete
      setTimeout(() => {
        wysiwygEditingRef.current = false;
      }, 500);

      // Re-process math elements that may have been damaged by contentEditable
      // This is targeted — only restores broken math, doesn't replace entire DOM
      requestAnimationFrame(() => {
        const article = previewRef.current?.querySelector("article");
        if (!article) return;
        // Find any raw math spans that lost their KaTeX rendering
        article.querySelectorAll("[data-math-style]").forEach((el) => {
          const tex = el.textContent || "";
          const mode = el.getAttribute("data-math-style");
          if (!tex || el.querySelector(".katex")) return; // already rendered
          try {
            const rendered = katex.renderToString(tex.trim(), {
              displayMode: mode === "display",
              throwOnError: false,
            });
            const wrapper = document.createElement(mode === "display" ? "div" : "span");
            wrapper.className = "math-rendered";
            wrapper.setAttribute("data-math-src", encodeURIComponent(tex.trim()));
            wrapper.setAttribute("data-math-mode", mode || "inline");
            wrapper.setAttribute("contenteditable", "false");
            wrapper.style.cursor = "pointer";
            wrapper.innerHTML = rendered;
            el.replaceWith(wrapper);
          } catch { /* ignore */ }
        });
      });
    // Increase debounce for large documents to avoid lag
    }, markdownRef.current.length > 50000 ? 500 : 150);
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
        if (imageFiles.length > 1) showToast(`Uploading ${imageFiles.length} images...`, "info");
        // Save cursor position BEFORE async upload so we insert at the right place
        saveInsertPosition();
        let failed = 0;
        for (const img of imageFiles) {
          const url = await uploadImage(img);
          if (url) {
            const imgMd = `![${img.name}](${url})\n\n`;
            const updated = insertBlockAtCursor(imgMd);
            setMarkdown(updated);
            doRender(updated);
            cmSetDoc(updated);
          } else { failed++; }
        }
        if (failed > 0) showToast(`${failed} image${failed > 1 ? "s" : ""} failed to upload`, "error");
        return;
      }

      for (let idx = 0; idx < files.length; idx++) {
        try {
          const file = files[idx];
          const { markdown: md, title: name } = await importFile(file);
          if (!md) {
            showToast(`${file.name} appears to be empty`, "info");
            continue;
          }
          const isPlainFormat = /\.(pdf|rtf|txt|csv|json|xml|pptx?|xlsx?|od[pst])$/i.test(file.name);
          // Always create a new tab for imports
          const tabId = `tab-${tabIdCounter++}`;
          setTabs((prev) => [...prev, { id: tabId, title: name, markdown: md, isDraft: true, permission: "mine" }]);
          setTimeout(() => switchTab(tabId), 50);
          /* viewMode preserved — user controls it */
          if (isPlainFormat && md.length > 50) {
            setMdfyPrompt({ text: md, filename: file.name, tabId });
          }
          // BUG 7 fix: Create cloud document for imported files
          const anonId = user?.id ? undefined : ensureAnonymousId();
          autoSave.createDocument({
            markdown: md,
            title: name,
            userId: user?.id,
            anonymousId: anonId,
          }).then(result => {
            if (result) {
              setTabs(prev => {
                const withoutDup = prev.filter(t => !(t.cloudId === result.id && t.id !== tabId));
                return withoutDup.map(t => t.id === tabId ? { ...t, cloudId: result.id, editToken: result.editToken } : t);
              });
            }
          });
        } catch (err) {
          console.error(`Failed to import ${files[idx].name}:`, err);
          const message = err instanceof Error ? err.message : "Failed to import file";
          showToast(`${files[idx].name}: ${message}`, "error");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveInsertPosition/insertBlockAtCursor are stable refs defined later
    [doRender, isMobile, markdown, uploadImage, cmSetDoc, autoSave, user?.id]
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
      const data = await fetchVersions(docId, authHeaders);
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
      showToast("Failed to load version history", "error");
    }
    setHistoryLoading(false);
  }, [docId]);

  const handleToggleHistory = useCallback(() => {
    if (!showHistory && docId) {
      loadVersions();
    }
    setShowHistory(!showHistory);
    setPreviewVersion(null);
    if (!showHistory) setShowAIPanel(false); // close AI panel when opening history
  }, [showHistory, docId, loadVersions]);

  // Realtime: refresh version list when new versions are created
  useEffect(() => {
    if (!showHistory || !docId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`versions-${docId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'document_versions', filter: `document_id=eq.${docId}` },
        () => { loadVersions(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      const data = await fetchVersion(docId, versionId, authHeaders);
      if (data.version?.markdown) {
        const result = await renderMarkdown(data.version.markdown);
        const processed = postProcessHtml(result.html);
        setHtml(processed);
      }
    } catch {
      showToast("Failed to load version preview", "error");
    }
  }, [docId, previewVersion, markdown, doRender]);

  const handleRestoreVersion = useCallback(async (versionId: number) => {
    if (!docId) return;
    // Confirmation dialog
    const confirmed = window.confirm("Restore this version? Your current content will be saved as a snapshot before restoring.");
    if (!confirmed) return;
    const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
    let token = currentTab?.editToken || getEditToken(docId);
    // If no local token, try fetching from server (owner may not have token locally)
    if (!token && user?.id) {
      try {
        const res = await fetch(`/api/docs/${docId}`, { headers: authHeaders });
        if (res.ok) {
          const doc = await res.json();
          if (doc.editToken) token = doc.editToken;
        }
      } catch {}
    }
    if (!token) { showToast("No edit permission for this document", "error"); return; }
    setRestoringVersion(versionId);
    try {
      // Save current state as version before restoring
      if (docId && user?.id) {
        await fetch(`/api/docs/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "snapshot", userId: user.id, changeSummary: "Before restore" }),
        }).catch(() => {});
      }
      const data = await fetchVersion(docId, versionId, authHeaders);
      if (data.version?.markdown) {
        const prevMd = markdownRef.current;
        await updateDocument(docId, token, data.version.markdown, data.version.title || undefined, { userId: user?.id, anonymousId: !user?.id ? getAnonymousId() : undefined, changeSummary: `Restored to version ${data.version.version_number}` });
        setMarkdown(data.version.markdown);
        doRender(data.version.markdown);
        cmSetDocRef.current?.(data.version.markdown);
        // Force reset Y.Doc to prevent CRDT from reverting to old version
        collabForceResetRef.current?.(data.version.markdown);
        highlightDiff(prevMd, data.version.markdown);
        if (data.version.title) setTitle(data.version.title);
        setPreviewVersion(null);
        await loadVersions();
      }
    } catch {
      showToast("Failed to restore version", "error");
    }
    setRestoringVersion(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, user, doRender, loadVersions]);

  // Share — open modal for owners, quick copy for non-owners
  // ─── AI Actions ───
  const handleAIAction = useCallback(async (action: string, options?: { language?: string; instruction?: string }) => {
    if (aiProcessing) return; // Already processing, ignore
    const md = markdownRef.current;
    if (!md.trim()) { showToast("Write something first", "info"); return; }
    // Block on readonly/example docs
    const ct = tabs.find(t => t.id === activeTabIdRef.current);
    if (ct?.readonly || ct?.permission === "readonly") { showToast("Cannot edit a read-only document", "info"); return; }
    setAiProcessing(action);
    setShowMenu(false);
    setShowTranslatePicker(false);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, markdown: md, ...options }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "AI failed" }));
        throw new Error(err.error || "AI processing failed");
      }
      const data = await res.json();
      const result = data.result;
      if (!result) throw new Error("Empty result from AI");

      let newMd: string;
      if (action === "summary") {
        // Remove existing summary blockquote if present (single or multiline), then insert new one
        const stripped = md.replace(/^(?:> \*\*Summary:\*\*.*\n(?:> .*\n)*)\n/m, "");
        // Wrap each line in blockquote for multiline summaries
        const summaryLines = result.trim().split("\n").map((l: string) => `> ${l}`).join("\n");
        newMd = `> **Summary:**\n${summaryLines}\n\n${stripped}`;
        showToast("Summary added", "success");
      } else if (action === "tldr") {
        // Remove existing TL;DR section if present, then insert new one
        const stripped = md.replace(/^## TL;DR\n\n[\s\S]*?\n---\n\n/m, "");
        newMd = `## TL;DR\n\n${result.trim()}\n\n---\n\n${stripped}`;
        showToast("TL;DR added", "success");
      } else if (action === "chat") {
        const trimmed = result.trim();
        // Check if AI answered (ANSWER:) or if response doesn't start with EDIT:
        if (trimmed.startsWith("ANSWER:") || !trimmed.startsWith("EDIT:")) {
          // AI answered a question or casual message — show in chat, don't modify document
          const answer = trimmed.replace(/^ANSWER:\s*/, "");
          setAiChatHistory(prev => [...prev, { role: "ai", text: answer }]);
          setAiProcessing(null);
          return; // skip document update
        }
        // AI wants to edit the document
        newMd = trimmed.replace(/^EDIT:\s*/, "");
        showToast("Document updated", "success");
      } else {
        // Polish, translate — replace entire document
        newMd = result;
        const labels: Record<string, string> = { polish: "Document polished", translate: "Document translated" };
        showToast(labels[action] || "Done", "success");
      }
      // Add AI response to chat history
      if (action === "chat") {
        setAiChatHistory(prev => [...prev, { role: "ai", text: "Done — document updated.", canUndo: true }]);
      } else {
        const actionLabels: Record<string, string> = { polish: "Polished", summary: "Summary added", tldr: "TL;DR added", translate: "Translated" };
        setAiChatHistory(prev => [...prev, { role: "ai", text: actionLabels[action] || "Done", canUndo: true }]);
      }
      // Update title from new content
      const newTitle = extractTitleFromMd(newMd);
      if (newTitle && newTitle !== "Untitled") {
        setTitle(newTitle);
        setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, title: newTitle } : t));
      }
      // Push current state to undo stack before replacing
      undoStack.current.push(md);
      // Trim stack: max 50 entries, max ~5MB total
      while (undoStack.current.length > 50) undoStack.current.shift();
      {
        let totalSize = undoStack.current.reduce((sum, s) => sum + s.length, 0);
        while (totalSize > 5 * 1024 * 1024 && undoStack.current.length > 1) {
          totalSize -= undoStack.current.shift()!.length;
        }
      }
      redoStack.current = [];
      // Update markdown + tab
      const oldMd = md;
      setMarkdown(newMd);
      doRender(newMd);
      cmSetDocRef.current?.(newMd);
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, markdown: newMd } : t));

      // Highlight changes in preview after render
      highlightDiff(oldMd, newMd);
      if (data.finishReason === "MAX_TOKENS") {
        showToast("AI hit output limit — result may be incomplete", "info");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI processing failed";
      showToast(message, "error");
      setAiChatHistory(prev => [...prev, { role: "ai", text: `Error: ${message}` }]);
    }
    setAiProcessing(null);
  }, [doRender, setMarkdown, tabs]);

  // ─── Diff Highlight ───
  const highlightDiff = useCallback((oldMd: string, newMd: string) => {
    if (oldMd === newMd) return;
    setTimeout(() => {
      if (!previewRef.current) return;
      const blocks = previewRef.current.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, table, .math-rendered, .mermaid-container");
      blocks.forEach(el => {
        const text = (el as HTMLElement).textContent?.trim() || "";
        if (text.length < 5) return;
        const snippet = text.substring(0, Math.min(text.length, 60));
        if (!oldMd.includes(snippet)) {
          (el as HTMLElement).style.transition = "background 1.5s ease-out";
          (el as HTMLElement).style.background = "rgba(251, 146, 60, 0.12)";
          (el as HTMLElement).style.borderRadius = "4px";
          setTimeout(() => { (el as HTMLElement).style.background = ""; }, 3000);
        }
      });
    }, 300);
  }, []);

  const handleShare = useCallback(async () => {
    if (!markdown.trim()) { showToast("Write something first", "info"); return; }
    if (!isAuthenticated) { showToast("Sign in to share documents", "info"); return; }

    // If doc already has a cloudId and user is owner, open share modal
    const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
    const cid = currentTab?.cloudId || docId;

    const isMine = !currentTab?.permission || currentTab.permission === "mine";
    if (cid && isMine && isAuthenticated && user) {
      // Open modal immediately — data loads in background
      setShowShareModal(true);

      // Background: sync title + fetch current sharing state (do NOT auto-publish)
      (async () => {
        if (title) {
          fetch(`/api/docs/${cid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "auto-save", title, userId: user.id }),
          }).catch(() => {});
        }
        try {
          const res = await fetch(`/api/docs/${cid}`, { headers: authHeaders });
          if (res.ok) {
            const doc = await res.json();
            if (doc.allowedEmails) setAllowedEmailsState(doc.allowedEmails);
            if (doc.allowedEditors) setAllowedEditorsState(doc.allowedEditors);
            if (doc.editMode) { setDocEditMode(doc.editMode); setEditMode(doc.editMode); }
            const hasSharing = doc.editMode === "view" || doc.editMode === "public";
            const shareOthersCount = doc.allowedEmails?.filter((e: string) => e.toLowerCase() !== (user?.email || "").toLowerCase()).length || 0;
            setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? {
              ...t,
              isSharedByMe: hasSharing,
              isRestricted: shareOthersCount > 0,
              editMode: doc.editMode,
              sharedWithCount: shareOthersCount,
            } : t));
          }
        } catch { /* ignore */ }
      })();
      return;
    }

    // Non-owner with existing doc — open viewer share modal immediately
    if (cid && !isMine) {
      setShowViewerShareModal(true);
      // Fetch owner info in background if we don't have it
      if (!currentTab?.ownerEmail && user) {
        fetch(`/api/docs/${cid}`, { headers: authHeaders })
          .then(res => res.ok ? res.json() : null)
          .then(doc => {
            if (doc?.ownerEmail) {
              setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, ownerEmail: doc.ownerEmail } : t));
            }
          }).catch(() => {});
      }
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
        setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, cloudId: newDocId, editToken } : t));
        window.history.replaceState(null, "", `/?doc=${newDocId}`);
        // Open share modal — doc stays as draft until user changes settings
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
          setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, cloudId: newDocId, editToken } : t));
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
      showToast("Failed to share. Check your connection.", "error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [_updateState, setUpdateState] = useState<"idle" | "updating" | "done" | "error">("idle");
  const _handleUpdate = useCallback(async () => {
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
      showToast("Failed to update document. Check your connection.", "error");
      setTimeout(() => setUpdateState("idle"), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, markdown, title, user]);

  // Document settings (owner only)
  const [_showDocSettings, _setShowDocSettings] = useState(false);
  const [confirmRotateToken, setConfirmRotateToken] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);
  const handleRotateToken = useCallback(async () => {
    if (!docId || !user?.id) return;
    if (!confirmRotateToken) { setConfirmRotateToken(true); return; }
    setRotatingToken(true);
    try {
      const newToken = await rotateEditToken(docId, user.id);
      saveEditToken(docId, newToken);
    } catch {
      showToast("Failed to rotate edit token", "error");
    }
    setRotatingToken(false);
    setConfirmRotateToken(false);
  }, [docId, user, confirmRotateToken]);

  // Delete document
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(false);
  // Soft delete document on server (move to trash — fire-and-forget)
  const softDeleteOnServer = useCallback((tab: { cloudId?: string; editToken?: string }) => {
    if (!tab.cloudId) return;
    const token = tab.editToken || getEditToken(tab.cloudId);
    softDeleteDocument(tab.cloudId, { userId: user?.id, editToken: token || undefined }).catch(() => {});
  }, [user?.id]);
  // Hard delete document from server (permanent — fire-and-forget)
  const hardDeleteOnServer = useCallback((tab: { cloudId?: string; editToken?: string }) => {
    if (!tab.cloudId) return;
    const token = tab.editToken || getEditToken(tab.cloudId);
    if (!token) return;
    deleteDocument(tab.cloudId, token, { userId: user?.id }).catch(() => {});
  }, [user?.id]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // Clear
  const handleClear = useCallback(() => {
    autoSave.cancel(); // prevent saving empty content to cloud
    // Clear cloudId FIRST to prevent auto-save race
    setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, cloudId: undefined, editToken: undefined } : t));
    setMarkdownRaw("");
    setIsSharedDoc(false);
    setDocId(null);
    setIsOwner(false);
    window.history.replaceState(null, "", "/");
    doRender("");
    setShowMenu(false);
  }, [doRender, autoSave]);

  // ─── Desktop Bridge (Electron) ───
  // Expose markdown state and functions to the desktop app
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    if (!w.__MDFY_DESKTOP__) return;

    w.__MDFY_GET_MARKDOWN__ = () => markdown;
    w.__MDFY_GET_TITLE__ = () => title;
    w.__MDFY_GET_DOC_ID__ = () => docId;
    w.__MDFY_SET_MARKDOWN__ = (md: string) => {
      setMarkdown(md);
      doRender(md);
      cmSetDocRef.current?.(md);
    };

    // Listen for Cmd+S from desktop (save to local file)
    const handleDesktopSave = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        window.postMessage({ type: "mdfy-desktop-save", markdown, title }, "*");
      }
    };
    window.addEventListener("keydown", handleDesktopSave);

    // Notify desktop when document is published/shared
    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);
    const checkUrl = () => {
      const urlPath = window.location.pathname;
      const match = urlPath.match(/^\/([a-zA-Z0-9_-]{6,12})$/);
      if (match && docId) {
        window.postMessage({ type: "mdfy-desktop-published", docId, editToken: w.__MDFY_EDIT_TOKEN__ as string }, "*");
      }
    };
    const wrappedPush = (...args: Parameters<typeof history.pushState>) => { origPushState(...args); checkUrl(); };
    const wrappedReplace = (...args: Parameters<typeof history.replaceState>) => { origReplaceState(...args); checkUrl(); };
    history.pushState = wrappedPush;
    history.replaceState = wrappedReplace;

    return () => {
      window.removeEventListener("keydown", handleDesktopSave);
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
      delete w.__MDFY_GET_MARKDOWN__;
      delete w.__MDFY_GET_TITLE__;
      delete w.__MDFY_GET_DOC_ID__;
      delete w.__MDFY_SET_MARKDOWN__;
    };
  }, [markdown, title, docId, doRender, setMarkdown]);

  // Format AI conversation
  const handleFormatAiConversation = useCallback(() => {
    const messages = parseConversation(markdown);
    if (messages) {
      const formatted = formatConversation(messages);
      setMarkdown(formatted);
      doRender(formatted);
      cmSetDocRef.current?.(formatted);
    }
    setShowAiBanner(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, doRender]);

  // Export PDF — open clean document in new window and print
  const handleExportPdf = useCallback(() => {
    setShowMenu(false);
    // Clone rendered HTML, strip UI buttons
    const clone = document.createElement("div");
    clone.innerHTML = html;
    clone.querySelectorAll(".code-copy-btn, .code-header, .code-lang-label, .mermaid-edit-btn, .mermaid-toolbar, .ascii-render-btn, .ascii-toggle-btn, .ce-spacer").forEach(n => n.remove());
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title || "Document"}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 768px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.9em; }
  pre code { background: none; }
  blockquote { border-left: 3px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  img { max-width: 100%; }
  h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
  h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  @media print { body { margin: 0; padding: 0 0.5rem; } }
</style>
</head>
<body>
${clone.innerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  }, [html, title]);

  // Edit shared doc
  const _handleEditShared = useCallback(() => {
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
      // View mode shortcuts: Alt+H Home, Alt+1 Live, Alt+2 Split, Alt+3 Source
      if (e.altKey && !mod && e.key === "h") { e.preventDefault(); setShowOnboarding(true); }
      if (e.altKey && !mod && e.key === "1") { e.preventDefault(); setShowOnboarding(false); setViewMode("preview"); }
      if (e.altKey && !mod && e.key === "2") { e.preventDefault(); setShowOnboarding(false); setViewMode("split"); }
      if (e.altKey && !mod && e.key === "3") { e.preventDefault(); setShowOnboarding(false); setViewMode("editor"); }
      if (e.key === "Escape") {
        if (showCommandPalette) { setShowCommandPalette(false); setCmdSearch(""); return; }
        // If a modal/dialog is handling Escape, don't also focus editor
        const target = e.target as HTMLElement;
        if (target.closest("[role='dialog'], [data-modal]")) return;
        cmFocus();
      }
      // Command palette — Cmd+K (when NOT in contentEditable preview)
      const inPreview = document.activeElement?.closest("article.mdcore-rendered");
      if (mod && e.key === "k" && !inPreview) {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        setCmdSearch("");
        return;
      }
      // WYSIWYG shortcuts — only when editing in preview (contentEditable)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleShare, handleCopyHtml, undo, redo, showCommandPalette]);

  // ── Cursor-aware insertion ──
  // Saves WYSIWYG cursor position so inserts go where the user expects
  const insertPosRef = useRef<number>(-1);

  const saveInsertPosition = useCallback(() => {
    const md = markdownRef.current;

    // Check if cursor is in the WYSIWYG article (works in preview AND split modes)
    const article = previewRef.current?.querySelector("article");
    const sel = window.getSelection();
    if (!article || !sel?.rangeCount || !article.contains(sel.getRangeAt(0).startContainer)) {
      // Cursor not in article — try CodeMirror cursor (source/split mode)
      if (editorContainerRef.current?.contains(document.activeElement)) {
        // CM cursor: snap to end of current line for block insertion
        const cmPos = cmGetCursorPos();
        const lines = md.split("\n");
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1;
          if (charCount > cmPos) {
            insertPosRef.current = charCount; // end of current line
            return;
          }
        }
      }
      insertPosRef.current = md.length;
      return;
    }

    const MARKER = "MDFYINSERT7X9K";
    const range = sel.getRangeAt(0);
    const markerNode = document.createTextNode(MARKER);
    range.insertNode(markerNode);

    // Clone article with marker, then immediately remove marker from live DOM
    const clone = article.cloneNode(true) as HTMLElement;
    markerNode.remove();
    article.normalize();

    // Move marker out of ce-spacers in clone (spacers are stripped before Turndown)
    clone.querySelectorAll(".ce-spacer").forEach(spacer => {
      if (spacer.textContent?.includes(MARKER)) {
        const txt = document.createTextNode(MARKER);
        spacer.parentNode?.insertBefore(txt, spacer.nextSibling);
      }
      spacer.remove();
    });
    clone.querySelectorAll(".code-copy-btn, .code-header, .code-lang-label, .mermaid-edit-btn, .mermaid-toolbar, .ascii-render-btn, .ascii-toggle-btn").forEach(el => el.remove());
    clone.querySelectorAll(".table-wrapper").forEach(wrapper => {
      const table = wrapper.querySelector("table");
      if (table) wrapper.replaceWith(table);
    });

    const mdWithMarker = htmlToMarkdown(clone.innerHTML);
    const markerIdx = mdWithMarker.indexOf(MARKER);

    if (markerIdx !== -1) {
      // Remove marker text to get clean position
      const clean = mdWithMarker.slice(0, markerIdx) + mdWithMarker.slice(markerIdx + MARKER.length);
      // Snap to end of current line (block-level insert boundary)
      const nextNl = clean.indexOf("\n", markerIdx);
      insertPosRef.current = nextNl !== -1 ? nextNl + 1 : clean.length;
    } else {
      insertPosRef.current = md.length;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertBlockAtCursor = useCallback((content: string): string => {
    const md = markdownRef.current;
    const pos = insertPosRef.current;

    if (pos < 0) {
      // No saved position — append at end
      const suffix = md.endsWith("\n") ? "\n" : "\n\n";
      return md + suffix + content;
    }

    const before = md.slice(0, pos);
    const after = md.slice(pos);
    const gap1 = before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const gap2 = after.startsWith("\n") ? "" : "\n";
    return before + gap1 + content + gap2 + after;
  }, []);

  // Insert special blocks (table, code, math, mermaid)
  const handleInsertTable = useCallback((cols: number, rows: number) => {
    saveInsertPosition();
    const header = "| " + Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ") + " |";
    const separator = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
    const row = "| " + Array.from({ length: cols }, () => "cell").join(" | ") + " |";
    const tableRows = Array.from({ length: rows }, () => row).join("\n");
    const block = `${header}\n${separator}\n${tableRows}`;
    const newMd = insertBlockAtCursor(block);
    setMarkdown(newMd);
    cmSetDoc(newMd);
    doRender(newMd);
  }, [saveInsertPosition, insertBlockAtCursor, doRender, setMarkdown, cmSetDoc]);

  const handleInsertBlock = useCallback((type: "code" | "math" | "mermaid") => {
    saveInsertPosition();

    switch (type) {
      case "code": {
        const block = "```\ncode here\n```";
        const newMd = insertBlockAtCursor(block);
        setMarkdown(newMd);
        cmSetDoc(newMd);
        doRender(newMd);
        break;
      }
      case "math":
        setInitialMath("");
        mathOriginalRef.current = null;
        setShowMathModal(true);
        return;
      case "mermaid":
        mermaidIsNewRef.current = true;
        setCanvasMermaid("graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E");
        setShowMermaidModal(true);
        return;
    }
  }, [saveInsertPosition, insertBlockAtCursor, doRender, setMarkdown, cmSetDoc]);

  // Protect special elements from contentEditable — make them non-editable islands
  useEffect(() => {
    if (!previewRef.current) return;
    const article = previewRef.current.querySelector("article");
    if (!article) return;
    // Non-editable blocks: code, mermaid, math, tables, images, ascii diagrams
    const nonEditableSelector = "pre, .mermaid-container, .mermaid-rendered, .math-rendered, .katex-display, .ascii-diagram, table, img";
    article.querySelectorAll(nonEditableSelector).forEach(el => {
      (el as HTMLElement).contentEditable = "false";

      // Skip spacers for inline math — <p> spacers break list/paragraph layout
      if (el.classList.contains("math-rendered") &&
          el.getAttribute("data-math-mode") === "inline") {
        return;
      }

      // For tables inside table-wrapper, add spacers to wrapper (not inside it)
      let spacerTarget: Element = el;
      if (el.tagName === "TABLE" && el.parentElement?.classList.contains("table-wrapper")) {
        spacerTarget = el.parentElement;
        (spacerTarget as HTMLElement).contentEditable = "false";
      }

      // Add editable spacer AFTER if missing — so cursor can be placed below
      const next = spacerTarget.nextElementSibling;
      if (!next || (next.getAttribute("contenteditable") === "false" && !next.classList.contains("ce-spacer"))) {
        if (!spacerTarget.nextElementSibling?.classList.contains("ce-spacer")) {
          const spacer = document.createElement("p");
          spacer.innerHTML = "<br>";
          spacer.className = "ce-spacer";
          spacerTarget.parentNode?.insertBefore(spacer, spacerTarget.nextSibling);
        }
      }

      // Add editable spacer BEFORE if missing — so cursor can be placed above
      const prev = spacerTarget.previousElementSibling;
      if (!prev || (prev.getAttribute("contenteditable") === "false" && !prev.classList.contains("ce-spacer"))) {
        if (!spacerTarget.previousElementSibling?.classList.contains("ce-spacer")) {
          const spacer = document.createElement("p");
          spacer.innerHTML = "<br>";
          spacer.className = "ce-spacer";
          spacerTarget.parentNode?.insertBefore(spacer, spacerTarget);
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
    sharing: "SHARE",
    copied: "COPIED!",
    error: "RETRY",
  }[shareState];

  // Memoize sidebar filter computations to avoid re-filtering on every render
  const memoAllMyTabs = useMemo(() =>
    tabs.filter(t => !t.deleted && !t.readonly && t.permission !== "readonly" && t.permission !== "editable"),
    [tabs]
  );

  const memoTrashTabs = useMemo(() =>
    isAuthenticated ? tabs.filter(t => t.deleted) : [],
    [tabs, isAuthenticated]
  );

  const memoExampleTabs = useMemo(() => {
    const canonicalIds = new Set(EXAMPLE_TABS.map(e => e.id));
    return tabs.filter(t => !t.deleted && canonicalIds.has(t.id) && !hiddenExampleIds.has(t.id));
  }, [tabs, hiddenExampleIds]);

  const memoMyTabs = useMemo(() => {
    const allMyTabs = memoAllMyTabs;
    return docFilter === "all" ? allMyTabs
      : docFilter === "private" ? allMyTabs.filter(t => !t.isSharedByMe && !t.isRestricted)
      : docFilter === "shared" ? allMyTabs.filter(t => t.isSharedByMe || t.isRestricted)
      : docFilter === "synced" ? allMyTabs.filter(t => t.source && ["vscode", "desktop", "cli", "mcp"].includes(t.source))
      : allMyTabs;
  }, [memoAllMyTabs, docFilter]);

  const memoPrivateCount = useMemo(() => memoAllMyTabs.filter(t => t.isDraft !== false).length, [memoAllMyTabs]);
  const memoSharedCount = useMemo(() => memoAllMyTabs.filter(t => t.isDraft === false).length, [memoAllMyTabs]);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: "100dvh", background: "var(--background)", color: "var(--foreground)" }}
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
        className="relative z-[100]"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}
      >
        {/* Row 1: Logo + View mode + Actions — no flex-wrap, direct mobile switch */}
        <div className="flex items-center px-3 sm:px-5 py-1.5 sm:py-2 gap-x-2 relative" style={{ justifyContent: "space-between" }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0" style={{ flex: "0 1 auto", maxWidth: "50%", position: "relative", zIndex: 2 }}>
          <h1
            className="font-bold tracking-tight cursor-pointer shrink-0 flex items-baseline"
            onClick={() => window.open("/about", "_blank")}
            title="mdfy.cc — About"
          >
            <MdfyLogo size={18} />
          </h1>
          {/* Permanent URL badge — click to copy */}
          {(() => {
            const ct = tabs.find(t => t.id === activeTabId);
            const cid = ct?.cloudId || docId;
            if (!cid) return null;
            const shortUrl = `mdfy.cc/${cid}`;
            return (
              <button
                className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 transition-colors hover:bg-[var(--accent-dim)] hidden sm:inline-block"
                style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}
                title="Click to copy document URL"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`https://${shortUrl}`);
                    showToast("URL copied", "success");
                  } catch { /* ignore */ }
                }}
              >
                {shortUrl}{viewCount > 0 && <span className="ml-1.5 px-1 py-0.5 rounded" style={{ background: "var(--toggle-bg)", fontSize: 8 }}>{viewCount} views</span>}
              </button>
            );
          })()}
          {/* Permission badge — desktop only in row 1 */}
          <span className="hidden sm:inline-flex items-center">
          {(() => {
            const ct = tabs.find(t => t.id === activeTabId);
            const perm = ct?.permission;
            if (perm === "readonly") return (
              <div className="inline-flex items-center gap-1.5">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 whitespace-nowrap"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
                  title="View only — duplicate to edit"
                >
                  VIEW&nbsp;ONLY
                </span>
                <button
                  onClick={() => {
                    const id = `tab-${Date.now()}`;
                    const origMd = markdownRef.current;
                    const t = title ? `${title} (copy)` : "Untitled (copy)";
                    const md = origMd.replace(/^(#\s+.+)$/m, `# ${t}`);
                    const newTab: Tab = { id, title: t, markdown: md, permission: "mine", shared: false, isDraft: true };
                    setTabs(prev => [...prev, newTab]);
                    setIsSharedDoc(false);
                    setIsOwner(true);
                    setDocEditMode("owner");
                    loadTab(newTab);
                    autoSave.createDocument({
                      markdown: md, title: t, userId: user?.id,
                      anonymousId: !user?.id ? ensureAnonymousId() : undefined,
                    }).then(result => {
                      if (result) {
                        setTabs(prev => {
                          const withoutDup = prev.filter(tab => !(tab.cloudId === result.id && tab.id !== id));
                          return withoutDup.map(tab => tab.id === id ? { ...tab, cloudId: result.id, editToken: result.editToken } : tab);
                        });
                        setDocId(result.id);
                        window.history.replaceState(null, "", `/?doc=${result.id}`);
                      }
                    });
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 flex items-center gap-1 transition-colors whitespace-nowrap hover:bg-[var(--menu-hover)]"
                  style={{ background: "var(--toggle-bg)", color: "var(--text-secondary)" }}
                  title="Duplicate to edit"
                >
                  <Copy width={10} height={10} />
                  Duplicate
                </button>
              </div>
            );
            return null;
          })()}
          </span>
          {/* Save status — after permission badge */}
          <span className="hidden sm:inline text-[10px] font-mono shrink-0">
          {autoSave.isSaving && <span style={{ color: "var(--text-faint)" }}>Saving...</span>}
          {autoSave.error && !autoSave.isSaving && <span style={{ color: "#ef4444" }}>{autoSave.error}</span>}
          {autoSave.lastSaved && !autoSave.isSaving && !autoSave.error && <span style={{ color: "var(--text-faint)", opacity: 0.5 }}>Saved</span>}
          </span>
        </div>

        {/* Center: Home + Layout mode switcher — absolute center relative to window */}
        <div
          className="flex items-center rounded-lg overflow-hidden shrink-0 pointer-events-auto"
          style={{ border: "1px solid var(--border-dim)", position: "absolute", left: "50%", transform: "translateX(-50%)" }}
        >
          {/* Home */}
          <button
            onClick={() => { setShowOnboarding(true); }}
            className="flex items-center gap-1 px-2 h-6 text-[10px] font-medium transition-colors"
            style={{
              background: showOnboarding && !viewMode ? "var(--accent-dim)" : showOnboarding ? "var(--accent-dim)" : "var(--toggle-bg)",
              color: showOnboarding ? "var(--accent)" : "var(--text-muted)",
            }}
            title="Home (Alt+H)"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5L8 2l6 4.5"/><path d="M3.5 8v5.5a1 1 0 001 1h7a1 1 0 001-1V8"/></svg>
          </button>
          {/* Live / Split / Source */}
          {([
            { mode: "preview" as ViewMode, label: "Live", shortcut: "1", icon: (
              <Eye width={13} height={13} />
            )},
            { mode: "split" as ViewMode, label: "Split", shortcut: "2", icon: (
              <Columns2 width={13} height={13} />
            )},
            { mode: "editor" as ViewMode, label: "Source", shortcut: "3", icon: (
              <Code width={13} height={13} />
            )},
          ]).map(({ mode, label, shortcut, icon }) => {
            const active = !showOnboarding && viewMode === mode;
            const hasActiveDoc = tabs.some(t => t.id === activeTabId && !t.deleted);
            const disabled = showOnboarding && !hasActiveDoc;
            return (
              <button
                key={mode}
                onClick={() => { if (!disabled) { setViewMode(mode); setShowOnboarding(false); } }}
                disabled={disabled}
                title={`${label} (Alt+${shortcut})`}
                className="flex items-center gap-1 px-2 h-6 text-[10px] font-medium transition-colors"
                style={{
                  background: active ? "var(--accent-dim)" : "var(--toggle-bg)",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? "default" : "pointer",
                }}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0 justify-end" style={{ position: "relative", zIndex: 2 }}>

          {/* AI Render moved to LIVE panel header */}

          {/* Presence indicators — other editors on this document */}
          {otherEditors.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-1">
              {otherEditors.slice(0, 5).map((editor) => (
                <div key={editor.userId} className="relative group/presence">
                  {editor.avatarUrl ? (
                    <img
                      src={editor.avatarUrl}
                      alt={editor.displayName || editor.email}
                      className="w-5 h-5 rounded-full shrink-0 object-cover"
                      style={{ outline: "2px solid var(--background)" }}
                      title={editor.displayName || editor.email}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                    />
                  ) : null}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0${editor.avatarUrl ? " hidden" : ""}`}
                    style={{ background: `hsl(${editor.email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 60%, 50%)`, color: "#fff", outline: "2px solid var(--background)" }}
                    title={editor.displayName || editor.email}
                  >
                    {(editor.displayName || editor.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[9px] whitespace-nowrap opacity-0 pointer-events-none group-hover/presence:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    <div className="font-medium" style={{ color: "var(--text-primary)" }}>{editor.displayName || "Unknown"}</div>
                    <div style={{ color: "var(--text-muted)" }}>{editor.email}</div>
                    <div style={{ color: "var(--accent)" }}>Editing now</div>
                  </div>
                </div>
              ))}
              {otherEditors.length > 5 && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ background: "var(--toggle-bg)", color: "var(--text-muted)", outline: "2px solid var(--background)" }}>
                  +{otherEditors.length - 5}
                </div>
              )}
            </div>
          )}

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
                  }}
                  className="relative h-6 w-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ background: showNotifications ? "var(--accent-dim)" : "var(--toggle-bg)", color: showNotifications ? "var(--accent)" : "var(--text-muted)" }}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                  title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                >
                  <Bell width={13} height={13} />
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
                            // Mark this notification as read
                            if (!n.read) {
                              setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                              setUnreadCount(prev => Math.max(0, prev - 1));
                              fetch("/api/notifications", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", ...authHeaders },
                                body: JSON.stringify({ ids: [n.id] }),
                              }).catch(() => {});
                            }
                            if (!n.documentId) return;
                            // Check if already open as a tab
                            const existing = tabs.find(t => !t.deleted && t.cloudId === n.documentId);
                            if (existing) {
                              switchTab(existing.id);
                              return;
                            }
                            // Fetch and open as new tab
                            try {
                              const res = await fetch(`/api/docs/${n.documentId}`, { headers: authHeaders });
                              if (!res.ok) {
                                setNotifications(prev => prev.filter(x => x.documentId !== n.documentId));
                                return;
                              }
                              const d = await res.json();
                              const perm = d.isOwner ? "mine" : "readonly";
                              const newId = `tab-${Date.now()}`;
                              const newTab: Tab = { id: newId, title: d.title || n.documentTitle || "Untitled", markdown: d.markdown, cloudId: n.documentId, permission: perm as "mine" | "editable" | "readonly", shared: perm !== "mine", ownerEmail: d.ownerEmail || n.fromUserName || undefined };
                              // Render immediately, then update tabs
                              setTabs(prev => {
                                const dup = prev.find(t => t.cloudId === n.documentId);
                                if (dup) {
                                  return prev.map(t => t.cloudId === n.documentId ? { ...t, markdown: d.markdown, title: d.title || t.title, permission: perm as "mine" | "editable" | "readonly" } : t);
                                }
                                const saved = prev.map(t => t.id !== activeTabIdRef.current || t.readonly ? t : { ...t, markdown: markdownRef.current });
                                return [...saved, newTab];
                              });
                              loadTab(newTab);
                            } catch {
                              window.location.href = `/?from=${n.documentId}`;
                            }
                          }}
                        >
                          <img src={dicebearUrl(n.fromUserName || "user", 24)} alt="" className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
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

            {/* Presence indicators moved to before theme toggle */}

            <div className="relative group">
              <button
                onClick={handleShare}
                disabled={shareState === "sharing"}
                className="px-2 h-6 rounded-md font-mono transition-colors text-[10px] font-medium flex items-center gap-1.5"
                title={`Share (${mod}+S)`}
                style={{
                  background: shareState === "copied" ? "rgba(34, 197, 94, 0.2)" : "var(--accent-dim)",
                  color: shareState === "copied" ? "#4ade80" : "var(--accent)",
                }}
              >
                {shareState === "sharing" ? (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/></svg>
                ) : (
                  <Share2 width={12} height={12} />
                )}
                <span className="hidden lg:inline">{shareButtonLabel}</span>
              </button>
              <div className="absolute top-full mt-1.5 right-0 w-48 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                {(() => {
                  const ct = tabs.find(t => t.id === activeTabId);
                  const isMine = !ct?.permission || ct.permission === "mine";
                  if (docId && isMine) return (
                    <>
                      <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>Share Settings</p>
                      <p>Manage who can view or edit this document. Add people by email, set general access, and copy the share link.</p>
                    </>
                  );
                  if (docId && !isMine) return (
                    <>
                      <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>Share</p>
                      <p>View document info, copy the share link, or request edit access from the owner.</p>
                    </>
                  );
                  return (
                    <>
                      <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>Share</p>
                      <p>Publish and create a share link for this document. Changes auto-save automatically. <span style={{ color: "var(--text-faint)" }}>{mod}+S</span></p>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-1.5 h-6 rounded-md transition-colors flex items-center"
                title="Menu"
                style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              >
                <Menu width={16} height={16} />
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
                      <span className="float-right hidden sm:inline" style={{ color: "var(--text-muted)" }}>{isMac ? "⌘⇧C" : "Ctrl+Shift+C"}</span>
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
                    <hr style={{ borderColor: "var(--border)" }} className="my-1" />
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
        </div>{/* end Row 1 */}

        {/* Row 2: Mobile-only — title + permission + save status */}
        {(title || (() => { const ct = tabs.find(t => t.id === activeTabId); return ct?.permission === "readonly"; })()) && (
          <div className="flex sm:hidden items-center gap-2 px-3 pb-1.5 min-w-0">
            {title && (
              <span className="text-[11px] truncate flex-1 min-w-0" style={{ color: "var(--text-muted)" }}>
                {title}
              </span>
            )}
            {(() => {
              const ct = tabs.find(t => t.id === activeTabId);
              const cid = ct?.cloudId || docId;
              if (!cid) return null;
              return (
                <button
                  className="text-[8px] font-mono px-1 py-0.5 rounded shrink-0"
                  style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}
                  title="Click to copy document URL"
                  onClick={async () => { try { await navigator.clipboard.writeText(`https://mdfy.cc/${cid}`); showToast("URL copied", "success"); } catch {} }}
                >
                  /{cid}
                </button>
              );
            })()}
            {autoSave.isSaving && (
              <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-faint)" }}>Saving...</span>
            )}
            {autoSave.error && !autoSave.isSaving && (
              <span className="text-[9px] font-mono shrink-0" style={{ color: "#ef4444" }}>{autoSave.error}</span>
            )}
            {autoSave.lastSaved && !autoSave.isSaving && !autoSave.error && (
              <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-faint)", opacity: 0.5 }}>Saved</span>
            )}
            {docId && isOwner && viewCount > 0 && (
              <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-faint)" }}>
                {viewCount} {viewCount === 1 ? "view" : "views"}
              </span>
            )}
            {(() => {
              const ct = tabs.find(t => t.id === activeTabId);
              const perm = ct?.permission;
              if (perm === "readonly") return (
                <div className="inline-flex items-center gap-1">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 whitespace-nowrap"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
                    title="View only — duplicate to edit"
                  >
                    VIEW&nbsp;ONLY
                  </span>
                  <button
                    onClick={() => {
                      const id = `tab-${Date.now()}`;
                      const origMd = markdownRef.current;
                      const t2 = title ? `${title} (copy)` : "Untitled (copy)";
                      const md = origMd.replace(/^(#\s+.+)$/m, `# ${t2}`);
                      const newTab: Tab = { id, title: t2, markdown: md, permission: "mine", shared: false, isDraft: true };
                      setTabs(prev => [...prev, newTab]);
                      setIsSharedDoc(false);
                      setIsOwner(true);
                      setDocEditMode("owner");
                      loadTab(newTab);
                      autoSave.createDocument({
                        markdown: md, title: t2, userId: user?.id,
                        anonymousId: !user?.id ? ensureAnonymousId() : undefined,
                      }).then(result => {
                        if (result) {
                          setTabs(prev => {
                            const withoutDup = prev.filter(tab => !(tab.cloudId === result.id && tab.id !== id));
                            return withoutDup.map(tab => tab.id === id ? { ...tab, cloudId: result.id, editToken: result.editToken } : tab);
                          });
                          setDocId(result.id);
                          window.history.replaceState(null, "", `/?doc=${result.id}`);
                        }
                      });
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 flex items-center gap-1 transition-colors whitespace-nowrap hover:bg-[var(--menu-hover)]"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-secondary)" }}
                    title="Duplicate to edit"
                  >
                    <Copy width={9} height={9} />
                    Duplicate
                  </button>
                </div>
              );
              return null;
            })()}
          </div>
        )}
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
              title="Format AI conversation as a clean document"
            >
              Format
            </button>
            <button
              onClick={() => setShowAiBanner(false)}
              className="px-2 py-1 rounded font-mono text-[11px]"
              style={{ color: "var(--text-muted)" }}
              title="Dismiss this suggestion"
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
        {/* Mobile sidebar backdrop — blur + dim for depth effect */}
        {isMobile && showSidebar && (
          <div
            className="fixed inset-0 z-[200]"
            style={{ background: sidebarClosing ? "transparent" : "rgba(0,0,0,0.4)", transition: "background 0.25s ease" }}
            onClick={() => closeSidebar()}
          />
        )}
        <div
          className={`flex flex-col shrink-0 ${isMobile ? "fixed left-0 top-0 bottom-0 z-[201] shadow-2xl" : ""}`}
          data-pane="sidebar"
          style={{
            width: isMobile ? 260 : sidebarWidth,
            minWidth: isMobile ? 260 : 220,
            background: "var(--background)",
            borderRight: "1px solid var(--border-dim)",
            transition: isMobile ? "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)" : "width 0.15s ease",
            ...(isMobile ? { transform: sidebarClosing ? "translateX(-100%)" : "translateX(0)" } : {}),
          }}
        >
          {/* Header — toggle button + MD FILES + New */}
          <div
            className="flex items-center justify-between px-2 py-1.5 text-[11px] font-mono shrink-0 select-none"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)", cursor: "default" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="relative group">
                <button
                  onClick={() => closeSidebar()}
                  className="p-1 rounded transition-colors"
                  style={{ color: "var(--accent)" }}
                  title="Close sidebar"
                >
                  <PanelLeft width={14} height={14} />
                </button>
                <div className="absolute top-full left-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  Close sidebar
                </div>
              </div>
              <span style={{ color: "var(--accent)" }}>FILES</span>
              <button
                id="sidebar-refresh-btn"
                onClick={() => {
                  const btn = document.getElementById("sidebar-refresh-btn");
                  if (btn) { btn.classList.add("animate-spin"); setTimeout(() => btn.classList.remove("animate-spin"), 600); }
                  if (user?.id) {
                    fetch("/api/user/documents", { headers: authHeaders })
                      .then(res => res.ok ? res.json() : null)
                      .then(data => {
                        if (data?.documents) {
                          setServerDocs(data.documents);
                          const sm = new Map(data.documents.map((d: { id: string; source?: string }) => [d.id, d.source]));
                          setTabs(prev => {
                            const ids = new Set(prev.filter(t => t.cloudId).map(t => t.cloudId!));
                            const nw = data.documents.filter((d: { id: string }) => !ids.has(d.id)).map((d: { id: string; title?: string; source?: string; is_draft?: boolean }) => ({
                              id: `cloud-${d.id}`, title: d.title || "Untitled", markdown: "", cloudId: d.id, isDraft: d.is_draft !== false, source: d.source || undefined, permission: "mine" as const,
                            }));
                            return [...prev.map(t => t.cloudId ? { ...t, source: (sm.get(t.cloudId) as string) || undefined } : t), ...nw];
                          });
                        }
                      }).catch(() => {});
                  }
                }}
                className="w-4 h-4 rounded flex items-center justify-center transition-colors"
                style={{ color: "var(--text-faint)" }}
                title="Refresh"
              >
                <RefreshCw width={10} height={10} />
              </button>
              <button
                onClick={() => setShowSidebarHelp(!showSidebarHelp)}
                className="w-4 h-4 rounded flex items-center justify-center transition-all"
                style={{ color: showSidebarHelp ? "var(--accent)" : "var(--text-muted)", opacity: showSidebarHelp ? 1 : 0.6 }}
                title="What do the icons and filters mean?"
              >
                <HelpCircle width={12} height={12} />
              </button>
            </div>
            <div className="flex items-stretch gap-1">
              <div className="relative group flex">
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-1 h-6 px-1.5 rounded-md transition-colors text-[10px]"
                  style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  title="Import files"
                >
                  <Download width={10} height={10} />
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
                  title="New document"
                >
                  <Plus width={10} height={10} />
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
                  if (!md) {
                    showToast(`${file.name} appears to be empty`, "info");
                    continue;
                  }
                  const isPlainFormat = /\.(pdf|rtf|txt|csv|json|xml|pptx?|xlsx?|od[pst])$/i.test(file.name);
                  // Always create a new tab for imports
                  const tabId = `tab-${tabIdCounter++}`;
                  setTabs((prev) => [...prev, { id: tabId, title: name, markdown: md, isDraft: true, permission: "mine" }]);
                  setTimeout(() => switchTab(tabId), 50);
                  /* viewMode preserved — user controls it */
                  if (isPlainFormat && md.length > 50) {
                    setMdfyPrompt({ text: md, filename: file.name, tabId });
                  }
                  // BUG 7 fix: Create cloud document for imported files
                  const anonId = user?.id ? undefined : ensureAnonymousId();
                  autoSave.createDocument({
                    markdown: md,
                    title: name,
                    userId: user?.id,
                    anonymousId: anonId,
                  }).then(result => {
                    if (result) {
                      setTabs(prev => {
                        const withoutDup = prev.filter(t => !(t.cloudId === result.id && t.id !== tabId));
                        return withoutDup.map(t => t.id === tabId ? { ...t, cloudId: result.id, editToken: result.editToken } : t);
                      });
                    }
                  });
                } catch (err) {
                  console.error(`Failed to import ${files[idx].name}:`, err);
                  const message = err instanceof Error ? err.message : "Failed to import file";
                  showToast(`${files[idx].name}: ${message}`, "error");
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
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              if (files.length > 1) showToast(`Uploading ${files.length} images...`, "info");
              // Save cursor position before async uploads
              saveInsertPosition();
              for (const file of files) {
                const ts = Date.now();
                const placeholder = `![Uploading ${file.name}-${ts}...]()\n`;
                const withPlaceholder = insertBlockAtCursor(placeholder);
                setMarkdown(withPlaceholder);
                doRender(withPlaceholder);
                cmSetDoc(withPlaceholder);
                const url = await uploadImage(file);
                const current = markdownForImageRef.current;
                if (url) {
                  const updated = current.replace(placeholder, `![${file.name}](${url})\n`);
                  setMarkdown(updated); doRender(updated); cmSetDoc(updated);
                } else {
                  const updated = current.replace(placeholder, "");
                  setMarkdown(updated); doRender(updated); cmSetDoc(updated);
                }
              }
              e.target.value = "";
            }}
          />
          {/* Help panel — global, under FILES header */}
          {showSidebarHelp && (
            <div className="shrink-0 mx-2 mt-1.5 mb-1.5 p-2.5 rounded-md text-[10px] space-y-2" style={{ background: "var(--toggle-bg)", border: "1px solid var(--border-dim)" }}>
              <div className="font-semibold text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Filters</div>
              <div className="flex items-center gap-2"><span className="shrink-0 font-semibold" style={{ color: "var(--accent)", fontFamily: "'SF Mono', monospace" }}>ALL</span><span style={{ color: "var(--text-muted)" }}>All your documents</span></div>
              <div className="flex items-center gap-2"><span className="shrink-0 font-semibold" style={{ color: "var(--text-faint)", fontFamily: "'SF Mono', monospace" }}>PRIVATE</span><span style={{ color: "var(--text-muted)" }}>Not shared with anyone (includes synced)</span></div>
              <div className="flex items-center gap-2"><span className="shrink-0 font-semibold" style={{ color: "var(--text-faint)", fontFamily: "'SF Mono', monospace" }}>SHARED</span><span style={{ color: "var(--text-muted)" }}>Shared with others</span></div>
              <div className="flex items-center gap-2"><span className="shrink-0 font-semibold" style={{ color: "var(--text-faint)", fontFamily: "'SF Mono', monospace" }}>SYNCED</span><span style={{ color: "var(--text-muted)" }}>From VS Code, Desktop, CLI, or MCP</span></div>
              <div className="my-1.5" style={{ borderTop: "1px solid var(--border-dim)" }} />
              <div className="font-semibold text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Document Icons</div>
              <div className="flex items-center gap-2"><FileIcon width={12} height={12} style={{ color: "var(--text-faint)" }} /><span style={{ color: "var(--text-muted)" }}>Private / Draft</span></div>
              <div className="flex items-center gap-2"><CircleCheck width={12} height={12} style={{ color: "#22c55e" }} /><span style={{ color: "var(--text-muted)" }}>Synced (VS Code, Desktop, CLI, MCP)</span></div>
              <div className="flex items-center gap-2"><Share2 width={12} height={12} style={{ color: "#4ade80" }} /><span style={{ color: "var(--text-muted)" }}>Shared (anyone with link)</span></div>
              <div className="flex items-center gap-2"><Users width={12} height={12} style={{ color: "#60a5fa" }} /><span style={{ color: "var(--text-muted)" }}>Shared with specific people</span></div>
              <div className="flex items-center gap-2"><Eye width={12} height={12} style={{ color: "var(--text-faint)" }} /><span style={{ color: "var(--text-muted)" }}>View only (shared with me)</span></div>
              <div className="flex items-center gap-2">
                <div className="relative shrink-0" style={{ width: 12, height: 12 }}>
                  <Share2 width={12} height={12} style={{ color: "#4ade80" }} />
                  <svg className="absolute -bottom-[2px] -right-[2px]" width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="var(--toggle-bg)" /><path d="M2.5 4.2L3.5 5.2L5.5 3" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                </div>
                <span style={{ color: "var(--text-muted)" }}>Shared + Synced</span>
              </div>
            </div>
          )}
          {/* Document list — 3 permanent sections, accordion layout */}
          <div className="flex-1 flex flex-col min-h-0" onContextMenu={(e) => {
            e.preventDefault();
            setDocContextMenu(null);
            setFolderContextMenu(null);
            setSidebarContextMenu({ x: e.clientX, y: e.clientY });
          }}>
            {/* ── Section 1: MY DOCUMENTS ── */}
            {(() => {
              const allMyTabs = memoAllMyTabs;
              const myTabs = memoMyTabs;
              const myTabCount = allMyTabs.length;
              const _privateCount = memoPrivateCount;
              const _sharedCount = memoSharedCount;
              return (
                <div className={`flex flex-col ${showMyDocs ? "flex-1 min-h-0" : ""} pt-1.5`}>
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none shrink-0"
                    onClick={() => { setShowMyDocs(!showMyDocs); }}
                  >
                    <span className="flex-1 text-[11px] font-medium" style={{ color: showMyDocs ? "var(--accent)" : "var(--text-muted)" }}>My Documents</span>
                    {showMyDocs && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSidebarSearch(!showSidebarSearch); if (showSidebarSearch) setSidebarSearch(""); }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: showSidebarSearch || sidebarSearch ? "var(--accent)" : "var(--text-faint)" }}
                          title="Search documents"
                        >
                          <Search width={10} height={10} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowSortMenu(prev => !prev); }}
                            className="h-5 px-1.5 rounded flex items-center gap-1 transition-colors hover:bg-[var(--toggle-bg)]"
                            style={{ color: "var(--text-faint)", fontSize: 9 }}
                            title={`Sort: ${sortMode}`}
                          >
                            <ArrowUpDown width={9} height={9} />
                            <span className="hidden sm:inline" style={{ fontFamily: "var(--font-geist-mono, monospace)", letterSpacing: "0.3px" }}>
                              {{ newest: "New", oldest: "Old", az: "A-Z", za: "Z-A" }[sortMode]}
                            </span>
                          </button>
                          {showSortMenu && (<>
                            <div className="fixed inset-0 z-[9997]" onClick={(e) => { e.stopPropagation(); setShowSortMenu(false); }} />
                            <div className="absolute top-full right-0 mt-1 w-28 rounded-lg shadow-xl py-1 z-[9998]"
                              style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                              {([["newest", "Newest first"], ["oldest", "Oldest first"], ["az", "A → Z"], ["za", "Z → A"]] as const).map(([key, label]) => (
                                <button
                                  key={key}
                                  onClick={(e) => { e.stopPropagation(); setSortMode(key); setShowSortMenu(false); }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)]"
                                  style={{ color: sortMode === key ? "var(--accent)" : "var(--text-secondary)", fontWeight: sortMode === key ? 600 : 400 }}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </>)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = `folder-${Date.now()}`;
                            setFolders(prev => [...prev, { id, name: "New Folder", collapsed: false }]);
                            fetch("/api/user/folders", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id, name: "New Folder", section: "my" }) }).catch(() => {});
                            setInlineInput({ label: "Folder name", defaultValue: "New Folder", onSubmit: (name) => { setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); fetch("/api/user/folders", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id, name }) }).catch(() => {}); setInlineInput(null); }});
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title="New folder"
                        >
                          <FolderPlus width={10} height={10} />
                        </button>
                      </>
                    )}
                    {!showMyDocs && myTabCount > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{myTabCount}</span>}
                  </div>
                  {showMyDocs && (
                    <>
                    {/* Grouped tab filter — fixed */}
                    <div className="shrink-0 space-y-0.5 pt-1 pb-0 pl-2 pr-2">
                      <div className="flex items-center gap-1.5 px-1 pb-1.5">
                        <div className="flex flex-1 rounded-md overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
                          {(["all", "private", "shared", "synced"] as const).map((f) => {
                            const tips: Record<string, string> = {
                              all: "Show all documents",
                              private: "Only visible to you",
                              shared: "Shared via public URL",
                              synced: "Synced from VS Code",
                            };
                            const labels: Record<string, string> = { all: "ALL", private: "PRIVATE", shared: "SHARED", synced: "SYNCED" };
                            return (
                            <button
                              key={f}
                              onClick={() => setDocFilter(f)}
                              title={tips[f]}
                              className="flex-1 text-[9px] font-semibold py-1 transition-colors"
                              style={{
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                color: docFilter === f ? "var(--accent)" : "var(--text-faint)",
                                background: docFilter === f ? "var(--accent-dim)" : "transparent",
                              }}
                            >
                              {labels[f]}
                            </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Search — toggle with icon */}
                      {(sidebarSearch || showSidebarSearch) && (
                        <div className="flex items-center gap-1.5 mx-1 mb-1.5 px-2 rounded" style={{ background: "var(--toggle-bg)" }}>
                          <Search width={12} height={12} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={sidebarSearch}
                            onChange={(e) => setSidebarSearch(e.target.value)}
                            onBlur={() => { setTimeout(() => { if (!sidebarSearch) setShowSidebarSearch(false); }, 150); }}
                            autoFocus
                            className="w-full text-[11px] py-1.5 bg-transparent"
                            style={{ color: "var(--text-secondary)", border: "none", outline: "none" }}
                          />
                          {sidebarSearch && (
                            <button
                              onClick={() => { setSidebarSearch(""); setShowSidebarSearch(false); }}
                              className="shrink-0 flex items-center justify-center w-4 h-4 rounded hover:bg-[var(--border-dim)]"
                              style={{ color: "var(--text-faint)" }}
                            >
                              <X width={10} height={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Document list — scrollable */}
                    <div ref={sidebarListRef} className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pb-1 pl-2 pr-2">
                      {/* Root-level documents (no folder, mine only) */}
                      {(() => {
                        const MAX_VISIBLE_DOCS = 100;
                        const now = Date.now();
                        const allRootTabs = myTabs.filter(t => !t.folderId && (!sidebarSearch || (t.title || "").toLowerCase().includes(sidebarSearch.toLowerCase()) || (t.markdown || "").toLowerCase().includes(sidebarSearch.toLowerCase()))).sort((a, b) => {
                          if (sortMode === "az") return (a.title || "").localeCompare(b.title || "");
                          if (sortMode === "za") return (b.title || "").localeCompare(a.title || "");
                          const at = a.lastOpenedAt || now;
                          const bt = b.lastOpenedAt || now;
                          return sortMode === "newest" ? bt - at : at - bt;
                        });
                        const visibleRootTabs = showAllDocs || allRootTabs.length <= MAX_VISIBLE_DOCS ? allRootTabs : allRootTabs.slice(0, MAX_VISIBLE_DOCS);
                        return (<>
                      {visibleRootTabs.map((tab) => (
                        <div
                          key={tab.id}
                          data-tab-id={tab.id}
                          draggable={tab.ownerEmail !== EXAMPLE_OWNER}
                          onDragStart={() => { if (tab.ownerEmail === EXAMPLE_OWNER) return; setDragTabId(tab.id); }}
                          onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer group text-xs transition-all duration-200 ${dragOverTarget === tab.id ? "ring-1 ring-[var(--accent)]" : ""}`}
                          style={{
                            background: selectedTabIds.has(tab.id) || tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                            color: selectedTabIds.has(tab.id) || tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                            opacity: dragTabId === tab.id ? 0.4 : 1,
                            outline: selectedTabIds.has(tab.id) ? "1px solid var(--accent)" : "none",
                            outlineOffset: "-1px",
                          }}
                          onClick={(e) => handleDocClick(tab.id, e)}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                        >
                          <DocStatusIcon tab={tab} isActive={tab.id === activeTabId} />
                          <div className="truncate flex-1 min-w-0">
                            <span className="truncate block text-[12px]">{tab.title || "Untitled"}</span>
                            {tab.lastOpenedAt && <span className="block text-[9px] font-mono" style={{ color: "var(--text-faint)", opacity: 0.6 }}>{relativeTime(new Date(tab.lastOpenedAt).toISOString())}</span>}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id }); }}
                            className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", padding: "2px" }} title="Document options">
                            <MoreHorizontal width={14} height={14} />
                          </button>
                        </div>
                      ))}
                      {allRootTabs.length > MAX_VISIBLE_DOCS && !showAllDocs && (
                        <button
                          onClick={() => setShowAllDocs(true)}
                          className="w-full text-center py-1.5 text-[10px] font-mono rounded-md transition-colors hover:bg-[var(--accent-dim)]"
                          style={{ color: "var(--accent)" }}
                        >
                          Show {allRootTabs.length - MAX_VISIBLE_DOCS} more...
                        </button>
                      )}
                      </>);
                      })()}

                      {/* Folders */}
                      {[...folders].filter(f => !f.section || f.section === "my").filter(f => {
                        // Hide empty folders when search or filter is active
                        const hasDocs = myTabs.some(t => t.folderId === f.id && (!sidebarSearch || (t.title || "").toLowerCase().includes(sidebarSearch.toLowerCase()) || (t.markdown || "").toLowerCase().includes(sidebarSearch.toLowerCase())));
                        if (sidebarSearch && !hasDocs) return false;
                        if (docFilter !== "all" && !hasDocs) return false;
                        return true;
                      }).sort((a, b) => {
                        if (sortMode === "az") return a.name.localeCompare(b.name);
                        if (sortMode === "za") return b.name.localeCompare(a.name);
                        const ai = folders.indexOf(a), bi = folders.indexOf(b);
                        return sortMode === "oldest" ? ai - bi : bi - ai;
                      }).map(folder => {
                        const folderTabs = myTabs.filter(t => t.folderId === folder.id && (!sidebarSearch || (t.title || "").toLowerCase().includes(sidebarSearch.toLowerCase()) || (t.markdown || "").toLowerCase().includes(sidebarSearch.toLowerCase())));
                        return (
                          <div key={folder.id} className="mt-0.5">
                            <div
                              draggable
                              onDragStart={(e) => { setDragFolderId(folder.id); e.dataTransfer.effectAllowed = "move"; }}
                              onDragEnd={() => { setDragFolderId(null); setDragOverTarget(null); }}
                              className={`flex items-center gap-1 px-0.5 py-1 rounded-md cursor-pointer text-xs font-medium transition-colors group ${dragOverTarget === folder.id ? "ring-1 ring-[var(--accent)]" : ""}`}
                              style={{ color: "var(--text-muted)", background: dragOverTarget === folder.id ? "var(--accent-dim)" : "transparent", opacity: dragFolderId === folder.id ? 0.4 : 1 }}
                              onClick={() => setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, collapsed: !f.collapsed } : f))}
                              onDragOver={(e) => { e.preventDefault(); if (dragTabId || dragFolderId) setDragOverTarget(folder.id); }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragTabId) {
                                  setTabs(prev => prev.map(t => t.id === dragTabId ? { ...t, folderId: folder.id } : t));
                                }
                                if (dragFolderId && dragFolderId !== folder.id) {
                                  // Reorder: move dragged folder before this one
                                  setFolders(prev => {
                                    const dragged = prev.find(f => f.id === dragFolderId);
                                    if (!dragged) return prev;
                                    const without = prev.filter(f => f.id !== dragFolderId);
                                    const targetIdx = without.findIndex(f => f.id === folder.id);
                                    without.splice(targetIdx, 0, dragged);
                                    // Sync sort_order to server
                                    without.forEach((f, i) => {
                                      if (f.id !== "folder-shared-examples") {
                                        fetch("/api/user/folders", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id: f.id, sortOrder: i }) }).catch(() => {});
                                      }
                                    });
                                    return without;
                                  });
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
                              <ChevronDown width={8} height={8} className="shrink-0 -mr-1"
                                style={{ transform: folder.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                              {folder.collapsed ? (
                                <Folder width={14} height={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                              ) : (
                                <FolderOpen width={14} height={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                              )}
                              <span className="truncate flex-1">{folder.name}</span>
                              <span className="text-[9px] opacity-50 group-hover:opacity-0 transition-opacity ml-auto shrink-0 w-4 text-right">{folderTabs.length}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setFolderContextMenu({ x: rect.right, y: rect.bottom, folderId: folder.id });
                                }}
                                className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity -ml-4"
                                style={{ color: "var(--text-muted)", padding: "2px", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="Folder options"
                              >
                                <MoreHorizontal width={14} height={14} />
                              </button>
                            </div>
                            {!folder.collapsed && (
                              <div className="pl-3 pr-1 space-y-0.5 mt-0.5">
                                {[...folderTabs].sort((a, b) => {
                                  if (sortMode === "az") return (a.title || "").localeCompare(b.title || "");
                                  if (sortMode === "za") return (b.title || "").localeCompare(a.title || "");
                                  const at = a.lastOpenedAt || Date.now();
                                  const bt = b.lastOpenedAt || Date.now();
                                  return sortMode === "newest" ? bt - at : at - bt;
                                }).map((tab) => (
                                  <div
                                    key={tab.id}
                                    draggable
                                    onDragStart={() => setDragTabId(tab.id)}
                                    onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer group text-xs transition-colors"
                                    style={{
                                      background: selectedTabIds.has(tab.id) || tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                                      color: selectedTabIds.has(tab.id) || tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                                      opacity: dragTabId === tab.id ? 0.4 : 1,
                                      outline: selectedTabIds.has(tab.id) ? "1px solid var(--accent)" : "none",
                                      outlineOffset: "-1px",
                                    }}
                                    onClick={(e) => handleDocClick(tab.id, e)}
                                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                                  >
                                    <DocStatusIcon tab={tab} isActive={tab.id === activeTabId} />
                                    <div className="truncate flex-1 min-w-0">
                                      <span className="truncate block text-[12px]">{tab.title || "Untitled"}</span>
                                      {tab.lastOpenedAt && <span className="block text-[9px] font-mono" style={{ color: "var(--text-faint)", opacity: 0.6 }}>{relativeTime(new Date(tab.lastOpenedAt).toISOString())}</span>}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id }); }}
                                      className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", padding: "2px" }} title="Document options">
                                      <MoreHorizontal width={14} height={14} />
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

                      {myTabs.length === 0 && (
                        <div className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {docFilter === "all" ? "No documents yet. Create one with the + button above." :
                           docFilter === "synced" ? (
                             !isAuthenticated
                               ? "Sign in to see synced documents."
                               : "No synced documents. Sync from VS Code, Desktop app, CLI, or MCP to see them here."
                           ) :
                           docFilter === "private" ? "No private documents." :
                           docFilter === "shared" ? (!isAuthenticated ? "Sign in to share documents." : "No shared documents.") :
                           "No documents found."}
                        </div>
                      )}

                      {/* Cloud search results */}
                      {sidebarSearch.length >= 3 && (
                        <>
                          {isCloudSearching && (
                            <div className="px-3 py-2 text-[10px]" style={{ color: "var(--text-faint)" }}>
                              <span className="inline-block animate-spin mr-1.5" style={{ width: 10, height: 10, border: "1.5px solid var(--text-faint)", borderTopColor: "transparent", borderRadius: "50%" }} />
                              Searching cloud...
                            </div>
                          )}
                          {!isCloudSearching && (() => {
                            const localCloudIds = new Set(tabs.filter(t => t.cloudId).map(t => t.cloudId!));
                            const uniqueResults = cloudSearchResults.filter(r => !localCloudIds.has(r.id));
                            if (uniqueResults.length === 0) return null;
                            return (
                              <>
                                <div className="px-3 pt-2 pb-1 text-[9px] font-semibold uppercase" style={{ color: "var(--text-faint)", letterSpacing: "0.5px" }}>
                                  Cloud results ({uniqueResults.length})
                                </div>
                                {uniqueResults.map(r => {
                                  const snippet = (r.snippet || "").slice(0, 80);
                                  const ago = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "";
                                  return (
                                    <div
                                      key={r.id}
                                      className="group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-[var(--menu-hover)]"
                                      onClick={() => {
                                        // Add as tab and load from cloud
                                        const tabId = `cloud-${r.id}`;
                                        const exists = tabs.find(t => t.id === tabId || t.cloudId === r.id);
                                        if (exists) {
                                          switchTab(exists.id);
                                        } else {
                                          const newTab = { id: tabId, title: r.title || "Untitled", markdown: "", cloudId: r.id, isDraft: r.isDraft, permission: "mine" as const };
                                          setTabs(prev => [...prev, newTab]);
                                          setTimeout(() => switchTab(tabId), 50);
                                        }
                                      }}
                                    >
                                      <Search width={11} height={11} className="shrink-0" style={{ color: "var(--accent)" }} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{r.title}</div>
                                        <div className="text-[9px] truncate" style={{ color: "var(--text-faint)" }}>{snippet || ago}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </>
                  )}
                </div>
              );
            })()}

            {/* ── Section 2: SHARED WITH ME ── */}
            {(() => {
              // Shared tabs: exclude examples (they have their own section)
              const sharedTabs = tabs.filter(t => {
                if (t.deleted || t.folderId) return false;
                if (t.ownerEmail === EXAMPLE_OWNER) return false;
                if (t.permission !== "readonly" && t.permission !== "editable") return false;
                if (sidebarSearch && !(t.title || "").toLowerCase().includes(sidebarSearch.toLowerCase()) && !(t.markdown || "").toLowerCase().includes(sidebarSearch.toLowerCase())) return false;
                if (!isAuthenticated) return false;
                return true;
              });
              // Deduplicate sharedTabs by cloudId (prevent duplicate entries)
              const seenCloudIds = new Set<string>();
              const dedupedSharedTabs = sharedTabs.filter(t => {
                if (!t.cloudId) return true;
                if (seenCloudIds.has(t.cloudId)) return false;
                seenCloudIds.add(t.cloudId);
                return true;
              });
              // Include deleted tabs' cloudIds so they don't reappear in extraShared
              const allCloudIds = new Set(tabs.filter(t => t.cloudId).map(t => t.cloudId!));
              // All my document cloudIds — to exclude from shared section
              const myCloudIds = new Set(tabs.filter(t => !t.deleted && (!t.permission || t.permission === "mine") && t.cloudId).map(t => t.cloudId!));
              // Unread notification document IDs — for orange dot indicator
              const unreadDocIds = new Set(notifications.filter(n => !n.read && n.documentId).map(n => n.documentId));
              // Merge recentDocs + notification-based shared docs (exclude my own + already-open/deleted)
              const extraShared = recentDocs.filter(d => !allCloudIds.has(d.id) && !myCloudIds.has(d.id));
              const notifDocs = notifications
                .filter(n => n.type === "share" && n.documentId && !allCloudIds.has(n.documentId) && !myCloudIds.has(n.documentId) && !extraShared.some(d => d.id === n.documentId))
                .map(n => ({ id: n.documentId, title: n.documentTitle, isOwner: false, editMode: "view", ownerName: n.fromUserName }));
              const allExtra = [...extraShared, ...notifDocs];
              const totalShared = dedupedSharedTabs.length + allExtra.length;
              return (<>
                <div className={`shrink-0 ${showSharedDocs ? "flex-1 min-h-0 flex flex-col" : ""}`} style={{ borderTop: "1px solid var(--border-dim)" }}>
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none shrink-0"
                    onClick={() => setShowSharedDocs(!showSharedDocs)}
                  >
                    <span className="flex-1 text-[11px] font-medium" style={{ color: showSharedDocs ? "var(--accent)" : "var(--text-muted)" }}>Shared with me</span>
                    {showSharedDocs && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSharedOwner(!showSharedOwner); }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: showSharedOwner ? "var(--accent)" : "var(--text-faint)" }}
                          title={showSharedOwner ? "Hide owner emails" : "Show owner emails"}
                        >
                          <User width={10} height={10} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSharedSortMode(prev => prev === "newest" ? "oldest" : prev === "oldest" ? "az" : prev === "az" ? "za" : "newest"); }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title={`Sort: ${sharedSortMode}`}
                        >
                          <ArrowUpDown width={10} height={10} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = `folder-${Date.now()}`;
                            setFolders(prev => [...prev, { id, name: "New Folder", collapsed: false, section: "shared" }]);
                            fetch("/api/user/folders", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id, name: "New Folder", section: "shared" }) }).catch(() => {});
                            setInlineInput({ label: "Folder name", defaultValue: "New Folder", onSubmit: (name) => { setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); fetch("/api/user/folders", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id, name }) }).catch(() => {}); setInlineInput(null); }});
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                          style={{ color: "var(--text-faint)" }}
                          title="New folder"
                        >
                          <FolderPlus width={10} height={10} />
                        </button>
                      </>
                    )}
                    {!showSharedDocs && totalShared > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{totalShared}</span>}
                  </div>
                  {showSharedDocs && (
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pt-1 pb-1 pl-2 pr-2">
                      {/* Shared tabs already open — draggable to folders */}
                      {dedupedSharedTabs.map((tab) => (
                        <div
                          key={tab.id}
                          draggable
                          onDragStart={() => setDragTabId(tab.id)}
                          onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer group text-xs transition-colors ${dragOverTarget === tab.id ? "ring-1 ring-[var(--accent)]" : ""}`}
                          style={{
                            background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                            color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                            opacity: dragTabId === tab.id ? 0.4 : 1,
                            outline: selectedTabIds.has(tab.id) ? "1px solid var(--accent)" : "none",
                            outlineOffset: "-1px",
                          }}
                          onClick={(e) => handleDocClick(tab.id, e)}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                        >
                          <DocStatusIcon tab={tab} isActive={tab.id === activeTabId} />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{tab.title || "Untitled"}</span>
                            {showSharedOwner && tab.ownerEmail && (
                              <span className="truncate block text-[9px]" style={{ color: "var(--text-faint)" }}>{tab.ownerEmail}</span>
                            )}
                          </div>
                          {tab.cloudId && unreadDocIds.has(tab.cloudId) && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                          )}
                          <button onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDocContextMenu({ x: rect.right, y: rect.bottom, tabId: tab.id }); }}
                            className="shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", padding: "2px" }} title="Document options">
                            <MoreHorizontal width={14} height={14} />
                          </button>
                        </div>
                      ))}
                      {/* Shared folders (exclude legacy Examples folder) */}
                      {folders.filter(f => f.section === "shared" && f.id !== EXAMPLES_FOLDER_ID).map(folder => {
                        const folderTabs = tabs.filter(t => !t.deleted && t.folderId === folder.id);
                        return (
                          <div key={folder.id} className="mt-0.5">
                            <div
                              className="flex items-center gap-1 px-0.5 py-1 rounded-md cursor-pointer text-xs font-medium transition-colors group"
                              style={{ color: "var(--text-muted)" }}
                              onClick={() => setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, collapsed: !f.collapsed } : f))}
                              onDragOver={(e) => { if (folder.id === EXAMPLES_FOLDER_ID) return; e.preventDefault(); if (dragTabId) setDragOverTarget(folder.id); }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => { if (folder.id === EXAMPLES_FOLDER_ID) return; e.preventDefault(); if (dragTabId) { setTabs(prev => prev.map(t => t.id === dragTabId ? { ...t, folderId: folder.id } : t)); } setDragTabId(null); setDragOverTarget(null); }}
                            >
                              <ChevronDown width={8} height={8} className="shrink-0 -mr-1"
                                style={{ transform: folder.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                              {folder.collapsed ? (
                                <Folder width={14} height={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                              ) : (
                                <FolderOpen width={14} height={14} className="shrink-0" style={{ color: "var(--text-faint)" }} />
                              )}
                              <span className="truncate flex-1">{folder.name}</span>
                              <span className="text-[9px] opacity-50 group-hover:opacity-0 transition-opacity ml-auto shrink-0">{folderTabs.length}</span>
                            </div>
                            {!folder.collapsed && (
                              <div className="pl-3 pr-1 space-y-0.5 mt-0.5">
                                {folderTabs.map(tab => (
                                  <div key={tab.id} data-tab-id={tab.id} draggable={tab.ownerEmail !== EXAMPLE_OWNER} onDragStart={() => { if (tab.ownerEmail === EXAMPLE_OWNER) return; setDragTabId(tab.id); }} onDragEnd={() => { setDragTabId(null); setDragOverTarget(null); }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer group text-xs transition-colors"
                                    style={{
                                      background: selectedTabIds.has(tab.id) || tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                                      color: selectedTabIds.has(tab.id) || tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                                      outline: selectedTabIds.has(tab.id) ? "1px solid var(--accent)" : "none",
                                      outlineOffset: "-1px",
                                    }}
                                    onClick={(e) => handleDocClick(tab.id, e)}
                                  >
                                    <DocStatusIcon tab={tab} isActive={tab.id === activeTabId} />
                                    <div className="flex-1 min-w-0">
                                      <span className="truncate block">{tab.title || "Untitled"}</span>
                                      {showSharedOwner && tab.ownerEmail && (
                                        <span className="truncate block text-[9px]" style={{ color: "var(--text-faint)" }}>{tab.ownerEmail}</span>
                                      )}
                                    </div>
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
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer group text-xs transition-colors hover:bg-[var(--accent-dim)]"
                          style={{ color: "var(--text-muted)" }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const existing = tabs.find(t => !t.deleted && t.cloudId === doc.id);
                            if (existing) { switchTab(existing.id); return; }
                            try {
                              const res = await fetch(`/api/docs/${doc.id}`, { headers: authHeaders });
                              if (!res.ok) {
                                console.error("[shared] Failed to load doc", doc.id, res.status, await res.text().catch(() => ""));
                                return;
                              }
                              const d = await res.json();
                              const perm = "readonly";
                              const newId = `tab-${Date.now()}`;
                              const newTab: Tab = { id: newId, title: d.title || "Untitled", markdown: d.markdown, cloudId: doc.id, permission: perm as "mine" | "editable" | "readonly", shared: true, ownerEmail: d.ownerEmail || undefined };
                              // Render immediately, then update tabs
                              setTabs(prev => {
                                const dup = prev.find(t => !t.deleted && t.cloudId === doc.id);
                                if (dup) {
                                  return prev.map(t => t.cloudId === doc.id ? { ...t, markdown: d.markdown, title: d.title || t.title } : t);
                                }
                                const saved = prev.map(t => t.id !== activeTabIdRef.current || t.readonly ? t : { ...t, markdown: markdownRef.current });
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
                          <DocStatusIcon tab={{ permission: "readonly" }} isActive={false} />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{doc.title || "Untitled"}</span>
                            {showSharedOwner && ((doc as { ownerEmail?: string }).ownerEmail || (doc as { ownerName?: string }).ownerName) && (
                              <span className="truncate block text-[9px]" style={{ color: "var(--text-faint)" }}>{(doc as { ownerEmail?: string }).ownerEmail || (doc as { ownerName?: string }).ownerName}</span>
                            )}
                          </div>
                          {unreadDocIds.has(doc.id) && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                          )}
                        </div>
                      ))}
                      {/* Drop zone for removing from shared folder */}
                      {dragTabId && (
                        <div
                          className="mx-2 mt-2 px-3 py-2 rounded-md text-[10px] text-center transition-colors"
                          style={{ border: "1px dashed var(--border)", color: "var(--text-faint)", background: dragOverTarget === "shared-root" ? "var(--accent-dim)" : "transparent" }}
                          onDragOver={(e) => { e.preventDefault(); setDragOverTarget("shared-root"); }}
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
                      {totalShared === 0 && (
                        <div className="px-2.5 py-3 text-[11px] text-center" style={{ color: "var(--text-faint)" }}>
                          {!isAuthenticated ? "Sign in to see documents shared with you." : "No shared documents"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>);
            })()}

            {/* ── Section: EXAMPLES (hidden entirely when toggle is OFF) ── */}
            {showExamples && (() => {
              const exampleTabs = memoExampleTabs;
              return (
                <div className="shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none shrink-0"
                    onClick={() => setExamplesCollapsed(!examplesCollapsed)}
                  >
                    <BookOpen width={11} height={11} style={{ color: examplesCollapsed ? "var(--text-faint)" : "var(--accent)" }} />
                    <span className="flex-1 text-[11px] font-medium" style={{ color: examplesCollapsed ? "var(--text-muted)" : "var(--accent)" }}>Examples</span>
                    {examplesCollapsed && exampleTabs.length > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{exampleTabs.length}</span>}
                  </div>
                  {!examplesCollapsed && <div className="space-y-0.5 pb-1 pl-2 pr-2">
                    {exampleTabs.map(tab => (
                      <div
                        key={tab.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer group text-xs transition-colors"
                        style={{
                          background: tab.id === activeTabId ? "var(--accent-dim)" : "transparent",
                          color: tab.id === activeTabId ? "var(--text-primary)" : "var(--text-secondary)",
                        }}
                        onClick={(e) => handleDocClick(tab.id, e)}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                      >
                        <Eye width={13} height={13} className="shrink-0" style={{ color: tab.id === activeTabId ? "var(--accent)" : "var(--text-faint)" }} />
                        <span className="truncate flex-1">{tab.title || "Untitled"}</span>
                      </div>
                    ))}
                  </div>}
                </div>
              );
            })()}

            {/* ── Section 3: TRASH ── */}
            {(() => {
              // Trash: all deleted documents (mine + shared I removed from list)
              const trashTabs = memoTrashTabs;
              return (<>
                <div className={`shrink-0 ${showTrash ? "flex-1 min-h-0 flex flex-col" : ""}`} style={{ borderTop: "1px solid var(--border-dim)" }}>
                  <div
                    className="flex items-center gap-1.5 px-3 h-7 cursor-pointer select-none shrink-0"
                    onClick={() => setShowTrash(!showTrash)}
                  >
                    <span className="flex-1 text-[11px] font-medium" style={{ color: showTrash ? "var(--accent)" : "var(--text-muted)" }}>Trash</span>
                    {!showTrash && trashTabs.length > 0 && <span className="text-[9px] px-1.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--border-dim)" }}>{trashTabs.length}</span>}
                  </div>
                  {showTrash && (
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pt-1 pb-1 pl-2 pr-2">
                      {trashTabs.map(tab => (
                        <div key={tab.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs group" style={{ color: "var(--text-faint)" }}>
                          <FileIcon width={14} height={14} className="shrink-0 opacity-40" />
                          <span className="truncate flex-1 line-through opacity-60">{tab.title || "Untitled"}</span>
                          <button onClick={() => {
                            // Only call server restore for MY docs
                            if (tab.cloudId && (!tab.permission || tab.permission === "mine")) {
                              restoreDocument(tab.cloudId, { userId: user?.id, editToken: tab.editToken || undefined }).catch(() => {});
                            }
                            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, deleted: false, deletedAt: undefined } : t));
                          }}
                            className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity px-1 rounded" style={{ color: "var(--accent)" }}
                            title="Restore this document">
                            Restore
                          </button>
                          <button onClick={() => {
                            // Only hard-delete on server for MY docs — shared docs just remove from local list
                            if (!tab.permission || tab.permission === "mine") hardDeleteOnServer(tab);
                            setTabs(prev => prev.filter(t => t.id !== tab.id));
                          }}
                            className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity px-1 rounded" style={{ color: "var(--text-faint)" }}
                            title={(!tab.permission || tab.permission === "mine") ? "Delete permanently" : "Remove from list"}>
                            {(!tab.permission || tab.permission === "mine") ? "Delete" : "Remove"}
                          </button>
                        </div>
                      ))}
                      {trashTabs.length > 0 && (
                        <button
                          onClick={(e) => {
                            const btn = e.currentTarget;
                            if (btn.dataset.confirm === "true") {
                              tabs.filter(t => t.deleted && t.cloudId && (!t.permission || t.permission === "mine")).forEach(t => hardDeleteOnServer(t));
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
                          title="Permanently delete all trashed documents"
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

          {/* Multi-select action bar */}
          {selectedTabIds.size > 0 && (
            <div className="shrink-0 px-3 py-2.5" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
              {/* Header: count + clear */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{selectedTabIds.size} document{selectedTabIds.size > 1 ? "s" : ""} selected</span>
                <button onClick={() => setSelectedTabIds(new Set())} className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--toggle-bg)]" style={{ color: "var(--text-faint)" }} title="Clear selection">
                  Clear
                </button>
              </div>
              {/* Actions */}
              <div className="flex gap-1.5">
                {folders.filter(f => !f.section || f.section === "my").length > 0 && (
                  <div className="relative group/move flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-colors hover:bg-[var(--accent-dim)]" style={{ color: "var(--text-secondary)", border: "1px solid var(--border-dim)" }} title="Move to folder">
                      <Folder width={11} height={11} /><span>Move</span><ChevronDown width={8} height={8} />
                    </button>
                    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg py-1 hidden group-hover/move:block" style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 9999 }}>
                      {folders.filter(f => !f.section || f.section === "my").map(f => (
                        <button key={f.id} onClick={() => { setTabs(prev => prev.map(t => selectedTabIds.has(t.id) ? { ...t, folderId: f.id } : t)); setSelectedTabIds(new Set()); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--accent-dim)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                          <Folder width={11} height={11} style={{ color: "var(--text-faint)" }} />{f.name}
                        </button>
                      ))}
                      <button onClick={() => { setTabs(prev => prev.map(t => selectedTabIds.has(t.id) ? { ...t, folderId: undefined } : t)); setSelectedTabIds(new Set()); }}
                        className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--accent-dim)] flex items-center gap-2" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-dim)" }}>
                        <FileIcon width={11} height={11} style={{ color: "var(--text-faint)" }} />Root
                      </button>
                    </div>
                  </div>
                )}
                <button onClick={() => {
                  if (!confirmTrash) {
                    setConfirmTrash(true);
                    setTimeout(() => { setConfirmTrash(false); }, 3000);
                    return;
                  }
                  setConfirmTrash(false);
                  const ids = selectedTabIds;
                  // Soft delete from server for cloud documents
                  tabs.filter(t => ids.has(t.id) && t.cloudId).forEach(t => softDeleteOnServer(t));
                  setTabs(prev => prev.map(t => ids.has(t.id) ? { ...t, deleted: true, deletedAt: Date.now() } : t));
                  if (ids.has(activeTabId)) { const rem = tabs.filter(t => !t.deleted && !ids.has(t.id)); if (rem.length) switchTab(rem[0].id); }
                  setSelectedTabIds(new Set());
                }} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${confirmTrash ? "bg-[#ef4444]" : ""}`}
                  style={{ color: confirmTrash ? "#fff" : "#ef4444", border: confirmTrash ? "1px solid #ef4444" : "1px solid rgba(239,68,68,0.3)" }}
                  title="Move to Trash">
                  <Trash2 width={11} height={11} /><span>{confirmTrash ? "Confirm?" : "Trash"}</span>
                </button>
              </div>
            </div>
          )}
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
                  title="Account settings"
                >
                  <img src={resolveAvatar(profile, user, 20)} alt="" className="w-5 h-5 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] truncate" style={{ color: "var(--text-primary)" }}>{profile?.display_name || user?.email?.split("@")[0]}</div>
                    <div className="text-[9px] truncate" style={{ color: "var(--text-faint)" }}>{user?.email}</div>
                  </div>
                  <ChevronDown width={10} height={10} style={{ color: "var(--text-faint)" }} />
                </button>
                {showAuthMenu && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowAuthMenu(false)} />
                    <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg shadow-xl z-[9999]"
                      style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                      {/* Profile header */}
                      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <div className="flex items-center gap-2.5">
                          <img src={resolveAvatar(profile, user, 32)} alt="" className="w-8 h-8 rounded-full shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{profile?.display_name || "User"}</div>
                            <div className="text-[10px] truncate" style={{ color: "var(--text-faint)" }}>{user?.email}</div>
                          </div>
                        </div>
                      </div>
                      {/* Plan info */}
                      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-medium" style={{ color: "var(--text-faint)" }}>Plan</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                            {(profile?.plan || "free").toUpperCase()}
                          </span>
                        </div>
                        {(!profile?.plan || profile.plan === "free") && (
                          <>
                            <div className="text-[10px] mb-2" style={{ color: "var(--text-faint)" }}>
                              Unlimited documents, free forever.
                            </div>
                            <button
                              onClick={() => { setShowAuthMenu(false); /* TODO: open pricing */ }}
                              className="w-full py-1.5 rounded-md text-[10px] font-semibold transition-colors"
                              style={{ background: "var(--accent)", color: "#000" }}
                            >
                              Upgrade to Pro
                            </button>
                            <div className="mt-1.5 text-[9px] space-y-0.5" style={{ color: "var(--text-faint)" }}>
                              <div>Pro includes:</div>
                              <div className="flex items-center gap-1.5"><span style={{ color: "var(--accent)" }}>-</span> Custom domains</div>
                              <div className="flex items-center gap-1.5"><span style={{ color: "var(--accent)" }}>-</span> Analytics</div>
                              <div className="flex items-center gap-1.5"><span style={{ color: "var(--accent)" }}>-</span> No watermark</div>
                              <div className="flex items-center gap-1.5"><span style={{ color: "var(--accent)" }}>-</span> Priority support</div>
                            </div>
                          </>
                        )}
                        {profile?.plan === "pro" && (
                          <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                            Full access to all features.
                          </div>
                        )}
                      </div>
                      {/* Settings */}
                      <div className="py-1" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <button
                          onClick={() => { setShowExamples(!showExamples); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <BookOpen width={12} height={12} />
                          <span className="flex-1">Show Examples</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: showExamples ? "var(--accent-dim)" : "var(--border-dim)", color: showExamples ? "var(--accent)" : "var(--text-faint)" }}>
                            {showExamples ? "ON" : "OFF"}
                          </span>
                        </button>
                        <a
                          href="/settings"
                          onClick={() => setShowAuthMenu(false)}
                          className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2"
                          style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                        >
                          <User width={12} height={12} />
                          Account Settings
                        </a>
                      </div>
                      {/* Theme */}
                      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <div className="text-[10px] font-mono uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Theme</div>
                        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                          {ACCENT_COLORS.map(c => (
                            <button
                              key={c.name}
                              onClick={() => { setAccentColor(c.name); if (colorScheme !== "default") { setColorScheme("default"); } }}
                              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                              style={{
                                background: theme === "dark" ? c.dark : c.light,
                                outline: accentColor === c.name && colorScheme === "default" ? "2px solid var(--text-primary)" : "none",
                                outlineOffset: "2px",
                              }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {COLOR_SCHEMES.map(s => (
                            <button
                              key={s.name}
                              onClick={() => { setColorScheme(s.name); }}
                              className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] transition-colors text-left"
                              style={{
                                background: colorScheme === s.name ? "var(--accent-dim)" : "transparent",
                                color: colorScheme === s.name ? "var(--accent)" : "var(--text-secondary)",
                              }}
                            >
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: s.preview, outline: colorScheme === s.name ? "2px solid var(--text-primary)" : "1px solid var(--border)", outlineOffset: "1px" }}
                              />
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            signOut();
                            setShowAuthMenu(false);
                            setTabs(INITIAL_TABS);
                            setFolders(INITIAL_FOLDERS);
                            setActiveTabId(INITIAL_TABS[0].id);
                            setMarkdown(INITIAL_TABS[0].markdown);
                            setDocId(null);
                            setIsOwner(false);
                            setIsSharedDoc(false);
                            setServerDocs([]);
                            setRecentDocs([]);
                            doRender(INITIAL_TABS[0].markdown);
                            window.history.replaceState(null, "", "/");
                            try { localStorage.removeItem("mdfy-tabs"); localStorage.removeItem("mdfy-folders"); localStorage.removeItem("mdfy-active-tab"); } catch {}
                          }}
                          className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <LogOut width={12} height={12} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Theme picker for non-authenticated users */}
                <div className="px-2 py-2 mb-1" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <div className="text-[10px] font-mono uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Theme</div>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => { setAccentColor(c.name); if (colorScheme !== "default") { setColorScheme("default"); } }}
                        className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: theme === "dark" ? c.dark : c.light,
                          outline: accentColor === c.name && colorScheme === "default" ? "2px solid var(--text-primary)" : "none",
                          outlineOffset: "2px",
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {COLOR_SCHEMES.map(s => (
                      <button
                        key={s.name}
                        onClick={() => { setColorScheme(s.name); }}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] transition-colors text-left"
                        style={{
                          background: colorScheme === s.name ? "var(--accent-dim)" : "transparent",
                          color: colorScheme === s.name ? "var(--accent)" : "var(--text-secondary)",
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: s.preview, outline: colorScheme === s.name ? "2px solid var(--text-primary)" : "1px solid var(--border)", outlineOffset: "1px" }}
                        />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowAuthMenu(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-xs hover:bg-[var(--accent-dim)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <User width={14} height={14} className="shrink-0" />
                  {sidebarWidth >= 180 ? "Sign In / Sign Up" : "Sign In"}
                </button>
              </>
            )}
          </div>
        </div>
        {/* Sidebar resize handle — hidden on mobile (sidebar is overlay) */}
        {!isMobile && (
          <div
            data-print-hide
            className="shrink-0 cursor-col-resize w-[5px]"
            style={{ background: "var(--border-dim)", position: "relative" }}
            onMouseDown={(e) => { e.preventDefault(); isDraggingSidebar.current = true; }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8" style={{ background: "var(--text-faint)", borderRadius: 2, opacity: 0.3 }} />
          </div>
        )}
        </>
      ) : (
        /* Collapsed: just the toggle button as a narrow strip */
        <div
          data-print-hide
          className="flex flex-col shrink-0 items-center pt-1.5 gap-1"
          style={{ width: 36, borderRight: "1px solid var(--border-dim)", background: "var(--background)" }}
        >
          <div className="relative group">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Open sidebar"
            >
              <PanelLeft width={14} height={14} />
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
              title="New document"
            >
              <Plus width={14} height={14} />
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
              title={isAuthenticated ? "Account" : "Sign in"}
            >
              {isAuthenticated ? (
                <img src={resolveAvatar(profile, user, 16)} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <User width={14} height={14} />
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
        className={`flex flex-1 min-h-0 overflow-hidden relative ${isMobile && viewMode === "split" ? "flex-col" : ""}`}
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
        onTouchMove={(e) => {
          if (!isDraggingSplit.current || !splitContainerRef.current) return;
          const touch = e.touches[0];
          const rect = splitContainerRef.current.getBoundingClientRect();
          let pct: number;
          if (isMobile) {
            pct = ((touch.clientY - rect.top) / rect.height) * 100;
          } else {
            pct = ((touch.clientX - rect.left) / rect.width) * 100;
          }
          pct = Math.max(25, Math.min(75, pct));
          splitPercentRef.current = pct;
          const renderPane = splitContainerRef.current.querySelector("[data-pane='render']") as HTMLElement;
          if (renderPane) {
            if (isMobile) { renderPane.style.height = `${pct}%`; }
            else { renderPane.style.width = `${pct}%`; }
          }
        }}
        onTouchEnd={() => { isDraggingSplit.current = false; }}
      >
        {/* Editor placeholder — replaces all panes when active */}
        {editorPlaceholder ? (
          <div className="flex-1 flex items-center justify-center" style={{ background: "var(--background)" }}>
            <div className="flex flex-col items-center gap-4 px-6 max-w-sm text-center">
              {editorPlaceholder === "sign-in" && (
                <>
                  <Lock width={48} height={48} strokeWidth={1.2} style={{ color: "var(--text-faint)" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Sign in to continue</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    This document may be private or shared with specific people. Sign in to view it if you have access.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={signInWithGoogle} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#000" }}>
                      Sign in with Google
                    </button>
                    <button onClick={signInWithGitHub} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      GitHub
                    </button>
                  </div>
                </>
              )}
              {editorPlaceholder === "restricted" && (
                <>
                  <ShieldAlert width={48} height={48} strokeWidth={1.2} style={{ color: "var(--text-faint)" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Access Restricted</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    This document is shared with specific people only. If you believe you should have access, contact the document owner.
                  </p>
                  <button onClick={() => {
                    setEditorPlaceholder(null);
                    window.history.replaceState(null, "", "/");
                    const validTab = tabs.find(t => !t.deleted);
                    if (validTab) loadTab(validTab);
                    setShowSidebar(true);
                  }} className="px-4 py-2 rounded-lg text-sm font-medium mt-2" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    My documents
                  </button>
                </>
              )}
              {editorPlaceholder === "not-found" && (
                <>
                  <FileX width={48} height={48} strokeWidth={1.2} style={{ color: "var(--text-faint)" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Document Not Found</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    This document may have been deleted or the link is incorrect.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setEditorPlaceholder(null); window.history.replaceState(null, "", "/"); addTab(); }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#000" }}>
                      New document
                    </button>
                    <button onClick={() => {
                      setEditorPlaceholder(null);
                      window.history.replaceState(null, "", "/");
                      const validTab = tabs.find(t => !t.deleted);
                      if (validTab) loadTab(validTab);
                      setShowSidebar(true);
                    }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      My documents
                    </button>
                  </div>
                </>
              )}
              {editorPlaceholder === "deleted" && (
                <>
                  <Trash2 width={48} height={48} strokeWidth={1.2} style={{ color: "var(--text-faint)" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>This document is in your Trash</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    You previously removed this document. Would you like to restore it?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => {
                      if (deletedDocId) {
                        // Restore the tab
                        setTabs(prev => prev.map(t => t.cloudId === deletedDocId ? { ...t, deleted: false, deletedAt: undefined } : t));
                        // Restore on server if it's our doc
                        const tab = tabs.find(t => t.cloudId === deletedDocId);
                        if (tab?.cloudId && (tab.permission === "mine" || !tab.permission)) {
                          restoreDocument(tab.cloudId, { userId: user?.id, editToken: tab.editToken || undefined }).catch(() => {});
                        }
                      }
                      setEditorPlaceholder(null);
                      setDeletedDocId(null);
                      // Reload the page to properly load the document
                      window.location.reload();
                    }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#000" }}>
                      Restore
                    </button>
                    <button onClick={() => {
                      setEditorPlaceholder(null);
                      setDeletedDocId(null);
                      window.history.replaceState(null, "", "/");
                      // Load a valid tab or open sidebar
                      const validTab = tabs.find(t => !t.deleted && t.id !== activeTabId) || tabs.find(t => !t.deleted);
                      if (validTab) {
                        loadTab(validTab);
                      } else {
                        setShowSidebar(true);
                      }
                    }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      Go back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (<>
        {/* Render pane (left/top) */}
        {viewMode !== "editor" && (
          <div
            data-pane="render"
            className="flex flex-col min-h-0"
            style={{
              background: "var(--background)",
              width: viewMode === "split" && !isMobile ? `${splitPercentRef.current}%` : "100%",
              height: viewMode === "split" && isMobile ? `${splitPercentRef.current}%` : undefined,
              flexShrink: 0,
              minWidth: viewMode === "split" && !isMobile ? 280 : undefined,
              overflow: viewMode === "split" && isMobile ? "hidden" : undefined,
            }}
          >
          {showOnboarding ? (
            /* ─── Start Screen ─── */
            <div className="flex-1 overflow-auto" style={{ background: "var(--background)" }}>
              <div className="max-w-xl mx-auto px-5 py-8">

                {/* Recent files */}
                {(() => {
                  const recent = tabs.filter(t => !t.deleted && !t.readonly && t.ownerEmail !== EXAMPLE_OWNER)
                    .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0)).slice(0, 5);
                  if (recent.length === 0) return null;
                  return (
                    <div className="mb-6">
                      <div className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>Recent</div>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
                        {recent.map((t, i) => (
                          <button key={t.id} onClick={() => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} switchTab(t.id); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-left cursor-pointer"
                            style={{ color: "var(--text-secondary)", background: "var(--surface)", transition: "all 0.12s", borderTop: i > 0 ? "1px solid var(--border-dim)" : "none" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--menu-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                            <DocStatusIcon tab={t} isActive={false} />
                            <span className="flex-1 truncate">{t.title || "Untitled"}</span>
                            {t.lastOpenedAt && <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-faint)" }}>{relativeTime(new Date(t.lastOpenedAt).toISOString())}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Create — 3 column grid like About page */}
                <div className="mb-6">
                  <div className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>Create</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "New Document", desc: "Blank page", kbd: isMobile ? "" : mod + "N", color: "#fb923c", icon: <Plus width={16} height={16} />, fn: () => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} addTab(); } },
                      { label: "Paste", desc: "From clipboard", kbd: isMobile ? "" : mod + "V", color: "#4ade80", icon: <FileText width={16} height={16} />, fn: () => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} } },
                      { label: "Import", desc: "PDF, Word, Excel...", kbd: "", color: "#60a5fa", icon: <Upload width={16} height={16} />, fn: () => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} imageFileRef.current?.click(); } },
                    ].map((item) => (
                      <button key={item.label} onClick={item.fn}
                        className="flex flex-col items-start px-4 py-3.5 rounded-xl text-left cursor-pointer overflow-hidden relative"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", transition: "all 0.12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 0 0 1px ${item.color}20`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div className="mb-2" style={{ color: item.color }}>{item.icon}</div>
                        <div className="text-[12px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>{item.desc}</div>
                        {item.kbd && <kbd className="text-[9px] font-mono mt-2 px-1.5 py-0.5 rounded" style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}>{item.kbd}</kbd>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drop zone */}
                <div className="mb-6 py-6 rounded-xl cursor-pointer text-center"
                  style={{ border: "2px dashed var(--border)", color: "var(--text-faint)", background: "var(--surface)", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-faint)"; }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-faint)"; e.currentTarget.style.background = "var(--surface)"; }}
                  onDrop={(e) => { e.preventDefault(); setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} }}
                  onClick={() => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} imageFileRef.current?.click(); }}>
                  <p className="text-[13px] font-medium">Drop files here to open</p>
                  <p className="text-[10px] mt-1" style={{ opacity: 0.5 }}>MD, PDF, DOCX, PPTX, XLSX, HTML, CSV</p>
                </div>

                {/* Examples — 2 column grid */}
                <div className="mb-6">
                  <div className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>Examples</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EXAMPLE_TABS.map((ex) => (
                      <button key={ex.id} onClick={() => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} switchTab(ex.id); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-left cursor-pointer"
                        style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border-dim)", transition: "all 0.12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <DocStatusIcon tab={ex} isActive={false} />
                        {ex.title}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Explore + Plugins — 2 column grid */}
                <div className="mb-6">
                  <div className="text-[11px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>Explore</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { label: "Trending", desc: "Popular GitHub projects", url: "/discover", color: "#fb923c", icon: <Zap width={14} height={14} /> },
                      { label: "Documentation", desc: "API and SDK reference", url: "/docs", color: "#60a5fa", icon: <FileText width={14} height={14} /> },
                      { label: "Plugins", desc: "Chrome, VS Code, Mac, CLI", url: "/plugins", color: "#4ade80", icon: <Download width={14} height={14} /> },
                      { label: "About", desc: "How mdfy.cc works", url: "/about", color: "#c4b5fd", icon: <HelpCircle width={14} height={14} /> },
                    ]).map((item) => (
                      <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left cursor-pointer"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", textDecoration: "none", transition: "all 0.12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 0 0 1px ${item.color}20`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div className="mt-0.5 shrink-0" style={{ color: item.color }}>{item.icon}</div>
                        <div>
                          <div className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{item.desc}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (<>
            <div
              data-print-hide
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-normal select-none"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)", cursor: "default" }}
            >
              <span className="shrink-0" style={{ color: "var(--accent)" }}>LIVE</span>
              <div className="flex items-center gap-1 normal-case shrink-0 flex-nowrap">
                {/* Toolbar toggle — icon with hint popover for new users */}
                {canEdit && <div className="relative group">
                  <button
                    onClick={() => { setShowToolbar(!showToolbar); if (!showToolbar && !toolbarHintDismissed) { setToolbarHintDismissed(true); try { localStorage.setItem("mdfy-toolbar-hint-dismissed", "1"); } catch {} } }}
                    className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors ${!showToolbar && !toolbarHintDismissed ? "ring-1 ring-[var(--accent)]" : ""}`}
                    style={{ background: showToolbar ? "var(--accent-dim)" : "transparent", color: showToolbar ? "var(--accent)" : "var(--text-faint)" }}
                    title={`Formatting toolbar ${showToolbar ? "ON" : "OFF"}`}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 4h14M1 8h14M1 12h14"/><circle cx="5" cy="4" r="1.5" fill="currentColor"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="7" cy="12" r="1.5" fill="currentColor"/></svg>
                  </button>
                  {/* Hint for new users — subtle ring + expanded tooltip */}
                  {!showToolbar && !toolbarHintDismissed && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-40 p-2 rounded-lg text-[10px] leading-relaxed z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--text-secondary)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                      <p style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 3 }}>Formatting Tools</p>
                      <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>Click to enable bold, headings, lists, and more.</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setToolbarHintDismissed(true); try { localStorage.setItem("mdfy-toolbar-hint-dismissed", "1"); } catch {} }}
                        className="text-[9px]" style={{ color: "var(--text-faint)" }}>Dismiss</button>
                    </div>
                  )}
                  {/* Regular hover tooltip (when hint is dismissed) */}
                  {toolbarHintDismissed && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-44 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                      <p style={{ color: showToolbar ? "var(--accent)" : "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>Formatting Toolbar {showToolbar ? "ON" : "OFF"}</p>
                      <p>Bold, italic, headings, lists, links, and more.</p>
                    </div>
                  )}
                </div>}
                {/* Narrow view toggle */}
                <div className="relative group" style={{ display: isMobile || renderPaneUnderNarrowWidth ? "none" : undefined }}>
                  <button
                    onClick={() => setNarrowView(!narrowView)}
                    className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                    style={{ background: narrowView ? "var(--accent-dim)" : "transparent", color: narrowView ? "var(--accent)" : "var(--text-faint)" }}
                    title={`Narrow view ${narrowView ? "ON" : "OFF"}`}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 2v12M12 2v12M1 8h3M12 8h3" strokeLinecap="round"/><path d="M6 6.5L8 8l-2 1.5M10 6.5L8 8l2 1.5" strokeLinecap="round"/></svg>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-44 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    <p style={{ color: narrowView ? "var(--accent)" : "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>Narrow View {narrowView ? "ON" : "OFF"}</p>
                    <p>Limit content width for comfortable reading, like a book layout.</p>
                  </div>
                </div>
                {/* ASCII toggle removed — render button on each diagram instead */}
                <div className="w-px h-3.5 mx-0.5" style={{ background: "var(--border-dim)" }} />
                {/* History — icon only */}
                {docId && (
                  <div className="relative group">
                    <button
                      onClick={handleToggleHistory}
                      className="flex items-center justify-center h-6 w-6 rounded-md transition-colors relative"
                      style={{ background: showHistory ? "var(--accent-dim)" : "transparent", color: showHistory ? "var(--accent)" : "var(--text-faint)" }}
                      title="Version history"
                    >
                      <Clock width={11} height={11} />
                      {versions.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[7px] flex items-center justify-center" style={{ background: "var(--accent)", color: "#000", fontWeight: 700 }}>{versions.length}</span>}
                    </button>
                    <div className="absolute top-full right-0 mt-1.5 w-44 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                      <p style={{ color: showHistory ? "var(--accent)" : "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>Version History</p>
                      <p>{versions.length > 0 ? `${versions.length} version${versions.length > 1 ? "s" : ""} saved. Click to browse and restore.` : "Save history appears after sharing your document."}</p>
                    </div>
                  </div>
                )}
                {/* Outline toggle */}
                <div className="relative group">
                  <button
                    onClick={() => { setShowOutlinePanel(prev => !prev); setShowAIPanel(false); setShowImagePanel(false); }}
                    className="flex items-center justify-center h-6 px-1.5 rounded-md transition-colors"
                    style={{ background: showOutlinePanel ? "var(--accent-dim)" : "transparent", color: showOutlinePanel ? "var(--accent)" : "var(--text-faint)" }}
                    title="Document outline"
                  >
                    <List width={13} height={13} />
                  </button>
                  {!showOutlinePanel && (
                    <div className="absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      Outline
                    </div>
                  )}
                </div>
                {/* AI Actions dropdown — only for editable docs */}
                {canEdit && <div className="relative group">
                  <button
                    onClick={() => { setShowAIPanel(prev => !prev); setShowExportMenu(false); setShowHistory(false); setShowImagePanel(false); setShowOutlinePanel(false); }}
                    className="flex items-center justify-center h-6 px-2.5 rounded-md transition-colors gap-1.5"
                    style={{ background: showAIPanel || aiProcessing ? "var(--accent-dim)" : "transparent", color: showAIPanel || aiProcessing ? "var(--accent)" : "var(--text-faint)", fontWeight: 600, fontSize: 11 }}
                    title="AI tools"
                  >
                    {aiProcessing ? <Loader2 width={11} height={11} className="animate-spin" /> : <Sparkles width={11} height={11} />}
                    {aiProcessing ? <span className="text-[9px] hidden sm:inline">
                      {{ polish: "Polishing", summary: "Summarizing", tldr: "Generating", translate: "Translating", chat: "Editing" }[aiProcessing] || "Processing"}...
                    </span> : <span className="hidden sm:inline text-[10px]">AI</span>}
                  </button>
                  {!showAIPanel && !aiProcessing && (
                    <div className="absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      AI Tools
                    </div>
                  )}
                </div>}
                {/* Images panel toggle */}
                {isAuthenticated && <div className="relative group">
                  <button
                    onClick={() => {
                      setShowImagePanel(prev => {
                        if (!prev && !imagesLoading) {
                          setImagesLoading(true);
                          fetch("/api/upload/list", { headers: authHeaders })
                            .then(r => r.ok ? r.json() : null)
                            .then(data => { if (data) { setUserImages(data.images || []); setImageQuota(data.quota); } })
                            .catch(() => {})
                            .finally(() => setImagesLoading(false));
                        }
                        return !prev;
                      });
                      setShowAIPanel(false); setShowHistory(false); setShowExportMenu(false); setShowOutlinePanel(false);
                    }}
                    className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                    style={{ background: showImagePanel ? "var(--accent-dim)" : "transparent", color: showImagePanel ? "var(--accent)" : "var(--text-faint)" }}
                    title="My images"
                  >
                    <ImageIcon width={11} height={11} />
                  </button>
                  {!showImagePanel && (
                    <div className="absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      My Images
                    </div>
                  )}
                </div>}
                <div className="w-px h-3.5 mx-0.5" style={{ background: "var(--border-dim)" }} />
                {/* Export dropdown */}
                <div className="relative group" ref={exportMenuRef}>
                  <button
                    onClick={() => { setShowExportMenu(prev => !prev); setShowMenu(false); }}
                    className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                    style={{ background: showExportMenu ? "var(--accent-dim)" : "transparent", color: showExportMenu ? "var(--accent)" : "var(--text-faint)" }}
                    title="Export"
                  >
                    <Upload width={11} height={11} />
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
                        <FileText width={12} height={12} />
                        Markdown (.md)
                      </button>
                      <button onClick={handleDownloadHtml} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <Code width={12} height={12} />
                        HTML (.html)
                      </button>
                      <button onClick={handleDownloadTxt} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <FileText width={12} height={12} />
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
                        <Code width={12} height={12} />
                        Raw HTML
                      </button>
                      <button onClick={() => { handleCopyRichText(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <FileText width={12} height={12} />
                        Rich Text (Docs / Email)
                      </button>
                      <button onClick={() => { handleCopySlack(); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 9.5a1.5 1.5 0 110-3H5v1.5A1.5 1.5 0 013.5 9.5zm3 0A1.5 1.5 0 015 8V3.5a1.5 1.5 0 113 0V8a1.5 1.5 0 01-1.5 1.5zm6-3a1.5 1.5 0 110 3H11V8a1.5 1.5 0 011.5-1.5zm-3 0A1.5 1.5 0 0111 8v4.5a1.5 1.5 0 11-3 0V8a1.5 1.5 0 011.5-1.5z"/></svg>
                        Slack (mrkdwn)
                      </button>
                      <button onClick={() => { handleCopyPlainText(); }} className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <FileText width={12} height={12} />
                        Plain Text
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* WYSIWYG Formatting Toolbar */}
            {/* Formatting toolbar — LIVE view only */}
            {showToolbar && canEdit && !editorPlaceholder && (
              <WysiwygToolbar
                onInsert={handleInsertBlock}
                onInsertTable={handleInsertTable}
                onInputPopup={(config) => setInlineInput({ ...config, onSubmit: (v) => { config.onSubmit(v); setInlineInput(null); } })}
                cmWrap={cmWrapSelection}
                cmInsert={cmInsertAtCursor}
                onImageUpload={() => imageFileRef.current?.click()}
                onUndo={undo}
                onRedo={redo}
              />
            )}
            {/* Toolbar hint for new users — visible only in Live view when toolbar is hidden */}
            {/* Toolbar hint removed — now integrated into toolbar toggle button */}
            <div className="flex-1 flex min-h-0">
            <div className="flex-1 overflow-auto relative" ref={previewRef} onClick={(e) => {
              // Clear source→preview highlight when clicking in Live
              clearHighlight();
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
                  <MdfyLogo size={18} />
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
                    narrowView
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
                    narrowView
                      ? "p-3 sm:p-6 mx-auto max-w-3xl"
                      : "p-3 sm:p-6 max-w-none"
                  }`}
                  style={{ cursor: "text", minHeight: "100%" }}
                  data-placeholder="true"
                  dangerouslySetInnerHTML={{ __html: "" }}
                />
              )}
              </div>{/* end scrollable preview */}
              {/* ─── AI Panel (side-by-side) ─── */}
              {showAIPanel && canEdit && (
                <div
                  className="flex flex-col shrink-0"
                  style={{
                    width: "min(340px, 50%)",
                    background: "var(--surface)",
                    borderLeft: "1px solid var(--border)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* AI Panel header */}
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <div className="flex items-center gap-1.5">
                      <Sparkles width={12} height={12} style={{ color: "var(--accent)" }} />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>AI Tools</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {aiChatHistory.length > 0 && (
                        <button
                          onClick={() => setAiChatHistory([])}
                          className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-[var(--menu-hover)]"
                          style={{ color: "var(--text-faint)" }}
                          title="Clear chat history"
                        >
                          <RotateCcw width={9} height={9} />
                        </button>
                      )}
                      {undoStack.current.length > 1 && (
                        <button
                          onClick={() => { undo(); setAiChatHistory(prev => [...prev, { role: "ai", text: "Reverted to previous version." }]); }}
                          className="flex items-center gap-1 px-1.5 h-5 rounded text-[9px] font-medium transition-colors hover:bg-[var(--menu-hover)]"
                          style={{ color: "var(--text-muted)" }}
                          title="Undo last AI change"
                        >
                          <Undo2 width={9} height={9} />
                          Undo
                        </button>
                      )}
                      <button
                        onClick={() => setShowAIPanel(false)}
                        className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-[var(--menu-hover)]"
                        style={{ color: "var(--text-muted)" }}
                        title="Close AI panel"
                      >
                        <X width={10} height={10} />
                      </button>
                    </div>
                  </div>
                  {/* Quick actions with tooltips */}
                  <div className="px-2 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        { action: "polish", icon: <Sparkles width={11} height={11} style={{ color: "var(--accent)" }} />, label: "Polish", desc: "Fix grammar, spelling, and improve clarity. Preserves meaning." },
                        { action: "summary", icon: <AlignLeft width={11} height={11} style={{ color: "#60a5fa" }} />, label: "Summary", desc: "Generate a 2-4 sentence summary and add it to the top of the document." },
                        { action: "tldr", icon: <List width={11} height={11} style={{ color: "#fbbf24" }} />, label: "TL;DR", desc: "Create 2-5 bullet points of key takeaways and add to the top." },
                        { action: "translate", icon: <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M2 3h7M5.5 3v9M3 6c1 3 3.5 5 5.5 6M8 6c-1 3-3.5 5-5.5 6"/><path d="M10 8l2 5 2-5M10.5 11.5h3"/></svg>, label: "Translate", desc: "Translate the entire document to another language. Code blocks stay unchanged." },
                      ] as const).map((item) => (
                        <div key={item.action} className="relative group/ai">
                          <button
                            onClick={() => item.action === "translate" ? setShowTranslatePicker(prev => !prev) : handleAIAction(item.action)}
                            disabled={!!aiProcessing}
                            className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] transition-colors hover:bg-[var(--menu-hover)]"
                            style={{ color: "var(--text-secondary)", background: "var(--toggle-bg)" }}>
                            {item.icon}
                            {item.label}
                          </button>
                          <div className="absolute top-full left-0 mt-1 w-48 p-2 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover/ai:opacity-100 transition-opacity z-[9999]"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                            <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 3 }}>{item.label}</p>
                            <p>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {showTranslatePicker && (
                      <div className="grid grid-cols-3 gap-0.5 pt-1.5">
                        {[
                          ["English", "English"], ["한국어", "Korean"], ["日本語", "Japanese"], ["中文", "Chinese"],
                          ["Español", "Spanish"], ["Français", "French"], ["Deutsch", "German"], ["Português", "Portuguese"],
                          ["Русский", "Russian"], ["العربية", "Arabic"], ["हिन्दी", "Hindi"], ["Tiếng Việt", "Vietnamese"],
                        ].map(([label, lang]) => (
                          <button key={lang} onClick={() => handleAIAction("translate", { language: lang })}
                            className="px-2 py-1.5 text-[10px] rounded transition-colors hover:bg-[var(--menu-hover)]"
                            style={{ color: "var(--text-muted)" }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Chat history */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    {aiChatHistory.length === 0 && !aiProcessing && (
                      <div className="text-center py-8">
                        <Sparkles width={24} height={24} className="mx-auto mb-3" style={{ color: "var(--border)", opacity: 0.5 }} />
                        <p className="text-[11px] mb-1" style={{ color: "var(--text-faint)" }}>Ask AI to edit your document</p>
                        <p className="text-[10px]" style={{ color: "var(--text-faint)", opacity: 0.6 }}>e.g. &ldquo;Make the intro shorter&rdquo;</p>
                        <p className="text-[10px]" style={{ color: "var(--text-faint)", opacity: 0.6 }}>&ldquo;Add a conclusion&rdquo;</p>
                        <p className="text-[10px]" style={{ color: "var(--text-faint)", opacity: 0.6 }}>&ldquo;Rewrite in a formal tone&rdquo;</p>
                      </div>
                    )}
                    {aiChatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-lg text-[11px] leading-relaxed ${msg.role === "ai" && msg.text.startsWith("Error") ? "border border-red-500/20" : ""}`}
                          style={{
                            background: msg.role === "user" ? "var(--accent-dim)" : "var(--toggle-bg)",
                            color: msg.role === "user" ? "var(--accent)" : msg.text.startsWith("Error") ? "#f87171" : "var(--text-secondary)",
                          }}>
                          <span>{msg.text}</span>
                          {msg.canUndo && undoStack.current.length > 1 && (
                            <button
                              onClick={() => {
                                undo();
                                setAiChatHistory(prev => prev.map((m, j) => j === i ? { ...m, canUndo: false, text: m.text + " (undone)" } : m));
                              }}
                              className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors hover:opacity-80"
                              style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {aiProcessing && (
                      <div className="flex justify-start">
                        <div className="px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
                          style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>
                          <Loader2 width={10} height={10} className="animate-spin" />
                          {{ polish: "Polishing document...", summary: "Writing summary...", tldr: "Extracting key points...", translate: "Translating...", chat: "Thinking..." }[aiProcessing] || "Processing..."}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Chat input */}
                  <div className="shrink-0 px-2 py-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--toggle-bg)", border: "1px solid var(--border-dim)" }}>
                      <input
                        type="text"
                        value={aiChatInput}
                        onChange={(e) => setAiChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing && aiChatInput.trim() && !aiProcessing) {
                            e.preventDefault();
                            const instruction = aiChatInput.trim();
                            setAiChatHistory(prev => [...prev, { role: "user", text: instruction }]);
                            setAiChatInput("");
                            handleAIAction("chat", { instruction });
                          }
                        }}
                        placeholder="Ask AI to edit..."
                        maxLength={500}
                        disabled={!!aiProcessing}
                        autoFocus
                        className="flex-1 text-[11px] bg-transparent"
                        style={{ color: "var(--text-secondary)", border: "none", outline: "none" }}
                      />
                      <button
                        onClick={() => {
                          if (aiChatInput.trim() && !aiProcessing) {
                            const instruction = aiChatInput.trim();
                            setAiChatHistory(prev => [...prev, { role: "user", text: instruction }]);
                            setAiChatInput("");
                            handleAIAction("chat", { instruction });
                          }
                        }}
                        disabled={!aiChatInput.trim() || !!aiProcessing}
                        className="shrink-0 p-1.5 rounded-md transition-colors"
                        style={{ background: aiChatInput.trim() ? "var(--accent)" : "transparent", color: aiChatInput.trim() ? "#000" : "var(--text-faint)" }}
                        title="Send"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2L2 8.5l5 2L9.5 16z"/><path d="M14 2L7 10.5"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* ─── Outline Panel (side-by-side) ─── */}
              {showOutlinePanel && (
                <div
                  className="flex flex-col shrink-0"
                  style={{ width: "min(260px, 40%)", background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <div className="flex items-center gap-1.5">
                      <List width={12} height={12} style={{ color: "var(--accent)" }} />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>Outline</span>
                    </div>
                    <button onClick={() => setShowOutlinePanel(false)} className="p-0.5 rounded hover:bg-[var(--menu-hover)] transition-colors" title="Close outline">
                      <X width={12} height={12} style={{ color: "var(--text-faint)" }} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2" style={{ fontSize: 12 }}>
                    {(() => {
                      const md = markdown || "";
                      const headings = md.split("\n")
                        .map((line, idx) => {
                          const match = line.match(/^(#{1,6})\s+(.+)$/);
                          if (!match) return null;
                          return { level: match[1].length, text: match[2].replace(/[*_`\[\]]/g, ""), line: idx };
                        })
                        .filter(Boolean) as { level: number; text: string; line: number }[];

                      if (headings.length === 0) {
                        return <p className="px-3 py-4 text-center" style={{ color: "var(--text-faint)", fontSize: 11 }}>No headings found. Add # headings to see the document structure.</p>;
                      }

                      const minLevel = Math.min(...headings.map(h => h.level));

                      return headings.map((h, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            // Scroll to heading in preview
                            const allHeadings = previewRef.current?.querySelectorAll("h1, h2, h3, h4, h5, h6");
                            if (allHeadings) {
                              // Find matching heading by text content
                              for (const el of allHeadings) {
                                if (el.textContent?.trim() === h.text.trim()) {
                                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                                  // Brief highlight
                                  (el as HTMLElement).style.background = "rgba(251,146,60,0.15)";
                                  setTimeout(() => { (el as HTMLElement).style.background = ""; }, 1500);
                                  break;
                                }
                              }
                            }
                          }}
                          className="w-full text-left px-3 py-1 transition-colors hover:bg-[var(--menu-hover)] truncate"
                          style={{
                            paddingLeft: 12 + (h.level - minLevel) * 16,
                            color: h.level <= 2 ? "var(--text-primary)" : "var(--text-muted)",
                            fontWeight: h.level === 1 ? 700 : h.level === 2 ? 600 : 400,
                            fontSize: h.level === 1 ? 13 : h.level === 2 ? 12 : 11,
                          }}
                          title={h.text}
                        >
                          {h.text}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
              {/* ─── Images Panel (side-by-side) ─── */}
              {showImagePanel && isAuthenticated && (
                <div className="flex flex-col shrink-0" style={{ width: "min(300px, 50%)", background: "var(--surface)", borderLeft: "1px solid var(--border)" }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <div className="flex items-center gap-1.5">
                      <ImageIcon width={12} height={12} style={{ color: "var(--accent)" }} />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>My Images</span>
                      {userImages.length > 0 && <span className="text-[9px] px-1 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{userImages.length}</span>}
                    </div>
                    <button onClick={() => setShowImagePanel(false)} className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }} title="Close image panel">
                      <X width={10} height={10} />
                    </button>
                  </div>
                  {/* Quota bar */}
                  {imageQuota && (
                    <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <div className="flex items-center justify-between text-[9px] mb-1" style={{ color: "var(--text-faint)" }}>
                        <span>{Math.round(imageQuota.used / 1024 / 1024)}MB used</span>
                        <span>{Math.round(imageQuota.total / 1024 / 1024)}MB total</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--toggle-bg)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (imageQuota.used / imageQuota.total) * 100)}%`, background: imageQuota.used / imageQuota.total > 0.9 ? "#ef4444" : "var(--accent)" }} />
                      </div>
                    </div>
                  )}
                  {/* Image grid */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {imagesLoading ? (
                      <div className="text-center py-8">
                        <Loader2 width={16} height={16} className="mx-auto animate-spin" style={{ color: "var(--text-faint)" }} />
                        <p className="text-[10px] mt-2" style={{ color: "var(--text-faint)" }}>Loading images...</p>
                      </div>
                    ) : userImages.length === 0 ? (
                      <div className="text-center py-8">
                        <ImageIcon width={24} height={24} className="mx-auto mb-2" style={{ color: "var(--border)", opacity: 0.5 }} />
                        <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>No images yet</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)", opacity: 0.6 }}>Paste or drag images into your document</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {userImages.map((img, idx) => (
                          <div key={img.name} className="group relative rounded-md overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
                            {/* Top bar: name */}
                            <div className="flex items-center px-1.5 py-1" style={{ background: "var(--toggle-bg)" }}>
                              <span className="text-[8px] truncate" style={{ color: "var(--text-muted)" }}>{img.name}</span>
                            </div>
                            {/* Image — click to preview in lightbox */}
                            <div className="cursor-pointer" onClick={() => setLightboxImage(img.url)}>
                              <img src={img.url} alt={img.name} loading="lazy" className="w-full object-contain" style={{ background: "var(--background)", maxHeight: 120 }} />
                            </div>
                            {/* Bottom bar: Insert + Copy */}
                            <div className="flex items-center gap-1 px-1.5 py-1" style={{ background: "var(--toggle-bg)" }}>
                              <button onClick={() => {
                                const imgMd = `\n![${img.name.replace(/\.\w+$/, "")}](${img.url})\n`;
                                const current = markdownRef.current;
                                // Use saved cursor position (persists after focus leaves editor)
                                const pos = lastCursorPosRef.current || cmGetCursorPos();
                                const insertAt = pos > 0 && pos <= current.length ? pos : current.length;
                                const newMd = current.slice(0, insertAt) + imgMd + current.slice(insertAt);
                                setMarkdown(newMd);
                                doRender(newMd);
                                cmSetDocRef.current?.(newMd);
                                showToast("Image inserted", "success");
                              }} className="flex-1 py-1 rounded text-[9px] font-semibold transition-colors hover:opacity-90" style={{ background: "var(--accent)", color: "#000" }} title="Insert image into document">
                                Insert
                              </button>
                              <button onClick={() => { navigator.clipboard.writeText(img.url); showToast("URL copied", "success"); }}
                                className="px-2 py-1 rounded text-[9px] transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }} title="Copy URL">
                                <Copy width={12} height={12} />
                              </button>
                              <button onClick={async () => {
                                if (!confirm("Delete this image?")) return;
                                try {
                                  const res = await fetch(`/api/upload/delete?name=${encodeURIComponent(img.name)}`, { method: "DELETE", headers: authHeaders });
                                  if (res.ok) {
                                    setUserImages(prev => prev.filter(i => i.name !== img.name));
                                    const data = await res.json();
                                    if (data.quota) setImageQuota(data.quota);
                                    showToast("Image deleted", "success");
                                  } else { showToast("Failed to delete", "error"); }
                                } catch { showToast("Failed to delete", "error"); }
                              }} className="px-2 py-1 rounded text-[9px] transition-colors hover:bg-[rgba(239,68,68,0.1)]" style={{ color: "var(--text-faint)" }} title="Delete">
                                <Trash2 width={12} height={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* ─── Version History Panel (side-by-side) ─── */}
              {showHistory && docId && (
                <div
                  className="flex flex-col shrink-0"
                  style={{
                    width: "min(320px, 50%)",
                    background: "var(--surface)",
                    borderLeft: "1px solid var(--border)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* History header */}
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <div className="flex items-center gap-1.5">
                      <Clock width={12} height={12} style={{ color: "var(--accent)" }} />
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
                      <X width={10} height={10} />
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
                        <Clock width={24} height={24} strokeWidth={1} style={{ color: "var(--text-faint)", marginBottom: 8 }} />
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
                                    <RotateCcw width={10} height={10} />
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
          </>)}
          </div>
        )}

        {/* Resize handle */}
        {viewMode === "split" && (
          <div
            data-print-hide
            className={`shrink-0 ${isMobile ? "cursor-row-resize h-[6px] w-full" : "cursor-col-resize w-[6px]"}`}
            style={{ background: "var(--border-dim)", position: "relative", zIndex: 5 }}
            onMouseDown={(e) => { e.preventDefault(); isDraggingSplit.current = true; }}
            onTouchStart={() => { isDraggingSplit.current = true; }}
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
          className="flex-1 flex flex-col min-h-0"
          style={{ display: viewMode === "preview" ? "none" : undefined, minWidth: viewMode === "split" && !isMobile ? 280 : undefined, overflow: viewMode === "split" && isMobile ? "hidden" : undefined }}
        >
            <div
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 text-[11px] font-mono uppercase tracking-normal select-none"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)", cursor: "default" }}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="shrink-0" style={{ color: "var(--accent)" }}>SOURCE</span>
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
                    className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                    style={{ background: narrowSource ? "var(--accent-dim)" : "transparent", color: narrowSource ? "var(--accent)" : "var(--text-faint)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 2v12M12 2v12M1 8h3M12 8h3" strokeLinecap="round"/><path d="M6 6.5L8 8l-2 1.5M10 6.5L8 8l2 1.5" strokeLinecap="round"/></svg>
                  </button>
                  <div className="absolute top-full right-0 mt-1.5 w-44 p-2.5 rounded-lg text-[10px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    <p style={{ color: narrowSource ? "var(--accent)" : "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>Narrow View {narrowSource ? "ON" : "OFF"}</p>
                    <p>Limit content width for comfortable editing.</p>
                  </div>
                </div>
                {/* Copy MD */}
                <div className="relative group">
                  <button
                    onClick={() => { navigator.clipboard.writeText(markdownRef.current); }}
                    className="flex items-center justify-center h-6 px-2 rounded-md transition-colors"
                    style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
                  >
                    <Copy width={11} height={11} />
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
                    <Download width={11} height={11} />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>Download as .md file</div>
                </div>
              </div>
            </div>
            <div
              className="flex-1 min-h-0"
              style={narrowSource ? { paddingLeft: "max(0px, calc(50% - 384px))", paddingRight: "max(0px, calc(50% - 384px))" } : undefined}
            >
              <div
                ref={editorContainerRef}
                className="h-full"
              />
            </div>
          </div>
        </>)}
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
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative group"
            onClick={(e) => {
              // Mobile: toggle help tooltip on tap (hover doesn't work on touch)
              const tooltip = (e.currentTarget.querySelector("[data-help-tooltip]") as HTMLElement);
              if (!tooltip) return;
              const showing = tooltip.style.opacity === "1";
              tooltip.style.opacity = showing ? "0" : "1";
              tooltip.style.pointerEvents = showing ? "none" : "auto";
              if (!showing) {
                const dismiss = (ev: MouseEvent) => { if (!tooltip.contains(ev.target as Node)) { tooltip.style.opacity = "0"; tooltip.style.pointerEvents = "none"; document.removeEventListener("click", dismiss); } };
                requestAnimationFrame(() => document.addEventListener("click", dismiss));
              }
            }}
          >
            <button className="transition-colors" style={{ color: "var(--text-muted)" }} title="Keyboard shortcuts and help">Help</button>
            <div data-help-tooltip className="absolute bottom-full left-0 mb-1 w-72 max-w-[90vw] p-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[9998]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
              <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Keyboard Shortcuts</p>
              <div className="space-y-1 text-[10px]">
                {[
                  [`${mod}+B`, "Bold"],
                  [`${mod}+I`, "Italic"],
                  [`${mod}+K`, "Insert link"],
                  [`${mod}+S`, "Share / copy URL"],
                  [`${mod}+Shift+C`, "Copy as HTML"],
                  [`${mod}+Z`, "Undo"],
                  [`${mod}+Shift+Z`, "Redo"],
                  [`${mod}+\\`, "Toggle view mode"],
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
          <button onClick={() => { setShowCommandPalette(true); setCmdSearch(""); }} className="transition-colors hidden sm:inline-flex items-center gap-1" style={{ color: "var(--text-faint)", background: "none", border: "1px solid var(--border-dim)", borderRadius: 4, padding: "1px 6px", fontSize: 10, cursor: "pointer" }} title="Command palette">
            <span style={{ fontSize: 10 }}>{navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl+"}K</span>
          </button>
          <a href="/about" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="About mdfy.cc">About</a>
          <a href="/plugins" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="Browser and editor plugins">Plugins</a>
          <a href="/discover" className="transition-colors" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="Trending public documents">Trending</a>
          <a href="/docs" className="transition-colors hidden sm:inline" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="API documentation">API</a>
          <a href="https://marketplace.visualstudio.com/items?itemName=raymindai.mdfy-vscode" className="transition-colors hidden lg:inline" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="mdfy VS Code extension">VS Code</a>
          <a href="https://chrome.google.com/webstore" className="transition-colors hidden lg:inline" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="mdfy Chrome extension">Chrome</a>
          <a href="/privacy" className="transition-colors hidden sm:inline" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="Privacy policy">Privacy</a>
          <a href="/terms" className="transition-colors hidden sm:inline" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="Terms of service">Terms</a>
          <a href="https://github.com/raymindai/mdcore" className="transition-colors hidden md:inline" style={{ color: "var(--text-muted)" }} target="_blank" rel="noopener noreferrer" title="mdcore on GitHub">GitHub</a>
        </div>
        {/* Right: stats + engine badges — tap to expand on mobile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Desktop: always visible */}
          <span className="hidden sm:inline">{wordCount.toLocaleString()} words</span>
          <span className="hidden sm:inline">{charCount.toLocaleString()} chars</span>
          <span className="hidden sm:inline">{lineCount.toLocaleString()} lines</span>
          {/* Mobile: compact tap-to-expand */}
          <button
            className="sm:hidden flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
            title="Document statistics"
            onClick={(e) => {
              const el = e.currentTarget.nextElementSibling as HTMLElement;
              if (!el) return;
              const showing = el.style.display === "flex";
              el.style.display = showing ? "none" : "flex";
              if (!showing) {
                const dismiss = () => { el.style.display = "none"; document.removeEventListener("click", dismiss); };
                requestAnimationFrame(() => document.addEventListener("click", dismiss));
              }
            }}
          >
            <AlignLeft width={10} height={10} />
            {wordCount.toLocaleString()}w
          </button>
          <div className="sm:hidden flex items-center gap-2 absolute bottom-full right-3 mb-1 px-3 py-1.5 rounded-lg" style={{ display: "none", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
            <span>{wordCount.toLocaleString()} words</span>
            <span>{charCount.toLocaleString()} chars</span>
            <span>{lineCount.toLocaleString()} lines</span>
          </div>
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
              <Zap width={10} height={10} fill="currentColor" stroke="none" />
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
            left: Math.min(docContextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180),
            top: Math.min(docContextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 200),
            zIndex: 9999,
            background: "var(--menu-bg)",
            border: "1px solid var(--border)",
            width: 160,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {(() => {
            const isExample = tabs.find(t => t.id === docContextMenu.tabId)?.ownerEmail === EXAMPLE_OWNER;
            const targetTab = tabs.find(t => t.id === docContextMenu.tabId);
            const isSharedWithMe = targetTab?.permission === "readonly" || targetTab?.permission === "editable";
            return isExample ? [
              { label: "Download .md", action: () => {
                if (targetTab) {
                  const blob = new Blob([targetTab.markdown], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${targetTab.title || "document"}.md`; a.click();
                  URL.revokeObjectURL(url);
                }
              }},
              { label: "Hide example", action: () => {
                setHiddenExampleIds(prev => new Set([...prev, docContextMenu.tabId]));
                if (docContextMenu.tabId === activeTabId) {
                  const remaining = tabs.filter(t => !t.deleted && t.id !== docContextMenu.tabId && !hiddenExampleIds.has(t.id));
                  if (remaining.length) switchTab(remaining[0].id);
                }
              }},
            ] : isSharedWithMe ? [
              { label: "Duplicate", action: () => {
                if (targetTab) {
                  const id = `tab-${tabIdCounter++}`;
                  const t = targetTab.title + " (copy)";
                  setTabs(prev => [...prev, { id, title: t, markdown: targetTab.markdown, permission: "mine", shared: false, isDraft: true }]);
                  autoSave.createDocument({ markdown: targetTab.markdown, title: t, userId: user?.id, anonymousId: !user?.id ? ensureAnonymousId() : undefined }).then(result => {
                    if (result) setTabs(prev => prev.map(x => x.id === id ? { ...x, cloudId: result.id, editToken: result.editToken } : x));
                  });
                }
              }},
              { label: "Download .md", action: () => {
                if (targetTab) {
                  const blob = new Blob([targetTab.markdown], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${targetTab.title || "document"}.md`; a.click();
                  URL.revokeObjectURL(url);
                }
              }},
              { label: "Remove from list", action: () => {
                setTabs(prev => prev.filter(t => t.id !== docContextMenu.tabId));
                if (docContextMenu.tabId === activeTabId) {
                  const remaining = tabs.filter(t => !t.deleted && t.id !== docContextMenu.tabId);
                  if (remaining.length) switchTab(remaining[0].id);
                }
              }, danger: true },
            ] : [
              { label: "Rename", action: () => {
                const tab = tabs.find(t => t.id === docContextMenu.tabId);
                if (!tab) return;
                setInlineInput({
                  label: "Document name",
                  defaultValue: tab.title,
                  onSubmit: (trimmed) => {
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: trimmed } : t));
                    if (tab.id === activeTabIdRef.current) {
                      const md = markdownRef.current;
                      const lines = md.split("\n");
                      const h1Idx = lines.findIndex(l => /^#\s+/.test(l));
                      if (h1Idx >= 0) { lines[h1Idx] = `# ${trimmed}`; }
                      else { lines.unshift(`# ${trimmed}`, ""); }
                      const newMd = lines.join("\n");
                      setMarkdown(newMd);
                      doRender(newMd);
                      cmSetDocRef.current?.(newMd);
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
                      setTabs(prev => {
                        const withoutDup = prev.filter(x => !(x.cloudId === result.id && x.id !== id));
                        return withoutDup.map(x => x.id === id ? { ...x, cloudId: result.id, editToken: result.editToken } : x);
                      });
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
              ...(() => {
                const tab = tabs.find(t => t.id === docContextMenu.tabId);
                if (!tab?.cloudId || !tab.source) return [];
                return [{ label: "Unsync", action: async () => {
                  try {
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (tab.editToken) headers["x-edit-token"] = tab.editToken;
                    if (user?.id) headers["x-user-id"] = user.id;
                    await fetch(`/api/docs/${tab.cloudId}`, {
                      method: "PATCH",
                      headers,
                      body: JSON.stringify({ action: "clear-source", editToken: tab.editToken }),
                    });
                    setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, source: undefined } : t));
                  } catch {}
                }}];
              })(),
              ...(folders.filter(f => !f.section || f.section === "my").length > 0 || tabs.find(t => t.id === docContextMenu.tabId)?.folderId ? [
                { label: "---", action: () => {} },
                { label: "Move to", action: () => {}, submenu: [
                  ...folders.filter(f => !f.section || f.section === "my").map(f => ({
                    label: f.name,
                    action: () => setTabs(prev => prev.map(t => t.id === docContextMenu.tabId ? { ...t, folderId: f.id } : t)),
                  })),
                  ...(tabs.find(t => t.id === docContextMenu.tabId)?.folderId ? [{
                    label: "Root (no folder)",
                    action: () => setTabs(prev => prev.map(t => t.id === docContextMenu.tabId ? { ...t, folderId: undefined } : t)),
                  }] : []),
                ]},
              ] : []),
              ...(tabs.filter(t => !t.deleted).length > 1 ? [
                { label: "---", action: () => {} },
                { label: "Move to Trash", action: () => {
                  const trashTab = tabs.find(t => t.id === docContextMenu.tabId);
                  if (trashTab) softDeleteOnServer(trashTab);
                  setTabs(prev => prev.map(t => t.id === docContextMenu.tabId ? { ...t, deleted: true, deletedAt: Date.now() } : t));
                  if (docContextMenu.tabId === activeTabId) {
                    const remaining = tabs.filter(t => !t.deleted && t.id !== docContextMenu.tabId);
                    if (remaining.length) switchTab(remaining[0].id);
                  }
                }, danger: true },
              ] : []),
            ];
          })().map((item, i) => {
            const it = item as { label: string; action: () => void; danger?: boolean; submenu?: { label: string; action: () => void }[] };
            if (it.label === "---") {
              return <div key={`sep-${i}`} className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />;
            }
            if (it.submenu) {
              return (
                <div key={it.label} className="relative group/sub">
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)] flex items-center justify-between"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {it.label}
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4"/></svg>
                  </button>
                  <div
                    className="absolute top-0 ml-1 min-w-[140px] rounded-lg shadow-xl py-1 opacity-0 pointer-events-none group-hover/sub:opacity-100 group-hover/sub:pointer-events-auto transition-opacity z-[10001]"
                    style={{ left: "100%", background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", ...(docContextMenu && docContextMenu.x > window.innerWidth - 400 ? { left: "auto", right: "100%", marginLeft: 0, marginRight: 4 } : {}) }}
                    ref={(el) => { if (el) { const r = el.getBoundingClientRect(); if (r.right > window.innerWidth) { el.style.left = "auto"; el.style.right = "100%"; el.style.marginLeft = "0"; el.style.marginRight = "4px"; } } }}
                  >
                    {it.submenu.map(sub => (
                      <button
                        key={sub.label}
                        onClick={() => { sub.action(); setDocContextMenu(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <button
                key={it.label}
                onClick={() => { it.action(); setDocContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: it.danger ? "#ef4444" : "var(--text-secondary)" }}
              >
                {it.label}
              </button>
            );
          })}
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
                {/* Beta tier — everyone with an account, while we're testing */}
                <div className="rounded-lg p-3" style={{ border: "1px solid var(--accent-dim)" }}>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>Beta</span>
                    <span className="text-[8px] px-1 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>FREE NOW</span>
                  </div>
                  <ul className="space-y-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Unlimited documents</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Documents never expire</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Cloud sync</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Short URL sharing</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>AI mdfy structuring</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>All formats supported</li>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--text-faint)" }}>-</span><span style={{ color: "var(--text-faint)" }}>mdfy.cc badge</span></li>
                  </ul>
                </div>
                {/* Pro tier — kicks in after beta */}
                <div className="rounded-lg p-3" style={{ border: "1px solid var(--accent)" }}>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>Pro</span>
                    <span className="text-[8px] px-1 py-0.5 rounded-full font-medium" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>AFTER BETA</span>
                  </div>
                  <ul className="space-y-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    <li className="flex items-start gap-1"><span style={{ color: "var(--accent)" }}>+</span>Everything in Beta</li>
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
                Free during beta. No credit card required.
              </p>
            </div>
          </div>
        </div>
      )}

      {mdfyPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => !mdfyLoading && setMdfyPrompt(null)}>
          <div className="rounded-xl p-5 w-80" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}><span style={{ color: "var(--accent)" }}>mdfy</span> this document?</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                {(mdfyPrompt.text.length / 1024).toFixed(0)} KB
              </span>
            </div>
            <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
              This file was imported as raw text — all formatting (headings, lists, tables, emphasis) was lost during extraction.
            </p>
            <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--accent)" }}>mdfy</strong> uses AI to detect the original structure and rebuild it as clean Markdown — headings, bullet points, tables, code blocks, and more.
              {mdfyPrompt.text.length > 200_000 && (
                <span style={{ color: "var(--text-faint)" }}> Large documents may take 30–60 seconds.</span>
              )}
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
                    const result = await mdfyText(mdfyPrompt.text, mdfyPrompt.filename);
                    // Update the tab with structured markdown
                    setTabs(prev => prev.map(t => t.id === mdfyPrompt.tabId ? { ...t, markdown: result.markdown } : t));
                    if (mdfyPrompt.tabId === activeTabId) {
                      setMarkdown(result.markdown);
                      doRender(result.markdown);
                      cmSetDocRef.current?.(result.markdown);
                    }
                    if (result.truncated) {
                      showToast("Document was very large — only the first 3 MB was processed", "info");
                    } else if (result.finishReason === "MAX_TOKENS") {
                      showToast("AI hit its output limit — the result may be incomplete", "info");
                    } else {
                      showToast("Document structured successfully", "success");
                    }
                  } catch (err) {
                    console.error("mdfy failed:", err);
                    const message = err instanceof Error ? err.message : "AI processing failed";
                    showToast(message, "error");
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
                    Processing{mdfyElapsed > 0 ? ` ${mdfyElapsed}s` : "..."}
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
          <div className="fixed rounded-lg shadow-xl py-1" style={{ left: Math.min(sidebarContextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200), top: Math.min(sidebarContextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 300), zIndex: 9999, background: "var(--menu-bg)", border: "1px solid var(--border)", width: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <button onClick={() => { addTab(); setSidebarContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>New Document</button>
            <button onClick={() => {
              const id = `folder-${Date.now()}`;
              setFolders(prev => [...prev, { id, name: "New Folder", collapsed: false }]);
              fetch("/api/user/folders", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id, name: "New Folder", section: "my" }) }).catch(() => {});
              setInlineInput({ label: "Folder name", defaultValue: "New Folder", onSubmit: (name) => { setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f)); fetch("/api/user/folders", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id, name }) }).catch(() => {}); setInlineInput(null); }});
              setSidebarContextMenu(null);
            }} className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-secondary)" }}>New Folder</button>
            <div className="my-1" style={{ borderTop: "1px solid var(--border-dim)" }} />
            <button onClick={() => {
              const _t = Date.now();
              const existingExampleIds = new Set(tabs.filter(tab => tab.ownerEmail === EXAMPLE_OWNER).map(tab => tab.id));
              // Only restore examples that were deleted — never create duplicates
              const missingExamples = EXAMPLE_TABS.filter(ex => !existingExampleIds.has(ex.id));
              if (missingExamples.length > 0) {
                setTabs(prev => [...prev, ...missingExamples]);
              }
              // Un-delete soft-deleted examples and clear any stale folderId
              setTabs(prev => prev.map(t => t.ownerEmail === EXAMPLE_OWNER ? { ...t, deleted: false, folderId: undefined } : t));
              // Unhide all hidden examples and expand the section
              setHiddenExampleIds(new Set());
              setShowExamples(true);
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
              left: Math.min(folderContextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200),
              top: Math.min(folderContextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 300),
              zIndex: 9999,
              background: "var(--menu-bg)",
              border: "1px solid var(--border)",
              width: 160,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {[
              ...(folderContextMenu.folderId !== EXAMPLES_FOLDER_ID ? [{ label: "Rename", action: () => {
                const folder = folders.find(f => f.id === folderContextMenu.folderId);
                if (!folder) return;
                setInlineInput({ label: "Folder name", defaultValue: folder.name, onSubmit: (name) => {
                  setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name } : f));
                  fetch("/api/user/folders", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id: folder.id, name }) }).catch(() => {});
                  setInlineInput(null);
                }});
              }}] : []),
              { label: "Collapse / Expand", action: () => {
                setFolders(prev => prev.map(f => f.id === folderContextMenu.folderId ? { ...f, collapsed: !f.collapsed } : f));
                fetch("/api/user/folders", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id: folderContextMenu.folderId, collapsed: !folders.find(f => f.id === folderContextMenu.folderId)?.collapsed }) }).catch(() => {});
              }},
              ...(folderContextMenu.folderId !== EXAMPLES_FOLDER_ID ? [{ label: "Delete folder", action: () => {
                setFolderContextMenu(prev => prev ? { ...prev, confirmDelete: true } : null);
              }, danger: true, noClose: true }] : []),
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
                    fetch("/api/user/folders", { method: "DELETE", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ id: folderContextMenu.folderId }) }).catch(() => {});
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
          docId={(docId || tabs.find(t => t.id === activeTabIdRef.current)?.cloudId)!}
          title={title}
          userId={user.id}
          ownerEmail={user.email || ""}
          ownerName={profile?.display_name || undefined}
          currentEditMode={docEditMode}
          initialAllowedEmails={allowedEmails}
          initialAllowedEditors={allowedEditors}
          onClose={() => {
            setShowShareModal(false);
            const curTabId = activeTabIdRef.current;
            const ct = tabs.find(t => t.id === curTabId);
            if (ct?.cloudId) {
              const closeOthers = allowedEmails.filter(e => e.toLowerCase() !== (user?.email || "").toLowerCase());
              setTabs(prev => prev.map(t => {
                if (t.id !== curTabId) return t;
                return {
                  ...t,
                  isDraft: false,
                  isSharedByMe: true,
                  isRestricted: closeOthers.length > 0,
                  editMode: docEditMode,
                  sharedWithCount: closeOthers.length,
                };
              }));
            }
          }}
          onEditModeChange={(mode) => {
            setDocEditMode(mode); setEditMode(mode);
            // Publish (isDraft → false) when user explicitly changes sharing settings
            const curTabId = activeTabIdRef.current;
            const isShared = mode !== "owner";
            setTabs(prev => prev.map(t => t.id === curTabId ? { ...t, isDraft: false, isSharedByMe: isShared, editMode: mode } : t));
            const cid = docId || tabs.find(t => t.id === curTabId)?.cloudId;
            if (cid && user) {
              fetch(`/api/docs/${cid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", userId: user.id }) }).catch(() => {});
            }
          }}
          onAllowedEmailsChange={(emails) => {
            setAllowedEmailsState(emails);
            // Publish + update tab state when sharing with specific people
            const curTabId = activeTabIdRef.current;
            const othersEmails = emails.filter(e => e.toLowerCase() !== (user?.email || "").toLowerCase());
            setTabs(prev => prev.map(t => t.id === curTabId ? { ...t, isDraft: false, isRestricted: othersEmails.length > 0, sharedWithCount: othersEmails.length } : t));
            const cid = docId || tabs.find(t => t.id === curTabId)?.cloudId;
            if (cid && user) {
              fetch(`/api/docs/${cid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", userId: user.id }) }).catch(() => {});
            }
          }}
          onAllowedEditorsChange={(editors) => {
            setAllowedEditorsState(editors);
          }}
          onMakePrivate={async () => {
            const cid = docId || tabs.find(t => t.id === activeTabIdRef.current)?.cloudId;
            if (!cid || !user) return;
            try {
              const res = await fetch(`/api/docs/${cid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unpublish", userId: user.id }),
              });
              if (!res.ok) { showToast("Failed to make private", "error"); return; }
              const curTabId = activeTabIdRef.current;
              setTabs(prev => prev.map(t => t.id === curTabId ? {
                ...t,
                isDraft: true,
                isSharedByMe: false,
                isRestricted: false,
                editMode: "owner",
                sharedWithCount: 0,
              } : t));
              setAllowedEmailsState([]);
              setAllowedEditorsState([]);
              setDocEditMode("owner");
              setEditMode("owner");
              setShowShareModal(false);
              showToast("Document is now private", "info");
            } catch { showToast("Failed to make private", "error"); }
          }}
        />
      )}

      {/* Conflict Modal — when auto-save detects 409 */}
      {showConflictModal && autoSave.conflict && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setShowConflictModal(false); autoSave.dismissConflict(); }}
        >
          <div
            className="w-full max-w-lg rounded-xl shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert width={18} height={18} style={{ color: "#f59e0b" }} />
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Document Conflict
                </h2>
              </div>
              <button
                onClick={() => { setShowConflictModal(false); autoSave.dismissConflict(); }}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                style={{ color: "var(--text-muted)" }}
              >
                <X width={14} height={14} />
              </button>
            </div>
            <div className="px-5 pb-3">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                This document was modified by someone else while you were editing.
                Your changes could not be saved automatically.
              </p>
              {autoSave.conflict.serverUpdatedAt && (
                <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                  Server version saved at: {new Date(autoSave.conflict.serverUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => {
                  // Keep mine: force push without conflict check
                  const currentTab = tabs.find(t => t.id === activeTabIdRef.current);
                  if (currentTab?.cloudId) {
                    autoSave.forceSave({
                      cloudId: currentTab.cloudId,
                      markdown: markdownRef.current,
                      title: currentTab.title,
                      userId: user?.id,
                      userEmail: user?.email,
                      anonymousId,
                      editToken: currentTab.editToken,
                    });
                  }
                  setShowConflictModal(false);
                  showToast("Your version saved", "info");
                }}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                Keep mine
              </button>
              <button
                onClick={async () => {
                  // Keep theirs: pull server version
                  if (autoSave.conflict) {
                    setMarkdownRaw(autoSave.conflict.serverMarkdown);
                    doRender(autoSave.conflict.serverMarkdown);
                    autoSave.setLastServerUpdatedAt(autoSave.conflict.serverUpdatedAt);
                    autoSave.dismissConflict();
                    setShowConflictModal(false);
                    showToast("Server version loaded", "info");
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--toggle-bg)", color: "var(--text-secondary)" }}
              >
                Keep theirs
              </button>
              <button
                onClick={() => {
                  // View diff: show both versions side by side
                  if (autoSave.conflict) {
                    const serverMd = autoSave.conflict.serverMarkdown;
                    const localMd = markdownRef.current;
                    // Open a new tab with a diff-like view
                    const diffContent = `# Conflict Comparison\n\n---\n\n## Your Version (Local)\n\n${localMd}\n\n---\n\n## Server Version\n\n${serverMd}`;
                    const newId = String(++tabIdCounter);
                    setTabs(prev => [...prev, { id: newId, title: "Conflict Diff", markdown: diffContent, readonly: true }]);
                    setActiveTabId(newId);
                    setShowConflictModal(false);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              >
                View diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Share Modal — for non-owners */}
      {showViewerShareModal && docId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowViewerShareModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Share{title ? ` "${truncateTitle(title, 30)}"` : ""}
              </h2>
              <button
                onClick={() => setShowViewerShareModal(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                style={{ color: "var(--text-muted)" }}
              >
                <X width={14} height={14} />
              </button>
            </div>

            {/* Owner info */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--background)", border: "1px solid var(--border-dim)" }}>
                <img src={dicebearUrl(tabs.find(t => t.id === activeTabId)?.ownerEmail || "owner", 32)} alt="" className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {tabs.find(t => t.id === activeTabId)?.ownerEmail || "Document owner"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Owner</p>
                </div>
              </div>
            </div>

            {/* Your access */}
            <div className="px-5 pb-4">
              <label className="text-[11px] font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Your access</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--background)", border: "1px solid var(--border-dim)" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-faint)" strokeWidth="1.3" strokeLinecap="round">
                  <rect x="4" y="8" width="8" height="6" rx="1.5"/><path d="M6 8V5.5a2 2 0 114 0V8"/>
                </svg>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  View only
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              {/* Duplicate to edit — only if readonly */}
              {!canEdit && (
                <button
                  onClick={() => {
                    const id = `tab-${Date.now()}`;
                    const origMd = markdownRef.current;
                    const t = title ? `${title} (copy)` : "Untitled (copy)";
                    const md = origMd.replace(/^(#\s+.+)$/m, `# ${t}`);
                    const newTab: Tab = { id, title: t, markdown: md, permission: "mine", shared: false, isDraft: true };
                    setTabs(prev => [...prev, newTab]);
                    setIsSharedDoc(false);
                    setIsOwner(true);
                    setDocEditMode("owner");
                    loadTab(newTab);
                    autoSave.createDocument({
                      markdown: md, title: t, userId: user?.id,
                      anonymousId: !user?.id ? ensureAnonymousId() : undefined,
                    }).then(result => {
                      if (result) {
                        setTabs(prev => {
                          const withoutDup = prev.filter(tab => !(tab.cloudId === result.id && tab.id !== id));
                          return withoutDup.map(tab => tab.id === id ? { ...tab, cloudId: result.id, editToken: result.editToken } : tab);
                        });
                        setDocId(result.id);
                        window.history.replaceState(null, "", `/?doc=${result.id}`);
                      }
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}
                >
                  <Copy width={12} height={12} />
                  Duplicate to edit
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/${docId}`;
                  await copyToClipboard(url);
                  showToast("Link copied!", "success");
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 10l4-4"/><path d="M8.5 3.5L10 2a2 2 0 012.83 2.83L11.5 6.17"/><path d="M4.5 9.83L3.17 11.17A2 2 0 006 14l1.5-1.5"/>
                </svg>
                Copy link
              </button>
              <button
                onClick={() => setShowViewerShareModal(false)}
                className="px-5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer />

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
                if (!mermaidIsNewRef.current && canvasMermaid) {
                  // Editing existing diagram — find and replace in-place
                  const originalBlock = "```mermaid\n" + canvasMermaid + "\n```";
                  const sourceIdx = mermaidSourceIndexRef.current;
                  if (sourceIdx >= 0 && sourceIdx < markdown.length && markdown.slice(sourceIdx, sourceIdx + originalBlock.length) === originalBlock) {
                    // Replace at exact saved position (handles duplicate mermaid blocks)
                    newMarkdown = markdown.slice(0, sourceIdx) + md + markdown.slice(sourceIdx + originalBlock.length);
                  } else if (markdown.includes(originalBlock)) {
                    // Fallback: replace first occurrence
                    newMarkdown = markdown.replace(originalBlock, md);
                  } else {
                    // Fuzzy match: find block containing first content line
                    const mermaidBlockRegex = /```mermaid\n[\s\S]*?```/g;
                    const blocks = [...markdown.matchAll(mermaidBlockRegex)];
                    const firstContentLine = canvasMermaid.split("\n")[0]?.trim();
                    const match = blocks.find(b => firstContentLine && b[0].includes(firstContentLine));
                    if (match && match.index !== undefined) {
                      newMarkdown = markdown.slice(0, match.index) + md + markdown.slice(match.index + match[0].length);
                    } else {
                      newMarkdown = insertBlockAtCursor(md);
                    }
                  }
                } else {
                  // New diagram — insert at saved cursor position
                  newMarkdown = insertBlockAtCursor(md);
                }
                mermaidIsNewRef.current = false;
                mermaidSourceIndexRef.current = -1;
                setMarkdown(newMarkdown);
                cmSetDoc(newMarkdown);
                doRender(newMarkdown);
                setCanvasMermaid(undefined);
                setShowMermaidModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTemplatePicker(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowTemplatePicker(false); }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
              width: "min(480px, 92vw)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--border-dim)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>New Document</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>Choose a template to get started</p>
            </div>
            <div style={{ padding: "12px 16px 16px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {DOCUMENT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => {
                    setShowTemplatePicker(false);
                    addTabWithContent(tmpl.markdown);
                  }}
                  className="text-left transition-colors"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-dim)",
                    background: "var(--surface)",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.background = "var(--accent-dim)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-dim)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "var(--surface)";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d={tmpl.icon}/>
                  </svg>
                  {tmpl.name}
                </button>
              ))}
            </div>
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
                let newMarkdown = insertBlockAtCursor(md); // default: insert at cursor
                const orig = mathOriginalRef.current;
                const sourceIdx = mathSourceIndexRef.current;
                if (orig && sourceIdx >= 0 && sourceIdx < markdown.length && markdown.slice(sourceIdx, sourceIdx + orig.length) === orig) {
                  // Replace at exact saved position (handles duplicate math blocks)
                  newMarkdown = markdown.slice(0, sourceIdx) + md + markdown.slice(sourceIdx + orig.length);
                } else if (orig && markdown.includes(orig)) {
                  // Fallback: replace first occurrence
                  newMarkdown = markdown.replace(orig, md);
                } else if (orig) {
                  // Try fuzzy match: find math block containing the same TeX source
                  const origTex = orig.replace(/^\$+\s*|\s*\$+$/g, "").trim();
                  if (origTex) {
                    const mathRegex = /\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g;
                    const matches = [...markdown.matchAll(mathRegex)];
                    const best = matches.find(m => {
                      const mTex = m[0].replace(/^\$+\s*|\s*\$+$/g, "").trim();
                      return mTex === origTex;
                    });
                    if (best && best.index !== undefined) {
                      newMarkdown = markdown.slice(0, best.index) + md + markdown.slice(best.index + best[0].length);
                    }
                  }
                }
                setMarkdown(newMarkdown);
                cmSetDoc(newMarkdown);
                doRender(newMarkdown);
                setInitialMath(undefined);
                mathOriginalRef.current = null;
                mathSourceIndexRef.current = -1;
                setShowMathModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Command Palette (Cmd+K) ── */}
      {/* Old start screen removed — now inline in Live content area */}
      {false && (
        <div className="hidden">
          <div className="hidden">
            {/* Logo */}
            <div className="mb-6">
              <MdfyLogo size={32} />
            </div>
            <p className="text-[13px] mb-8" style={{ color: "var(--text-muted)" }}>
              The Markdown Hub
            </p>

            {/* Quick actions */}
            <div className="space-y-1.5 mb-8">
              {[
                { label: "New Document", shortcut: isMobile ? "" : (typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "\u2318N" : "Ctrl+N"), action: () => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} addTab(); } },
                { label: "Paste from Clipboard", shortcut: isMobile ? "" : (typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "\u2318V" : "Ctrl+V"), action: () => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} } },
                { label: "Import File", shortcut: "", action: () => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} imageFileRef.current?.click(); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-colors hover:bg-[var(--menu-hover)]"
                  style={{ color: "var(--text-secondary)", background: "var(--surface)", border: "1px solid var(--border-dim)" }}
                >
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && <kbd className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>{item.shortcut}</kbd>}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              className="mb-8 py-6 rounded-lg text-center"
              style={{ border: "1px dashed var(--border)", color: "var(--text-faint)" }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-faint)"; }}
              onDrop={(e) => {
                e.preventDefault();
                setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {}
                // Let the main drop handler in MdEditor handle the file
              }}
            >
              <p className="text-[12px]">Drop files here to open</p>
              <p className="text-[10px] mt-1" style={{ opacity: 0.6 }}>MD, PDF, DOCX, PPTX, XLSX, HTML, CSV, TXT</p>
            </div>

            {/* Plugins */}
            <div className="mb-6">
              <p className="text-[10px] mb-2" style={{ color: "var(--text-faint)" }}>Also available on</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {["Chrome", "VS Code", "Mac", "CLI", "MCP", "GitHub"].map((ch) => (
                  <span key={ch} className="px-2 py-1 rounded text-[9px]" style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}>{ch}</span>
                ))}
              </div>
            </div>

            {/* Skip */}
            <button
              onClick={() => { setShowOnboarding(false); try { localStorage.setItem("mdfy-onboarded", "1"); } catch {} }}
              className="text-[11px] transition-colors"
              style={{ color: "var(--text-faint)" }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setLightboxImage(null); return; }
            if (userImages.length <= 1) return;
            const idx = userImages.findIndex(i => i.url === lightboxImage);
            if (idx < 0) return;
            if (e.key === "ArrowLeft" && idx > 0) { e.stopPropagation(); setLightboxImage(userImages[idx - 1].url); }
            if (e.key === "ArrowRight" && idx < userImages.length - 1) { e.stopPropagation(); setLightboxImage(userImages[idx + 1].url); }
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}>
          <button className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "#fff" }} onClick={() => setLightboxImage(null)}>
            <X width={20} height={20} />
          </button>
          {/* Navigate prev/next */}
          {userImages.length > 1 && (() => {
            const idx = userImages.findIndex(i => i.url === lightboxImage);
            return (<>
              {idx > 0 && (
                <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: "#fff" }} onClick={(e) => { e.stopPropagation(); setLightboxImage(userImages[idx - 1].url); }}>
                  <ChevronDown width={24} height={24} style={{ transform: "rotate(90deg)" }} />
                </button>
              )}
              {idx < userImages.length - 1 && (
                <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: "#fff" }} onClick={(e) => { e.stopPropagation(); setLightboxImage(userImages[idx + 1].url); }}>
                  <ChevronDown width={24} height={24} style={{ transform: "rotate(-90deg)" }} />
                </button>
              )}
            </>);
          })()}
          <img src={lightboxImage} alt="" onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] rounded-lg cursor-default"
            style={{ objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
          {/* Image info bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[11px]"
            style={{ background: "rgba(0,0,0,0.6)", color: "#ccc" }}
            onClick={(e) => e.stopPropagation()}>
            {userImages.find(i => i.url === lightboxImage)?.name || ""}
            <span className="ml-3" style={{ color: "var(--text-faint)" }}>
              {(() => { const idx = userImages.findIndex(i => i.url === lightboxImage); return idx >= 0 ? `${idx + 1} / ${userImages.length}` : ""; })()}
            </span>
          </div>
        </div>
      )}

      {showCommandPalette && (() => {
        const commands = [
          { label: "New Document", action: () => addTab() },
          { label: "Polish with AI", action: () => handleAIAction("polish") },
          { label: "AI Summary", action: () => handleAIAction("summary") },
          { label: "AI TL;DR", action: () => handleAIAction("tldr") },
          { label: "AI Translate", action: () => setShowAIPanel(true) },
          { label: "Toggle Theme", action: () => toggleTheme() },
          { label: "Toggle Sidebar", action: () => setShowSidebar(prev => !prev) },
          { label: "Toggle Toolbar", action: () => setShowToolbar(prev => !prev) },
          { label: "Share Document", action: () => handleShare() },
          { label: "Export as Markdown", action: () => handleDownloadMd() },
          { label: "Export as PDF", action: () => handleExportPdf() },
          { label: "Version History", action: () => handleToggleHistory() },
          { label: "Open AI Panel", action: () => { setShowAIPanel(true); setShowOutlinePanel(false); setShowImagePanel(false); } },
        ];
        const q = cmdSearch.toLowerCase();
        const filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands;
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => { setShowCommandPalette(false); setCmdSearch(""); }}
          >
            <div
              className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") { setShowCommandPalette(false); setCmdSearch(""); } }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search documents or type a command..."
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "var(--text-primary)" }}
                  value={cmdSearch}
                  onChange={e => setCmdSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      if (cmdSearchResults.length > 0 && filtered.length === 0) {
                        // Open first search result
                        const r = cmdSearchResults[0];
                        const tabId = `cloud-${r.id}`;
                        const exists = tabs.find(t => t.id === tabId || t.cloudId === r.id);
                        if (exists) { switchTab(exists.id); }
                        else {
                          setTabs(prev => [...prev, { id: tabId, title: r.title || "Untitled", markdown: "", cloudId: r.id, isDraft: true, permission: "mine" as const }]);
                          setTimeout(() => switchTab(tabId), 50);
                        }
                      } else if (filtered.length > 0) {
                        filtered[0].action();
                      }
                      setShowCommandPalette(false);
                      setCmdSearch("");
                    }
                  }}
                />
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {filtered.length === 0 && cmdSearchResults.length === 0 && !isCmdSearching ? (
                  <div className="px-4 py-3 text-[12px]" style={{ color: "var(--text-faint)" }}>No matching commands</div>
                ) : (<>
                  {filtered.map((cmd, i) => (
                    <button
                      key={cmd.label}
                      className={`w-full text-left px-4 py-2 text-[13px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2 ${i === 0 && !cmdSearchResults.length ? "bg-[var(--menu-hover)]" : ""}`}
                      style={{ color: "var(--text-primary)" }}
                      onClick={() => { cmd.action(); setShowCommandPalette(false); setCmdSearch(""); }}
                    >
                      {cmd.label}
                    </button>
                  ))}
                  {cmdSearch.length >= 3 && (
                    <>
                      {isCmdSearching && (
                        <div className="px-4 py-2 text-[11px] flex items-center gap-2" style={{ color: "var(--text-faint)", borderTop: filtered.length ? "1px solid var(--border-dim)" : "none" }}>
                          <span className="inline-block animate-spin" style={{ width: 10, height: 10, border: "1.5px solid var(--text-faint)", borderTopColor: "transparent", borderRadius: "50%" }} />
                          Searching documents...
                        </div>
                      )}
                      {!isCmdSearching && cmdSearchResults.length > 0 && (
                        <>
                          <div className="px-4 py-1.5 text-[9px] font-semibold uppercase" style={{ color: "var(--text-faint)", borderTop: filtered.length ? "1px solid var(--border-dim)" : "none", letterSpacing: "0.5px" }}>
                            Documents ({cmdSearchResults.length})
                          </div>
                          {cmdSearchResults.map(r => (
                            <button
                              key={r.id}
                              className="w-full text-left px-4 py-2 text-[13px] transition-colors hover:bg-[var(--menu-hover)] flex items-center gap-2"
                              style={{ color: "var(--text-primary)" }}
                              onClick={() => {
                                const tabId = `cloud-${r.id}`;
                                const exists = tabs.find(t => t.id === tabId || t.cloudId === r.id);
                                if (exists) {
                                  switchTab(exists.id);
                                } else {
                                  const newTab = { id: tabId, title: r.title || "Untitled", markdown: "", cloudId: r.id, isDraft: true, permission: "mine" as const };
                                  setTabs(prev => [...prev, newTab]);
                                  setTimeout(() => switchTab(tabId), 50);
                                }
                                setShowCommandPalette(false);
                                setCmdSearch("");
                              }}
                            >
                              <Search width={12} height={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                              <span className="truncate">{r.title}</span>
                              <span className="ml-auto text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>{(r.snippet || "").slice(0, 40)}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </>)}
              </div>
              <div className="px-4 py-2 text-[10px]" style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-dim)" }}>
                Press Enter to run, Esc to dismiss
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
