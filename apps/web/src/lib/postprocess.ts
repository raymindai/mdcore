import katex from "katex";

/**
 * Post-process HTML rendered by the Rust engine.
 * Handles client-side rendering of:
 * - Math (KaTeX) — comrak wraps math in <math> tags
 * - Mermaid diagrams — rendered via mermaid.js
 * - Copy buttons on code blocks
 */
export function postProcessHtml(html: string): string {
  let result = html;

  // Process KaTeX math
  result = processKatex(result);

  // Process mermaid code blocks
  result = processMermaid(result);

  // Add copy buttons to code blocks
  result = addCodeCopyButtons(result);

  return result;
}

/**
 * Render KaTeX math from comrak's math output
 * comrak with math_dollars outputs:
 *   Inline: <code class="math-inline">...</code>  (or similar)
 *   Display: <code class="math-display">...</code>
 */
function processKatex(html: string): string {
  // Handle display math: $$ ... $$
  // comrak wraps these in <p> tags with math-display class or similar
  let result = html;

  // Match math blocks - comrak outputs math in <code> with math classes
  // Pattern: <code class="language-math"> or data-math attributes
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

  // Inline math: $...$  — comrak wraps in <span> or specific tags
  // With math_dollars feature, comrak uses <span data-math-style="inline">
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

  return result;
}

/**
 * Mark mermaid code blocks for client-side rendering
 * Actual rendering happens in a useEffect after DOM insertion
 */
function processMermaid(html: string): string {
  let mermaidId = 0;
  return html.replace(
    /<pre[^>]*><code[^>]*class="[^"]*language-mermaid[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (_, code) => {
      const id = `mermaid-${mermaidId++}`;
      return `<div class="mermaid-container" data-mermaid-id="${id}"><pre class="mermaid">${decodeHtmlEntities(code.trim())}</pre></div>`;
    }
  );
}

/**
 * Add copy buttons to code blocks
 */
function addCodeCopyButtons(html: string): string {
  return html.replace(
    /<pre([^>]*)><code/g,
    `<pre$1 style="position:relative"><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="position:absolute;top:8px;right:8px;padding:2px 8px;font-size:11px;background:#27272a;color:#a1a1aa;border:1px solid #3f3f46;border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.2s">Copy</button><code`
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
