/**
 * File import: detect format and convert to Markdown.
 * Pure converters for text formats.
 * Server-side formats (PDF, Office) require external handlers.
 */

import { htmlToMarkdown } from "./html-to-md";

export type ImportFormat =
  | "md"
  | "txt"
  | "html"
  | "docx"
  | "pdf"
  | "csv"
  | "json"
  | "xml"
  | "rtf"
  | "rst"
  | "tex"
  | "office";

const SUPPORTED_EXTENSIONS: Record<string, ImportFormat> = {
  ".md": "md",
  ".markdown": "md",
  ".txt": "txt",
  ".text": "txt",
  ".html": "html",
  ".htm": "html",
  ".docx": "docx",
  ".pdf": "pdf",
  ".csv": "csv",
  ".tsv": "csv",
  ".json": "json",
  ".jsonl": "json",
  ".xml": "xml",
  ".svg": "xml",
  ".rtf": "rtf",
  ".rst": "rst",
  ".rest": "rst",
  ".tex": "tex",
  ".latex": "tex",
  ".pptx": "office",
  ".ppt": "office",
  ".xlsx": "office",
  ".xls": "office",
  ".odp": "office",
  ".ods": "office",
  ".odt": "office",
};

const BINARY_EXTENSIONS = [
  ".zip", ".rar", ".7z", ".gz", ".tar", ".exe", ".dmg", ".pkg",
  ".app", ".iso", ".bin", ".dat", ".mp3", ".mp4", ".avi", ".mov",
  ".mkv", ".wav", ".flac", ".ogg", ".jpg", ".jpeg", ".png", ".gif",
  ".bmp", ".tiff", ".webp", ".ico", ".psd", ".ai", ".eps", ".indd",
];

/** Detect import format from filename extension */
export function getFormatFromFilename(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? SUPPORTED_EXTENSIONS[ext] || null : null;
}

/** Get HTML accept string for file input elements */
export function getSupportedAcceptString(): string {
  return Object.keys(SUPPORTED_EXTENSIONS).join(",");
}

/** Check if a file extension is a known binary format */
export function isBinaryExtension(filename: string): boolean {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  return BINARY_EXTENSIONS.includes(ext);
}

// ─── Pure text converters ───

/** CSV → Markdown table */
export function csvToMarkdown(text: string): string {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return text;

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const rows = lines.map(parseRow);
  const colCount = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => {
    while (r.length < colCount) r.push("");
    return r;
  });

  const header = `| ${padded[0].join(" | ")} |`;
  const separator = `| ${padded[0].map(() => "---").join(" | ")} |`;
  const body = padded
    .slice(1)
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return [header, separator, body].join("\n");
}

/** JSON → fenced code block */
export function jsonToMarkdown(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
  } catch {
    return "```json\n" + text + "\n```";
  }
}

/** XML → fenced code block */
export function xmlToMarkdown(text: string): string {
  return "```xml\n" + text + "\n```";
}

/** HTML file → Markdown (extracts body if full document) */
export function htmlFileToMarkdown(text: string): string {
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : text;
  return htmlToMarkdown(content);
}

/** RTF → plain text (basic extraction) */
export function rtfToMarkdown(text: string): string {
  return text
    .replace(/\{\\fonttbl[^}]*\}/g, "")
    .replace(/\{\\colortbl[^}]*\}/g, "")
    .replace(/\{\\stylesheet[^}]*\}/g, "")
    .replace(/\{\\info[^}]*\}/g, "")
    .replace(/\\par\b/g, "\n")
    .replace(/\\tab\b/g, "\t")
    .replace(/\\line\b/g, "\n")
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\[a-z]+\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** LaTeX → Markdown */
export function latexToMarkdown(text: string): string {
  return text
    .replace(/\\documentclass\{[^}]*\}/g, "")
    .replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, "")
    .replace(/\\begin\{document\}/g, "")
    .replace(/\\end\{document\}/g, "")
    .replace(/\\maketitle/g, "")
    .replace(/\\title\{([^}]*)\}/g, "# $1\n")
    .replace(/\\author\{([^}]*)\}/g, "*$1*\n")
    .replace(/\\date\{([^}]*)\}/g, "*$1*\n")
    .replace(/\\section\*?\{([^}]*)\}/g, "## $1")
    .replace(/\\subsection\*?\{([^}]*)\}/g, "### $1")
    .replace(/\\subsubsection\*?\{([^}]*)\}/g, "#### $1")
    .replace(/\\textbf\{([^}]*)\}/g, "**$1**")
    .replace(/\\textit\{([^}]*)\}/g, "*$1*")
    .replace(/\\emph\{([^}]*)\}/g, "*$1*")
    .replace(/\\texttt\{([^}]*)\}/g, "`$1`")
    .replace(/\\underline\{([^}]*)\}/g, "$1")
    .replace(/\\begin\{itemize\}/g, "")
    .replace(/\\end\{itemize\}/g, "")
    .replace(/\\begin\{enumerate\}/g, "")
    .replace(/\\end\{enumerate\}/g, "")
    .replace(/\\item\s*/g, "- ")
    .replace(/\$\$([^$]+)\$\$/g, "\n$$\n$1\n$$\n")
    .replace(/\\\[([^\]]+)\\\]/g, "\n$$\n$1\n$$\n")
    .replace(/\\\(([^)]+)\\\)/g, "$$$1$$")
    .replace(
      /\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g,
      "```\n$1\n```"
    )
    .replace(/\\verb\|([^|]*)\|/g, "`$1`")
    .replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, "[$2]($1)")
    .replace(/\\url\{([^}]*)\}/g, "<$1>")
    .replace(/\\includegraphics(\[[^\]]*\])?\{([^}]*)\}/g, "![]($2)")
    .replace(/\\begin\{quote\}/g, "> ")
    .replace(/\\end\{quote\}/g, "")
    .replace(/\\begin\{center\}/g, "")
    .replace(/\\end\{center\}/g, "")
    .replace(/\\\\(\s)/g, "\n")
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** reStructuredText → Markdown */
export function rstToMarkdown(text: string): string {
  return text
    .replace(/^(.+)\n={3,}\s*$/gm, "# $1")
    .replace(/^(.+)\n-{3,}\s*$/gm, "## $1")
    .replace(/^(.+)\n~{3,}\s*$/gm, "### $1")
    .replace(/^(.+)\n\^{3,}\s*$/gm, "#### $1")
    .replace(/\*\*([^*]+)\*\*/g, "**$1**")
    .replace(/\*([^*]+)\*/g, "*$1*")
    .replace(/``([^`]+)``/g, "`$1`")
    .replace(/`([^<]+)<([^>]+)>`_/g, "[$1]($2)")
    .replace(/\.\. code-block::\s*(\w+)/g, "```$1")
    .replace(/\.\. image::\s*(.+)/g, "![]($1)")
    .replace(/\.\. note::/g, "> **Note:**")
    .replace(/\.\. warning::/g, "> **Warning:**")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Convert text content to Markdown based on detected format.
 * For text-based formats only (md, txt, html, csv, json, xml, rtf, rst, tex).
 * For binary formats (pdf, docx, office), use platform-specific handlers.
 */
export function convertToMarkdown(
  text: string,
  format: ImportFormat
): string {
  switch (format) {
    case "md":
    case "txt":
      return text;
    case "html":
      return htmlFileToMarkdown(text);
    case "csv":
      return csvToMarkdown(text);
    case "json":
      return jsonToMarkdown(text);
    case "xml":
      return xmlToMarkdown(text);
    case "rtf":
      return rtfToMarkdown(text);
    case "rst":
      return rstToMarkdown(text);
    case "tex":
      return latexToMarkdown(text);
    default:
      return text;
  }
}
