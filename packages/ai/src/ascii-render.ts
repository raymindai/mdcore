/* ========================================
   @mdcore/ai — ASCII/Mermaid to HTML Diagram
   Extracted from apps/web/src/app/api/ascii-to-mermaid/route.ts
   ======================================== */

import type { AIConfig } from "./types.js";
import { callAI } from "./providers/index.js";

/**
 * Convert an ASCII diagram or Mermaid code into styled HTML.
 *
 * The AI generates a dark-themed HTML representation of the diagram
 * that can be directly inserted into a document.
 *
 * @param ascii - ASCII art, box-drawing art, or Mermaid code
 * @param config - AI provider configuration
 * @returns HTML string (a single root <div>)
 *
 * @example
 * ```ts
 * const html = await asciiRender("graph LR; A-->B-->C", {
 *   provider: "gemini",
 *   apiKey: "...",
 * });
 * ```
 */
export async function asciiRender(
  ascii: string,
  config: AIConfig
): Promise<string> {
  const prompt = `Convert this diagram into clean, styled HTML.
The input may be: ASCII box-drawing art, Mermaid code, or Mermaid code with node style annotations.
Read the mermaid code carefully to understand the EXACT connection structure — which nodes connect to which, and how the graph branches.

Design rules:
- Dark theme ONLY — no blue tones, no gradients, no background images
- Root background: transparent (parent container handles it)
- Box/node background: #1c1c24
- Nested/secondary boxes: #222230
- Borders: 1px solid #2e2e3a — subtle, no glow, no shadow
- Accent color: #fb923c (use ONLY for key highlights, arrows, or important labels)
- Text colors: #ededf0 (primary labels), #b8b8c4 (body/descriptions), #888899 (annotations)
- Boxes: styled divs, border-radius:8px, padding:12px 16px
- Headers inside boxes: font-size:15px, font-weight:600, color:#ededf0
- Body text: font-size:13px, color:#b8b8c4
- Arrows/connections between boxes: use a connector div like this:
  Vertical arrow: <div style="display:flex;flex-direction:column;align-items:center;gap:0;color:#50505e"><div style="width:1.5px;height:20px;background:#3a3a48"></div><div style="font-size:10px;line-height:1">▼</div></div>
  Horizontal arrow: <div style="display:flex;align-items:center;gap:0;color:#50505e"><div style="height:1.5px;width:24px;background:#3a3a48"></div><div style="font-size:10px;line-height:1">▶</div></div>
  If an edge has a label, place a <span style="font-size:11px;color:#888899;padding:0 4px">label</span> next to the arrow line
- Side-by-side items: flexbox row, align-items:center, gap:8px
- Vertical flow: flexbox column, align-items:center, gap:0 (arrows handle spacing)
- Sequence diagrams: participants as boxes in a row at top, then vertical message rows with sender→receiver horizontal arrows
- Flowcharts: preserve the EXACT branching structure from the mermaid code.
  If A connects to B and C, show A on the left, then an arrow that SPLITS into two paths going to B (top) and C (bottom).
  Use CSS grid or nested flexbox to represent branching — NOT a flat linear list.
  Example branching: <div style="display:flex;align-items:center;gap:0"><div>[A box]</div><div>[arrow]</div><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:0"><div>[arrow]</div><div>[B box]</div></div><div style="display:flex;align-items:center;gap:0"><div>[arrow]</div><div>[C box]</div></div></div></div>
- If a node has a non-default fill color in NODE STYLES section, apply that color as its background
- Gantt: horizontal bar chart with labeled time bars, use colored divs for bars
- Pie charts: convert to a styled HTML table with columns [Label, Value, Bar]. The Bar column uses a colored inline div (width proportional to value, background:#fb923c, height:8px, border-radius:4px)
- Tables: clean dark-themed table with th background:#222230, td background:transparent, border:1px solid #2e2e3a
- Preserve ALL text content exactly as in the input
- Use system-ui font
- Output ONLY the HTML — no explanation, no markdown, no code fences
- Do NOT include <html>, <head>, <body> tags — just the inner content div
- Wrap everything in a single <div style="..."> root element

Diagram:
${ascii}`;

  const result = await callAI(prompt, config);

  // Clean up: remove code fences if the AI wrapped the output
  const cleaned = result
    .replace(/^```html\n?/gm, "")
    .replace(/^```\n?/gm, "")
    .replace(/Here is.*:\n?/gi, "")
    .trim();

  if (!cleaned || !cleaned.includes("<div")) {
    throw new Error("AI did not return valid HTML output");
  }

  return cleaned;
}
