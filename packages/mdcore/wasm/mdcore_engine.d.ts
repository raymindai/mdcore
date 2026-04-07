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

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_flavorinfo_free: (a: number, b: number) => void;
    readonly __wbg_get_flavorinfo_confidence: (a: number) => number;
    readonly __wbg_get_flavorinfo_frontmatter: (a: number) => [number, number];
    readonly __wbg_get_flavorinfo_jsx: (a: number) => number;
    readonly __wbg_get_flavorinfo_math: (a: number) => number;
    readonly __wbg_get_flavorinfo_mermaid: (a: number) => number;
    readonly __wbg_get_flavorinfo_primary: (a: number) => [number, number];
    readonly __wbg_get_flavorinfo_wikilinks: (a: number) => number;
    readonly __wbg_get_renderresult_flavor: (a: number) => number;
    readonly __wbg_get_renderresult_html: (a: number) => [number, number];
    readonly __wbg_get_renderresult_title: (a: number) => [number, number];
    readonly __wbg_get_renderresult_toc_json: (a: number) => [number, number];
    readonly __wbg_renderresult_free: (a: number, b: number) => void;
    readonly __wbg_set_flavorinfo_confidence: (a: number, b: number) => void;
    readonly __wbg_set_flavorinfo_frontmatter: (a: number, b: number, c: number) => void;
    readonly __wbg_set_flavorinfo_jsx: (a: number, b: number) => void;
    readonly __wbg_set_flavorinfo_math: (a: number, b: number) => void;
    readonly __wbg_set_flavorinfo_mermaid: (a: number, b: number) => void;
    readonly __wbg_set_flavorinfo_primary: (a: number, b: number, c: number) => void;
    readonly __wbg_set_flavorinfo_wikilinks: (a: number, b: number) => void;
    readonly __wbg_set_renderresult_flavor: (a: number, b: number) => void;
    readonly __wbg_set_renderresult_html: (a: number, b: number, c: number) => void;
    readonly __wbg_set_renderresult_title: (a: number, b: number, c: number) => void;
    readonly __wbg_set_renderresult_toc_json: (a: number, b: number, c: number) => void;
    readonly detectFlavor: (a: number, b: number) => any;
    readonly render: (a: number, b: number) => number;
    readonly renderWithOptions: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
