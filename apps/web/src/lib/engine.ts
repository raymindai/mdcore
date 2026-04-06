import { render, detectFlavor } from "./wasm/mdcore_engine";
import type { RenderResult as WasmRenderResult } from "./wasm/mdcore_engine";
import type { FlavorInfo, TocEntry } from "@mdcore/engine";

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
  const result: WasmRenderResult = render(markdown);

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
