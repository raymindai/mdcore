/** Detected Markdown flavor information */
export interface FlavorInfo {
  /** Primary detected flavor */
  primary: "gfm" | "obsidian" | "mdx" | "pandoc" | "commonmark";
  /** Frontmatter format detected */
  frontmatter: "yaml" | "toml" | "json" | null;
  /** Whether math syntax ($, $$) was detected */
  math: boolean;
  /** Whether mermaid code blocks were detected */
  mermaid: boolean;
  /** Whether [[wikilinks]] were detected */
  wikilinks: boolean;
  /** Whether JSX/MDX components were detected */
  jsx: boolean;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
}

/** Table of contents entry */
export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

/** Result of rendering markdown */
export interface RenderResult {
  /** Fully processed HTML (syntax highlighting, math, etc. included) */
  html: string;
  /** Document title (first H1) */
  title: string | null;
  /** Table of contents entries */
  toc: TocEntry[];
  /** Detected markdown flavor */
  flavor: FlavorInfo;
}

/** Options for rendering */
export interface RenderOptions {
  /** Enable syntax highlighting via highlight.js (default: true) */
  highlight?: boolean;
  /** Enable KaTeX math rendering (default: true) */
  math?: boolean;
  /** Enable ASCII diagram detection (default: true) */
  asciiDiagrams?: boolean;
}

/** WASM bindings interface — what the Rust engine exposes */
export interface WasmBindings {
  render: (markdown: string) => {
    html: string;
    title: string | undefined;
    toc_json: string;
    flavor: {
      primary: string;
      math: boolean;
      mermaid: boolean;
      wikilinks: boolean;
      jsx: boolean;
      frontmatter: string | undefined;
      confidence: number;
    };
  };
  detectFlavor: (markdown: string) => any;
}
