import katex from "katex";
import hljs from "highlight.js";

/**
 * Post-process HTML rendered by the Rust engine.
 * Handles client-side rendering of:
 * - Syntax highlighting (highlight.js) — since syntect can't compile to WASM
 * - Math (KaTeX) — comrak wraps math in <span data-math-style>
 * - Mermaid diagrams — rendered via mermaid.js
 * - Copy buttons on code blocks
 *
 * comrak with github_pre_lang outputs: <pre lang="rust"><code>...</code></pre>
 */
export function postProcessHtml(html: string): string {
  let result = html;

  // Detect ASCII art diagrams FIRST (before highlight.js touches them)
  result = styleAsciiDiagrams(result);

  // Syntax highlight code blocks (skips mermaid/math/ascii-diagram)
  result = highlightCode(result);

  // Process KaTeX math
  result = processKatex(result);

  // Copy buttons are now added inside highlightCode's code-header

  // Remove disabled from checkboxes so they're clickable
  result = result.replace(/ disabled=""/g, "");

  // Convert align attr to inline style (Tailwind resets override HTML align)
  result = result.replace(/ align="(left|center|right)"/g, ' style="text-align:$1"');

  // NOTE: Mermaid is handled via DOM in useEffect (MdEditor.tsx),
  // not here. This avoids fragile regex matching on HTML strings.

  return result;
}

/**
 * Syntax highlight code blocks using highlight.js
 * comrak with github_pre_lang=true outputs: <pre lang="rust"><code>...</code></pre>
 */
function highlightCode(html: string): string {
  return html.replace(
    /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (match, preAttrs, codeAttrs, code) => {
      // Extract lang from pre attrs (lang="xxx") or code attrs (class="language-xxx")
      const preLangMatch = preAttrs.match(/lang="(\w+)"/);
      const codeLangMatch = codeAttrs.match(/language-(\w+)/);
      const rawLang = preLangMatch?.[1] || codeLangMatch?.[1] || null;
      const lang = rawLang === "text" ? null : rawLang; // "text" is not a real language

      // Skip mermaid blocks — handled by DOM in useEffect
      if (lang === "mermaid") return match;
      // Skip math blocks
      if (lang === "math") return match;

      const decoded = decodeHtmlEntities(code);
      try {
        const highlighted = lang && hljs.getLanguage(lang)
          ? hljs.highlight(decoded, { language: lang }).value
          : hljs.highlightAuto(decoded).value;
        // Preserve data-sourcepos from original pre tag
        const sourcepos = preAttrs.match(/data-sourcepos="[^"]+"/)?.[0] || "";
        const codeHeader = `<div class="code-header" style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;font-size:10px;font-family:ui-monospace,monospace;color:var(--text-faint);border-bottom:1px solid var(--border-dim)">${lang ? `<span style="text-transform:uppercase;letter-spacing:0.5px">${lang}</span>` : '<span></span>'}<button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.closest('pre').querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="padding:2px 8px;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;font-size:10px;font-family:ui-monospace,monospace">Copy</button></div>`;
        return `<pre ${sourcepos}${lang ? ` lang="${lang}"` : ""} style="position:relative">${codeHeader}<code class="hljs${lang ? ` language-${lang}` : ""}">${highlighted}</code></pre>`;
      } catch {
        return match;
      }
    }
  );
}

/**
 * Render KaTeX math from comrak's math output
 * comrak with math_dollars outputs:
 *   Inline: <span data-math-style="inline">...</span>
 *   Display: <span data-math-style="display">...</span>
 */
function processKatex(html: string): string {
  let result = html;

  // Inline math: $...$
  result = result.replace(
    /<span data-math-style="inline">([\s\S]*?)<\/span>/g,
    (_, tex) => {
      try {
        const rendered = katex.renderToString(decodeHtmlEntities(tex.trim()), {
          displayMode: false,
          throwOnError: false,
          trust: true,
        });
        return `<span class="math-rendered" data-math-src="${encodeURIComponent(tex.trim())}" data-math-mode="inline" style="cursor:pointer">${rendered}</span>`;
      } catch {
        return `<code class="math-error">${tex}</code>`;
      }
    }
  );

  // Display math: $$...$$
  result = result.replace(
    /<span data-math-style="display">([\s\S]*?)<\/span>/g,
    (_, tex) => {
      try {
        const rendered = katex.renderToString(decodeHtmlEntities(tex.trim()), {
          displayMode: true,
          throwOnError: false,
          trust: true,
        });
        return `<div class="math-rendered" data-math-src="${encodeURIComponent(tex.trim())}" data-math-mode="display" style="cursor:pointer">${rendered}</div>`;
      } catch {
        return `<code class="math-error">${tex}</code>`;
      }
    }
  );

  // Also handle <code class="language-math"> (fallback)
  result = result.replace(
    /<code class="language-math">([\s\S]*?)<\/code>/g,
    (_, tex) => {
      try {
        return katex.renderToString(decodeHtmlEntities(tex.trim()), {
          displayMode: true,
          throwOnError: false,
          trust: true,
        });
      } catch {
        return `<code class="math-error">${tex}</code>`;
      }
    }
  );

  return result;
}

/**
 * Add copy buttons to code blocks (skip mermaid containers)
 */
function addCodeCopyButtons(html: string): string {
  return html.replace(
    /<pre(?![^>]*class="mermaid")(?![^>]*lang="mermaid")([^>]*)><code/g,
    `<pre$1 style="position:relative"><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent).then(()=>{this.innerHTML='<svg width=14 height=14 viewBox=&quot;0 0 16 16&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot;><polyline points=&quot;4 8 7 11 12 5&quot;/></svg>';setTimeout(()=>this.innerHTML='<svg width=14 height=14 viewBox=&quot;0 0 16 16&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;1.5&quot;><rect x=&quot;5&quot; y=&quot;2&quot; width=&quot;9&quot; height=&quot;10&quot; rx=&quot;1&quot;/><path d=&quot;M2 6v7a1 1 0 001 1h7&quot;/></svg>',1500)})" style="position:absolute;top:6px;right:6px;padding:4px;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.15s;z-index:2;display:flex;align-items:center" title="Copy code"><svg width=14 height=14 viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="9" height="10" rx="1"/><path d="M2 6v7a1 1 0 001 1h7"/></svg></button><code`
  );
}

/**
 * Detect ASCII art diagrams in both code blocks AND paragraphs.
 * Also merges consecutive ASCII paragraphs that were split by blank lines.
 */
function styleAsciiDiagrams(html: string): string {
  const boxCharsRegex = /[┌┐└┘│─├┤┬┴┼╌═║╔╗╚╝╠╣╦╩╬┊┈]/g;
  const MIN_BOX_CHARS = 5;

  // Only detect in code blocks — not in paragraphs (too many false positives)
  const result = html.replace(
    /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (match, preAttrs, codeAttrs, content) => {
      if (/lang="mermaid"/.test(preAttrs) || /language-mermaid/.test(codeAttrs)) return match;
      const decoded = decodeHtmlEntities(content);
      if ((decoded.match(boxCharsRegex) || []).length < MIN_BOX_CHARS) return match;
      const sourcepos = preAttrs.match(/data-sourcepos="[^"]+"/)?.[0] || "";
      return wrapAsciiDiagram(content, sourcepos);
    }
  );

  return result;
}

function wrapAsciiDiagram(content: string, sourcepos: string): string {
  const decoded = decodeHtmlEntities(content);

  // Try to convert ASCII table to HTML table
  const htmlTable = asciiTableToHtml(decoded);
  if (htmlTable) {
    return `<div ${sourcepos}>${htmlTable}</div>`;
  }

  // Otherwise: styled ASCII diagram
  return `<div class="ascii-diagram" ${sourcepos}><pre style="margin:0;border:none;background:transparent;overflow-x:auto"><code style="display:block;padding:1.5rem;font-family:ui-monospace,'JetBrains Mono','Fira Code',monospace;font-size:0.8125rem;line-height:1.5;color:var(--text-secondary);white-space:pre">${content}</code></pre></div>`;
}

/**
 * Convert ASCII table (┌──┬──┐ style) to HTML table.
 * Returns null if the text is not a valid ASCII table.
 */
function asciiTableToHtml(text: string): string | null {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 3) return null;

  // Check if it's a table: must have ┬ or ┼ (column separators)
  const hasTableChars = lines.some(l => /[┬┼┴]/.test(l));
  if (!hasTableChars) return null;

  // Strict check: a real table has UNIFORM column structure
  // All data rows must have the same number of │ separators
  // Diagrams have irregular │ counts per line
  const dataLines = lines.filter(l => {
    const pipes = (l.match(/│/g) || []).length;
    return pipes >= 2 && !/^[│├┤┌┐└┘─┬┴┼═╔╗╚╝╠╣╦╩╬\s]+$/.test(l);
  });
  if (dataLines.length < 2) return null;

  // Check if all data lines have the same number of │
  const pipeCounts = dataLines.map(l => (l.match(/│/g) || []).length);
  const allSame = pipeCounts.every(c => c === pipeCounts[0]);
  if (!allSame) return null; // Irregular → it's a diagram, not a table

  // Also reject if there are nested boxes (┌ inside a row)
  const hasNestedBoxes = dataLines.some(l => /│.*┌/.test(l) || /│.*└/.test(l));
  if (hasNestedBoxes) return null;

  // Find separator lines (contain ┼ or ┬ or ┴ or ├ or ─)
  const sepLines = lines.filter(l => /^[│├┤┌┐└┘─┬┴┼═╔╗╚╝╠╣╦╩╬\s]+$/.test(l));
  if (sepLines.length === 0) return null;

  if (dataLines.length < 1) return null;

  // Parse columns from data lines
  const rows = dataLines.map(line => {
    return line.split("│").slice(1, -1).map(cell => cell.trim());
  });

  if (rows.length === 0 || rows[0].length === 0) return null;

  // First row is header, rest are body
  const [header, ...body] = rows;

  let html = '<table data-sourcepos="">';
  html += "<thead><tr>";
  header.forEach(cell => {
    html += `<th style="text-align:left">${cell}</th>`;
  });
  html += "</tr></thead><tbody>";
  body.forEach(row => {
    html += "<tr>";
    row.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";

  return html;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}
