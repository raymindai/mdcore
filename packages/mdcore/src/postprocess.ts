import katex from "katex";
import hljs from "highlight.js";

/**
 * Post-process HTML rendered by the Rust engine.
 * Handles client-side rendering of:
 * - Syntax highlighting (highlight.js) — since syntect can't compile to WASM
 * - Math (KaTeX) — comrak wraps math in <span data-math-style>
 * - ASCII diagram detection and styling
 * - Copy buttons on code blocks
 *
 * comrak with github_pre_lang outputs: <pre lang="rust"><code>...</code></pre>
 */
export function postProcessHtml(
  html: string,
  options?: { highlight?: boolean; math?: boolean; asciiDiagrams?: boolean }
): string {
  const opts = { highlight: true, math: true, asciiDiagrams: true, ...options };
  let result = html;

  // Detect ASCII art diagrams FIRST (before highlight.js touches them)
  if (opts.asciiDiagrams) {
    result = styleAsciiDiagrams(result);
  }

  // Syntax highlight code blocks (skips mermaid/math/ascii-diagram)
  if (opts.highlight) {
    result = highlightCode(result);
  }

  // Process KaTeX math
  if (opts.math) {
    result = processKatex(result);
  }

  // Remove disabled from checkboxes so they're clickable
  result = result.replace(/ disabled=""/g, "");

  // Convert align attr to inline style (Tailwind resets override HTML align)
  result = result.replace(
    / align="(left|center|right)"/g,
    ' style="text-align:$1"'
  );

  // Process images: extract alignment/sizing from alt text, wrap in <figure> for captions
  result = processImages(result);

  // NOTE: Mermaid is handled via DOM in useEffect (consumer's responsibility),
  // not here. This avoids fragile regex matching on HTML strings.

  return result;
}

/**
 * Process images: parse alt text for alignment/size markers, wrap standalone images in <figure>.
 * Alt text format: "description|center|50%" or "description|right|small"
 * Markers: center, left, right, small (25%), medium (50%), large (75%), or N% for custom width
 */
function processImages(html: string): string {
  // Step 1: Process alignment/sizing markers in alt text
  let result = html.replace(
    /<img\s+([^>]*?)alt="([^"]*)"([^>]*?)>/g,
    (_match, before: string, alt: string, after: string) => {
      const parts = alt.split("|").map(s => s.trim());
      const cleanAlt = parts[0];
      let dataAttrs = "";
      let style = "";

      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].toLowerCase();
        if (p === "center" || p === "left" || p === "right") {
          dataAttrs += ` data-align="${p}"`;
        } else if (p === "small" || p === "medium" || p === "large") {
          dataAttrs += ` data-size="${p}"`;
        } else if (/^\d+%$/.test(p)) {
          style += `max-width:${p};`;
        }
      }

      const existingStyle = before.match(/style="([^"]*)"/)?.[1] || after.match(/style="([^"]*)"/)?.[1] || "";
      const fullStyle = (existingStyle + style).trim();
      const cleanBefore = before.replace(/style="[^"]*"/, "");
      const cleanAfter = after.replace(/style="[^"]*"/, "");
      const styleAttr = fullStyle ? ` style="${fullStyle}"` : "";

      return `<img ${cleanBefore}alt="${cleanAlt}"${cleanAfter}${dataAttrs}${styleAttr}>`;
    }
  );

  // Step 2: Wrap standalone images in <figure> — only when image is the sole content of a <p>
  // This avoids invalid HTML like <p><figure>...</figure></p> or <a><figure>...</a>
  result = result.replace(
    /<p>(<img\s+[^>]*alt="([^"]*)"[^>]*>)<\/p>/g,
    (_match, imgTag: string, alt: string) => {
      const cleanAlt = alt.split("|")[0].trim();
      if (cleanAlt && cleanAlt.length > 0 && !/^\S+\.\w{2,4}$/.test(cleanAlt)) {
        return `<figure>${imgTag}<figcaption>${cleanAlt}</figcaption></figure>`;
      }
      return _match; // Keep as <p><img></p>
    }
  );

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
      const lang = rawLang === "text" ? null : rawLang;

      // Skip mermaid blocks — handled by DOM in consumer
      if (lang === "mermaid") return match;
      // Skip math blocks
      if (lang === "math") return match;

      const decoded = decodeHtmlEntities(code);
      try {
        const highlighted =
          lang && hljs.getLanguage(lang)
            ? hljs.highlight(decoded, { language: lang }).value
            : hljs.highlightAuto(decoded).value;
        // Preserve data-sourcepos from original pre tag
        const sourcepos =
          preAttrs.match(/data-sourcepos="[^"]+"/)?.[0] || "";
        const codeHeader = `<div class="code-header" style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;font-size:10px;font-family:ui-monospace,monospace;color:var(--text-faint);border-bottom:1px solid var(--border-dim)">${lang ? `<span style="text-transform:uppercase;letter-spacing:0.5px">${lang}</span>` : "<span></span>"}<button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.closest('pre').querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="padding:2px 8px;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;font-size:10px;font-family:ui-monospace,monospace">Copy</button></div>`;
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
        const rendered = katex.renderToString(
          decodeHtmlEntities(tex.trim()),
          { displayMode: false, throwOnError: false, trust: true }
        );
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
        const rendered = katex.renderToString(
          decodeHtmlEntities(tex.trim()),
          { displayMode: true, throwOnError: false, trust: true }
        );
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
 * Detect ASCII art diagrams in code blocks and style them.
 */
function styleAsciiDiagrams(html: string): string {
  const boxCharsRegex = /[┌┐└┘│─├┤┬┴┼╌═║╔╗╚╝╠╣╦╩╬┊┈]/g;
  const MIN_BOX_CHARS = 5;

  return html.replace(
    /<pre([^>]*)>(?:<div class="code-header"[\s\S]*?<\/div>)?<code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (match, preAttrs, codeAttrs, content) => {
      // Skip code blocks with a known language — they're source code, not diagrams
      if (
        /lang="mermaid"/.test(preAttrs) ||
        /language-mermaid/.test(codeAttrs)
      )
        return match;
      // If the code block has any language specified, it's source code — not ASCII art
      if (/lang="[^"]+"/i.test(preAttrs) || /language-\w+/.test(codeAttrs))
        return match;
      const decoded = decodeHtmlEntities(content);
      if ((decoded.match(boxCharsRegex) || []).length < MIN_BOX_CHARS)
        return match;
      const sourcepos =
        preAttrs.match(/data-sourcepos="[^"]+"/)?.[0] || "";
      return wrapAsciiDiagram(content, sourcepos);
    }
  );
}

function wrapAsciiDiagram(content: string, sourcepos: string): string {
  const decoded = decodeHtmlEntities(content);

  const htmlTable = asciiTableToHtml(decoded);
  if (htmlTable) {
    return `<div ${sourcepos}>${htmlTable}</div>`;
  }

  return `<div class="ascii-diagram ascii-rendered" data-original-code="${encodeURIComponent(decodeHtmlEntities(content))}" ${sourcepos}><pre style="margin:0;border:none;background:transparent;overflow-x:auto"><code style="display:block;padding:1.5rem;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:0.875rem;line-height:1.5;color:var(--text-secondary);white-space:pre;letter-spacing:0;font-variant-ligatures:none">${content}</code></pre></div>`;
}

/**
 * Convert ASCII table (┌──┬──┐ style) to HTML table.
 * Returns null if the text is not a valid ASCII table.
 */
function asciiTableToHtml(text: string): string | null {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return null;

  const hasTableChars = lines.some((l) => /[┬┼┴]/.test(l));
  if (!hasTableChars) return null;

  const dataLines = lines.filter((l) => {
    const pipes = (l.match(/│/g) || []).length;
    return (
      pipes >= 2 && !/^[│├┤┌┐└┘─┬┴┼═╔╗╚╝╠╣╦╩╬\s]+$/.test(l)
    );
  });
  if (dataLines.length < 2) return null;

  const pipeCounts = dataLines.map((l) => (l.match(/│/g) || []).length);
  const allSame = pipeCounts.every((c) => c === pipeCounts[0]);
  if (!allSame) return null;

  const hasNestedBoxes = dataLines.some(
    (l) => /│.*┌/.test(l) || /│.*└/.test(l)
  );
  if (hasNestedBoxes) return null;

  const sepLines = lines.filter((l) =>
    /^[│├┤┌┐└┘─┬┴┼═╔╗╚╝╠╣╦╩╬\s]+$/.test(l)
  );
  if (sepLines.length === 0) return null;
  if (dataLines.length < 1) return null;

  const rows = dataLines.map((line) => {
    return line
      .split("│")
      .slice(1, -1)
      .map((cell) => cell.trim());
  });
  if (rows.length === 0 || rows[0].length === 0) return null;

  const [header, ...body] = rows;

  let html = '<table data-sourcepos="">';
  html += "<thead><tr>";
  header.forEach((cell) => {
    html += `<th style="text-align:left">${cell}</th>`;
  });
  html += "</tr></thead><tbody>";
  body.forEach((row) => {
    html += "<tr>";
    row.forEach((cell) => {
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
