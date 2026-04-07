import { postProcessHtml } from "./postprocess";
import type {
  FlavorInfo,
  RenderResult,
  RenderOptions,
  TocEntry,
  WasmBindings,
} from "./types";

let wasmBindings: WasmBindings | null = null;

/**
 * The mdcore engine.
 *
 * Usage:
 *   import { mdcore } from '@mdcore/engine';
 *
 *   // Initialize with WASM bindings (required before first render)
 *   await mdcore.init(bindings);
 *
 *   // Render markdown
 *   const result = await mdcore.render('# Hello World');
 *   // → { html, title, toc, flavor }
 */
export const mdcore = {
  /**
   * Initialize the engine with WASM bindings.
   *
   * Browser (with bundler):
   *   import { render, detectFlavor } from './wasm/mdcore_engine';
   *   mdcore.init({ render, detectFlavor });
   *
   * Node.js:
   *   import initWasm, { render, detectFlavor } from '@mdcore/engine/wasm';
   *   await initWasm();
   *   mdcore.init({ render, detectFlavor });
   */
  init(bindings: WasmBindings): void {
    wasmBindings = bindings;
  },

  /** Check if the engine has been initialized */
  get initialized(): boolean {
    return wasmBindings !== null;
  },

  /**
   * Render markdown to fully processed HTML.
   * Includes syntax highlighting, KaTeX math, ASCII diagram detection.
   * Mermaid diagrams are left as <pre lang="mermaid"> for DOM-based rendering.
   */
  render(markdown: string, options?: RenderOptions): RenderResult {
    if (!wasmBindings) {
      throw new Error(
        "@mdcore/engine: Not initialized. Call mdcore.init(bindings) first."
      );
    }

    const raw = wasmBindings.render(markdown);

    const html = postProcessHtml(raw.html, {
      highlight: options?.highlight,
      math: options?.math,
      asciiDiagrams: options?.asciiDiagrams,
    });

    let toc: TocEntry[] = [];
    try {
      toc = JSON.parse(raw.toc_json);
    } catch {
      // ignore parse errors
    }

    const flavor: FlavorInfo = {
      primary: raw.flavor.primary as FlavorInfo["primary"],
      math: raw.flavor.math,
      mermaid: raw.flavor.mermaid,
      wikilinks: raw.flavor.wikilinks,
      jsx: raw.flavor.jsx,
      frontmatter: (raw.flavor.frontmatter as FlavorInfo["frontmatter"]) ?? null,
      confidence: raw.flavor.confidence,
    };

    return {
      html,
      title: raw.title ?? null,
      toc,
      flavor,
    };
  },

  /**
   * Detect markdown flavor without rendering.
   */
  detectFlavor(markdown: string): FlavorInfo | null {
    if (!wasmBindings) {
      throw new Error(
        "@mdcore/engine: Not initialized. Call mdcore.init(bindings) first."
      );
    }
    const raw = wasmBindings.detectFlavor(markdown);
    if (!raw) return null;
    return {
      primary: raw.primary,
      math: raw.math,
      mermaid: raw.mermaid,
      wikilinks: raw.wikilinks,
      jsx: raw.jsx,
      frontmatter: raw.frontmatter ?? null,
      confidence: raw.confidence,
    };
  },

  /**
   * Post-process raw HTML without WASM rendering.
   * Useful when you already have HTML from the engine and just need
   * syntax highlighting, math, etc.
   */
  postprocess(html: string, options?: RenderOptions): string {
    return postProcessHtml(html, {
      highlight: options?.highlight,
      math: options?.math,
      asciiDiagrams: options?.asciiDiagrams,
    });
  },
};

// ── Re-exports ──

// Rendering
export { postProcessHtml } from "./postprocess";
export type {
  FlavorInfo,
  RenderResult,
  RenderOptions,
  TocEntry,
  WasmBindings,
} from "./types";

// Mermaid (browser-only)
export {
  styleMermaidSvg,
  getMermaidConfig,
  renderMermaidElements,
} from "./mermaid-style";

// HTML ↔ Markdown
export { htmlToMarkdown, isHtmlContent } from "./html-to-md";

// AI conversation detection
export {
  isAiConversation,
  parseConversation,
  formatConversation,
} from "./ai-conversation";
export type { ConversationMessage } from "./ai-conversation";

// CLI output conversion
export { isCliOutput, cliToMarkdown } from "./cli-to-md";

// File import
export {
  getFormatFromFilename,
  getSupportedAcceptString,
  isBinaryExtension,
  convertToMarkdown,
  csvToMarkdown,
  jsonToMarkdown,
  xmlToMarkdown,
  htmlFileToMarkdown,
  rtfToMarkdown,
  latexToMarkdown,
  rstToMarkdown,
} from "./file-import";
export type { ImportFormat } from "./file-import";
