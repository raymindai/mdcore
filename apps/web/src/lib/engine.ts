import { render, detectFlavor, type RenderResult } from "./wasm/mdcore_engine";

export async function renderMarkdown(markdown: string): Promise<{
  html: string;
  title: string | undefined;
  toc: Array<{ level: number; text: string; id: string }>;
  flavor: {
    primary: string;
    math: boolean;
    mermaid: boolean;
    wikilinks: boolean;
    jsx: boolean;
    frontmatter: string | undefined;
    confidence: number;
  };
}> {
  const result: RenderResult = render(markdown);

  const flavor = result.flavor;
  const flavorInfo = {
    primary: flavor.primary,
    math: flavor.math,
    mermaid: flavor.mermaid,
    wikilinks: flavor.wikilinks,
    jsx: flavor.jsx,
    frontmatter: flavor.frontmatter,
    confidence: flavor.confidence,
  };

  let toc: Array<{ level: number; text: string; id: string }> = [];
  try {
    toc = JSON.parse(result.toc_json);
  } catch {
    // ignore parse errors
  }

  return {
    html: result.html,
    title: result.title,
    toc,
    flavor: flavorInfo,
  };
}

export { detectFlavor };
