pub mod flavor;
pub mod render;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Detected Markdown flavor information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct FlavorInfo {
    /// Primary detected flavor: "gfm", "obsidian", "mdx", "pandoc", "commonmark"
    pub primary: String,
    /// Whether frontmatter was detected (yaml, toml, json)
    pub frontmatter: Option<String>,
    /// Whether math syntax was detected (katex, latex)
    pub math: bool,
    /// Whether mermaid diagrams were detected
    pub mermaid: bool,
    /// Whether wikilinks [[...]] were detected
    pub wikilinks: bool,
    /// Whether MDX/JSX components were detected
    pub jsx: bool,
    /// Confidence score 0.0 - 1.0
    pub confidence: f64,
}

/// Rendering options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderOptions {
    /// Target output format
    pub format: OutputFormat,
    /// Whether to include syntax highlighting
    pub highlight: bool,
    /// Theme for syntax highlighting
    pub theme: String,
    /// Whether to render math
    pub math: bool,
    /// Whether to generate heading IDs
    pub heading_ids: bool,
    /// Whether to make links safe (nofollow, target=_blank)
    pub safe_links: bool,
}

impl Default for RenderOptions {
    fn default() -> Self {
        Self {
            format: OutputFormat::Html,
            highlight: true,
            theme: "base16-ocean.dark".to_string(),
            math: true,
            heading_ids: true,
            safe_links: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OutputFormat {
    Html,
    PlainText,
}

/// Render result containing HTML and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct RenderResult {
    /// Rendered HTML output
    pub html: String,
    /// Detected flavor information
    pub flavor: FlavorInfo,
    /// Extracted title (first h1)
    pub title: Option<String>,
    /// Table of contents entries
    pub toc_json: String,
}

/// Main entry point: parse and render Markdown to HTML
#[wasm_bindgen]
pub fn render(markdown: &str) -> RenderResult {
    render_with_options(markdown, &RenderOptions::default())
}

/// Render with custom options
pub fn render_with_options(markdown: &str, _options: &RenderOptions) -> RenderResult {
    // Step 1: Detect flavor
    let flavor_info = flavor::detect(markdown);

    // Step 2: Render using comrak
    let (html, title, toc) = render::to_html(markdown);

    RenderResult {
        html,
        flavor: flavor_info,
        title,
        toc_json: serde_json::to_string(&toc).unwrap_or_default(),
    }
}

/// WASM-specific: render with JSON options
#[wasm_bindgen(js_name = renderWithOptions)]
pub fn render_with_options_js(markdown: &str, options_json: &str) -> RenderResult {
    let options: RenderOptions = serde_json::from_str(options_json).unwrap_or_default();
    render_with_options(markdown, &options)
}

/// WASM-specific: detect flavor only (no rendering)
#[wasm_bindgen(js_name = detectFlavor)]
pub fn detect_flavor_js(markdown: &str) -> JsValue {
    let info = flavor::detect(markdown);
    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}
