/* tslint:disable */
/* eslint-disable */

/**
 * Detected Markdown flavor information
 */
export class FlavorInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Confidence score 0.0 - 1.0
     */
    confidence: number;
    /**
     * Whether frontmatter was detected (yaml, toml, json)
     */
    get frontmatter(): string | undefined;
    /**
     * Whether frontmatter was detected (yaml, toml, json)
     */
    set frontmatter(value: string | null | undefined);
    /**
     * Whether MDX/JSX components were detected
     */
    jsx: boolean;
    /**
     * Whether math syntax was detected (katex, latex)
     */
    math: boolean;
    /**
     * Whether mermaid diagrams were detected
     */
    mermaid: boolean;
    /**
     * Primary detected flavor: "gfm", "obsidian", "mdx", "pandoc", "commonmark"
     */
    primary: string;
    /**
     * Whether wikilinks [[...]] were detected
     */
    wikilinks: boolean;
}

/**
 * Render result containing HTML and metadata
 */
export class RenderResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Detected flavor information
     */
    flavor: FlavorInfo;
    /**
     * Rendered HTML output
     */
    html: string;
    /**
     * Extracted title (first h1)
     */
    get title(): string | undefined;
    /**
     * Extracted title (first h1)
     */
    set title(value: string | null | undefined);
    /**
     * Table of contents entries
     */
    toc_json: string;
}

/**
 * WASM-specific: detect flavor only (no rendering)
 */
export function detectFlavor(markdown: string): any;

/**
 * Main entry point: parse and render Markdown to HTML
 */
export function render(markdown: string): RenderResult;

/**
 * WASM-specific: render with JSON options
 */
export function renderWithOptions(markdown: string, options_json: string): RenderResult;
