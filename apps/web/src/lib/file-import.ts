/**
 * File import: convert various formats to Markdown.
 * Pure converters from @mdcore/engine. Server-side handlers local.
 */

import { htmlToMarkdown } from "@mdcore/engine";
import {
  convertToMarkdown,
  getFormatFromFilename,
  getSupportedAcceptString,
  isBinaryExtension,
} from "@mdcore/engine";
import type { ImportFormat } from "@mdcore/engine";

export { getFormatFromFilename, getSupportedAcceptString };
export type { ImportFormat };

// ─── Server-side handlers (mdfy.cc specific) ───

async function pdfToMarkdown(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/import/pdf", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to parse PDF" }));
    throw new Error(err.error);
  }
  const { text, title } = await res.json();
  let md = text || "";
  if (title) md = `# ${title}\n\n${md}`;
  return md;
}

async function officeToMarkdown(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/import/office", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to parse file" }));
    throw new Error(err.error);
  }
  const { text } = await res.json();
  return text || "";
}

async function docxToMarkdown(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return htmlToMarkdown(result.value);
}

/**
 * Send raw text to AI for markdown structuring.
 */
export async function mdfyText(text: string, filename?: string): Promise<string> {
  const res = await fetch("/api/import/mdfy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "AI processing failed" }));
    throw new Error(err.error);
  }
  const { markdown } = await res.json();
  return markdown;
}

// ─── Main import function ───

export async function importFile(
  file: File
): Promise<{ markdown: string; title: string }> {
  const format = getFormatFromFilename(file.name);
  const title = file.name.replace(/\.[^.]+$/, "");

  if (!format) {
    if (isBinaryExtension(file.name)) {
      throw new Error(
        `Unsupported format: ${file.name.match(/\.[^.]+$/)?.[0]}. Supported: MD, PDF, DOCX, PPTX, XLSX, HTML, CSV, LaTeX, RST, RTF, JSON, XML, TXT`
      );
    }
    const text = await file.text();
    return { markdown: text, title };
  }

  // Binary formats: server-side
  if (format === "pdf") {
    return { markdown: await pdfToMarkdown(file), title };
  }
  if (format === "docx") {
    const buffer = await file.arrayBuffer();
    return { markdown: await docxToMarkdown(buffer), title };
  }
  if (format === "office") {
    return { markdown: await officeToMarkdown(file), title };
  }

  // Text formats: use @mdcore/engine converters
  const text = await file.text();
  const markdown = convertToMarkdown(text, format);
  return { markdown, title };
}
