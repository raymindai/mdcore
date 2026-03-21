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

  // Syntax highlight code blocks
  result = highlightCode(result);

  // Process KaTeX math
  result = processKatex(result);

  // Process mermaid code blocks
  result = processMermaid(result);

  // Add copy buttons to code blocks
  result = addCodeCopyButtons(result);

  return result;
}

/**
 * Syntax highlight code blocks using highlight.js
 * comrak with github_pre_lang=true outputs: <pre lang="rust"><code>...</code></pre>
 */
function highlightCode(html: string): string {
  return html.replace(
    /<pre(?:\s+lang="(\w+)")?[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (match, lang, code) => {
      // Skip mermaid blocks — handled separately
      if (lang === "mermaid") return match;
      // Skip math blocks
      if (lang === "math") return match;

      const decoded = decodeHtmlEntities(code);
      try {
        const highlighted = lang && hljs.getLanguage(lang)
          ? hljs.highlight(decoded, { language: lang }).value
          : hljs.highlightAuto(decoded).value;
        return `<pre><code class="hljs${lang ? ` language-${lang}` : ""}">${highlighted}</code></pre>`;
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
 * Mark mermaid code blocks for client-side rendering
 * comrak outputs: <pre lang="mermaid"><code>...</code></pre>
 */
function processMermaid(html: string): string {
  let mermaidId = 0;
  return html.replace(
    /<pre[^>]*lang="mermaid"[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (_, code) => {
      const id = `mermaid-${mermaidId++}`;
      return `<div class="mermaid-container" data-mermaid-id="${id}"><pre class="mermaid">${decodeHtmlEntities(code.trim())}</pre></div>`;
    }
  );
}

/**
 * Add copy buttons to code blocks (skip mermaid containers)
 */
function addCodeCopyButtons(html: string): string {
  return html.replace(
    /<pre(?![^>]*class="mermaid")([^>]*)><code/g,
    `<pre$1 style="position:relative"><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="position:absolute;top:8px;right:8px;padding:2px 8px;font-size:11px;background:var(--code-copy-bg);color:var(--code-copy-color);border:1px solid var(--code-copy-border);border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.2s">Copy</button><code`
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
