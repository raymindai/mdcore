import { render, detectFlavor } from "./wasm/mdcore_engine";
import type { RenderResult as WasmRenderResult } from "./wasm/mdcore_engine";
import { normalizeMarkdown } from "./normalize-markdown";

export interface FlavorInfo {
  primary: "gfm" | "obsidian" | "mdx" | "pandoc" | "commonmark";
  frontmatter: "yaml" | "toml" | "json" | null;
  math: boolean;
  mermaid: boolean;
  wikilinks: boolean;
  jsx: boolean;
  confidence: number;
}

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

/**
 * Render markdown via WASM engine.
 * Returns raw HTML (no postprocessing) — call postProcessHtml() separately.
 */
export async function renderMarkdown(markdown: string): Promise<{
  html: string;
  title: string | undefined;
  toc: TocEntry[];
  flavor: FlavorInfo;
}> {
  // Normalize structurally-malformed markdown before rendering.
  // Common pattern from AI/MCP-generated docs: multiple H1s, headings wrapped
  // in inline code (` # `text` `), and rows of one-line inline-code "paragraphs"
  // that should have been a fenced code block.
  const normalized = normalizeMarkdown(markdown);

  let result: WasmRenderResult;
  try {
    result = render(normalized);
  } catch (err) {
    console.error("WASM render failed:", err);
    throw new Error("Failed to render markdown. The engine encountered an error.");
  }

  const flavor: FlavorInfo = {
    primary: result.flavor.primary as FlavorInfo["primary"],
    math: result.flavor.math,
    mermaid: result.flavor.mermaid,
    wikilinks: result.flavor.wikilinks,
    jsx: result.flavor.jsx,
    frontmatter: (result.flavor.frontmatter as FlavorInfo["frontmatter"]) ?? null,
    confidence: result.flavor.confidence,
  };

  let toc: TocEntry[] = [];
  try {
    toc = JSON.parse(result.toc_json);
  } catch {
    // ignore parse errors
  }

  return {
    html: result.html,
    title: result.title ?? undefined,
    toc,
    flavor,
  };
}

export { detectFlavor };
