use comrak::{markdown_to_html, ExtensionOptions, Options, ParseOptions, RenderOptions};
use serde::{Deserialize, Serialize};

/// Table of contents entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TocEntry {
    pub level: u8,
    pub text: String,
    pub id: String,
}

/// Render Markdown to HTML using comrak with full GFM + extensions
pub fn to_html(markdown: &str) -> (String, Option<String>, Vec<TocEntry>) {
    // Strip frontmatter before rendering
    let content = strip_frontmatter(markdown);

    // Configure comrak options
    let mut options = Options::default();

    // Extension options — enable everything useful
    options.extension = ExtensionOptions {
        strikethrough: true,
        tagfilter: true,
        table: true,
        autolink: true,
        tasklist: true,
        superscript: true,
        footnotes: true,
        description_lists: true,
        multiline_block_quotes: true,
        math_dollars: true,
        math_code: true,
        wikilinks_title_after_pipe: true,
        wikilinks_title_before_pipe: false,
        underline: true,
        spoiler: true,
        greentext: false,
        ..Default::default()
    };

    // Parse options
    options.parse = ParseOptions {
        smart: true,
        default_info_string: Some("text".to_string()),
        relaxed_tasklist_matching: true,
        relaxed_autolinks: true,
        ..Default::default()
    };

    // Render options
    options.render = RenderOptions {
        unsafe_: true, // Allow raw HTML passthrough
        github_pre_lang: true,
        escape: false,
        sourcepos: true,
        ..Default::default()
    };

    // Render (syntax highlighting handled by frontend via highlight.js/shiki)
    let html = markdown_to_html(&content, &options);

    // Extract title (first h1)
    let title = extract_title(&content);

    // Extract TOC
    let toc = extract_toc(&content);

    (html, title, toc)
}

/// Strip YAML/TOML/JSON frontmatter from Markdown
fn strip_frontmatter(markdown: &str) -> String {
    // YAML frontmatter
    if markdown.starts_with("---\n") || markdown.starts_with("---\r\n") {
        let rest = &markdown[4..];
        if let Some(end) = rest.find("\n---") {
            return rest[end + 4..].trim_start_matches('\n').to_string();
        }
    }

    // TOML frontmatter
    if markdown.starts_with("+++\n") || markdown.starts_with("+++\r\n") {
        let rest = &markdown[4..];
        if let Some(end) = rest.find("\n+++") {
            return rest[end + 4..].trim_start_matches('\n').to_string();
        }
    }

    markdown.to_string()
}

/// Extract the first H1 as the document title
fn extract_title(markdown: &str) -> Option<String> {
    for line in markdown.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") && !trimmed.starts_with("## ") {
            return Some(trimmed[2..].trim().to_string());
        }
    }
    None
}

/// Extract table of contents from heading lines
fn extract_toc(markdown: &str) -> Vec<TocEntry> {
    let mut toc = Vec::new();
    let mut in_code_block = false;

    for line in markdown.lines() {
        let trimmed = line.trim();

        // Skip code blocks
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_code_block = !in_code_block;
            continue;
        }
        if in_code_block {
            continue;
        }

        // Match headings
        if let Some(heading) = parse_heading(trimmed) {
            toc.push(heading);
        }
    }

    toc
}

/// Parse a single heading line into a TocEntry
fn parse_heading(line: &str) -> Option<TocEntry> {
    let trimmed = line.trim();

    // ATX headings: # to ######
    if trimmed.starts_with('#') {
        let level = trimmed.chars().take_while(|&c| c == '#').count();
        if level >= 1 && level <= 6 {
            let text = trimmed[level..].trim().to_string();
            if !text.is_empty() {
                let id = slugify(&text);
                return Some(TocEntry {
                    level: level as u8,
                    text,
                    id,
                });
            }
        }
    }

    None
}

/// Convert heading text to a URL-safe slug
fn slugify(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else if c == ' ' {
                '-'
            } else {
                // Keep non-ASCII chars (for Korean, CJK, etc.)
                if c.is_alphabetic() {
                    c
                } else {
                    '-'
                }
            }
        })
        .collect::<String>()
        .replace("--", "-")
        .trim_matches('-')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_render() {
        let md = "# Hello\n\nThis is **bold** and *italic*.";
        let (html, title, toc) = to_html(md);
        assert!(html.contains("<h1>"));
        assert!(html.contains("<strong>bold</strong>"));
        assert!(html.contains("<em>italic</em>"));
        assert_eq!(title, Some("Hello".to_string()));
        assert_eq!(toc.len(), 1);
    }

    #[test]
    fn test_gfm_table() {
        let md = r#"| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |
"#;
        let (html, _, _) = to_html(md);
        assert!(html.contains("<table>"));
        assert!(html.contains("<th>"));
        assert!(html.contains("Alice"));
    }

    #[test]
    fn test_task_list() {
        let md = r#"- [x] Done
- [ ] Not done
"#;
        let (html, _, _) = to_html(md);
        assert!(html.contains("checked"));
    }

    #[test]
    fn test_frontmatter_stripped() {
        let md = r#"---
title: Test
---

# Hello
"#;
        let (html, title, _) = to_html(md);
        assert!(!html.contains("title: Test"));
        assert_eq!(title, Some("Hello".to_string()));
    }

    #[test]
    fn test_code_block() {
        let md = r#"```rust
fn main() {
    println!("Hello");
}
```
"#;
        let (html, _, _) = to_html(md);
        assert!(html.contains("<pre"));
        assert!(html.contains("println"));
    }

    #[test]
    fn test_math_dollars() {
        let md = r#"Inline $x^2$ and display:

$$
E = mc^2
$$
"#;
        let (html, _, _) = to_html(md);
        // comrak with math_dollars should handle math
        assert!(html.contains("math"));
    }

    #[test]
    fn test_toc_extraction() {
        let md = r#"# Title
## Section 1
### Subsection
## Section 2
"#;
        let (_, _, toc) = to_html(md);
        assert_eq!(toc.len(), 4);
        assert_eq!(toc[0].level, 1);
        assert_eq!(toc[1].level, 2);
        assert_eq!(toc[2].level, 3);
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("API Reference"), "api-reference");
    }

    #[test]
    fn test_wikilinks() {
        let md = "Link to [[Another Page]] here.";
        let (html, _, _) = to_html(md);
        assert!(html.contains("Another Page"));
    }
}
