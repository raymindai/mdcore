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

  // Syntax highlight code blocks (skips mermaid/math)
  result = highlightCode(result);

  // Process KaTeX math
  result = processKatex(result);

  // Add copy buttons to code blocks
  result = addCodeCopyButtons(result);

  // Remove disabled from checkboxes so they're clickable
  result = result.replace(/ disabled=""/g, "");

  // Convert align attr to inline style (Tailwind resets override HTML align)
  result = result.replace(/ align="(left|center|right)"/g, ' style="text-align:$1"');

  // Detect and style ASCII art diagrams
  result = styleAsciiDiagrams(result);

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
      const lang = preLangMatch?.[1] || codeLangMatch?.[1] || null;

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
        const langLabel = lang ? `<span class="code-lang-label" style="position:absolute;top:6px;left:12px;font-size:10px;font-family:ui-monospace,monospace;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.5px;pointer-events:none;z-index:1">${lang}</span>` : "";
        return `<pre ${sourcepos} lang="${lang || "text"}" style="position:relative">${langLabel}<code class="hljs${lang ? ` language-${lang}` : ""}">${highlighted}</code></pre>`;
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
        return katex.renderToString(decodeHtmlEntities(tex.trim()), {
          displayMode: false,
          throwOnError: false,
          trust: true,
        });
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
    `<pre$1 style="position:relative"><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="position:absolute;top:6px;right:6px;padding:2px 8px;font-size:11px;font-family:ui-monospace,monospace;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.15s;z-index:2" title="Copy code">Copy</button><code`
  );
}

/**
 * Detect ASCII art diagrams (box-drawing characters) in code blocks
 * and apply special "diagram" styling for better visual presentation.
 */
function styleAsciiDiagrams(html: string): string {
  // Box-drawing characters: ┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼ ╌ ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬
  // Also ASCII-style: +--+ |  | +--+, and arrow chars: → ← ↓ ↑ ▶ ▼
  const boxChars = /[┌┐└┘│─├┤┬┴┼╌═║╔╗╚╝╠╣╦╩╬┊┈]/;

  return html.replace(
    /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (match, preAttrs, codeAttrs, content) => {
      // Skip mermaid blocks
      if (/lang="mermaid"/.test(preAttrs) || /language-mermaid/.test(codeAttrs)) return match;

      // Skip already highlighted blocks
      if (/class="hljs/.test(codeAttrs)) {
        // Check the decoded text content for box chars
        const decoded = decodeHtmlEntities(content);
        if (!boxChars.test(decoded)) return match;
      } else {
        const decoded = decodeHtmlEntities(content);
        if (!boxChars.test(decoded)) return match;
      }

      // Count box-drawing characters — need a meaningful amount
      const decoded = decodeHtmlEntities(content);
      const boxCount = (decoded.match(/[┌┐└┘│─├┤┬┴┼╌═║╔╗╚╝╠╣╦╩╬┊┈→←↓↑▶▼▲►◄]/g) || []).length;
      if (boxCount < 5) return match; // not enough to be a diagram

      // Apply diagram styling
      const sourcepos = preAttrs.match(/data-sourcepos="[^"]+"/)?.[0] || "";
      return `<div class="ascii-diagram" ${sourcepos}>
        <pre style="margin:0;border:none;background:transparent;overflow-x:auto"><code style="display:block;padding:1.25rem 1.5rem;font-family:ui-monospace,'JetBrains Mono','Fira Code',monospace;font-size:0.8125rem;line-height:1.5;color:var(--text-secondary);white-space:pre">${content}</code></pre>
      </div>`;
    }
  );
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
