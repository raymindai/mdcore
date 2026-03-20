use crate::FlavorInfo;

/// Detect the Markdown flavor from source text
pub fn detect(markdown: &str) -> FlavorInfo {
    let mut info = FlavorInfo {
        primary: "commonmark".to_string(),
        frontmatter: None,
        math: false,
        mermaid: false,
        wikilinks: false,
        jsx: false,
        confidence: 0.5,
    };

    let mut gfm_score: f64 = 0.0;
    let mut obsidian_score: f64 = 0.0;
    let mut mdx_score: f64 = 0.0;
    let mut pandoc_score: f64 = 0.0;

    // --- Frontmatter detection ---
    if markdown.starts_with("---\n") || markdown.starts_with("---\r\n") {
        // Find closing ---
        let rest = &markdown[4..];
        if let Some(end) = rest.find("\n---") {
            let fm_content = &rest[..end];
            // Check if it looks like YAML (has key: value patterns)
            if fm_content.contains(": ") || fm_content.contains(":\n") {
                info.frontmatter = Some("yaml".to_string());
            }
        }
    } else if markdown.starts_with("+++\n") || markdown.starts_with("+++\r\n") {
        info.frontmatter = Some("toml".to_string());
    } else if markdown.starts_with("{\n") || markdown.starts_with("{\r\n") {
        // Could be JSON frontmatter
        if markdown[1..].trim_start().starts_with('"') {
            info.frontmatter = Some("json".to_string());
        }
    }

    // --- Line-by-line analysis ---
    let mut in_code_block = false;
    let mut code_fence = String::new();

    for line in markdown.lines() {
        let trimmed = line.trim();

        // Track code blocks to avoid false positives
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            if in_code_block {
                if trimmed.starts_with(&code_fence) {
                    in_code_block = false;
                    code_fence.clear();
                }
            } else {
                in_code_block = true;
                code_fence = if trimmed.starts_with("```") {
                    "```".to_string()
                } else {
                    "~~~".to_string()
                };

                // Check for mermaid code blocks
                let lang = trimmed.trim_start_matches(&code_fence).trim();
                if lang == "mermaid" {
                    info.mermaid = true;
                }
            }
            continue;
        }

        if in_code_block {
            continue;
        }

        // --- GFM indicators ---
        // Task lists: - [ ] or - [x]
        if trimmed.starts_with("- [ ]") || trimmed.starts_with("- [x]") || trimmed.starts_with("- [X]") {
            gfm_score += 2.0;
        }

        // Tables: | ... | ... |
        if trimmed.starts_with('|') && trimmed.ends_with('|') && trimmed.matches('|').count() >= 3 {
            gfm_score += 1.0;
        }

        // Strikethrough: ~~text~~
        if trimmed.contains("~~") {
            gfm_score += 1.0;
        }

        // Autolinks
        if trimmed.contains("https://") && !trimmed.contains("](") {
            gfm_score += 0.5;
        }

        // --- Obsidian indicators ---
        // Wikilinks: [[...]]
        if trimmed.contains("[[") && trimmed.contains("]]") {
            obsidian_score += 3.0;
            info.wikilinks = true;
        }

        // Callouts: > [!note] or > [!warning]
        if trimmed.starts_with("> [!") {
            obsidian_score += 2.0;
        }

        // Tags: #tag (not heading)
        if !trimmed.starts_with('#') {
            let words: Vec<&str> = trimmed.split_whitespace().collect();
            for word in &words {
                if word.starts_with('#') && word.len() > 1 && !word.starts_with("##") {
                    let tag = &word[1..];
                    if tag.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '/') {
                        obsidian_score += 1.0;
                    }
                }
            }
        }

        // Embeds: ![[...]]
        if trimmed.contains("![[") {
            obsidian_score += 3.0;
        }

        // --- MDX indicators ---
        // JSX components: <Component /> or <Component>
        if (trimmed.starts_with('<') && trimmed.contains("/>"))
            || (trimmed.starts_with('<')
                && trimmed.len() > 1
                && trimmed.chars().nth(1).map_or(false, |c| c.is_uppercase()))
        {
            mdx_score += 2.0;
            info.jsx = true;
        }

        // import/export statements
        if trimmed.starts_with("import ") || trimmed.starts_with("export ") {
            mdx_score += 3.0;
            info.jsx = true;
        }

        // --- Pandoc indicators ---
        // Citations: [@key] or [-@key]
        if trimmed.contains("[@") || trimmed.contains("[-@") {
            pandoc_score += 3.0;
        }

        // Definition lists: : definition
        if trimmed.starts_with(": ") && trimmed.len() > 2 {
            pandoc_score += 1.5;
        }

        // Footnotes: [^id]
        if trimmed.contains("[^") && trimmed.contains(']') {
            pandoc_score += 1.0;
            // Could also be GFM footnotes
            gfm_score += 0.5;
        }

        // --- Math detection (cross-flavor) ---
        // Display math: $$ ... $$
        if trimmed.starts_with("$$") || trimmed.contains("$$") {
            info.math = true;
        }
        // Inline math: $...$  (basic heuristic)
        if trimmed.matches('$').count() >= 2 && !trimmed.contains("$$") {
            // Check it's not currency
            let dollar_positions: Vec<usize> = trimmed.match_indices('$').map(|(i, _)| i).collect();
            if dollar_positions.len() >= 2 {
                let between = &trimmed[dollar_positions[0] + 1..dollar_positions[1]];
                if between.contains('\\') || between.contains('^') || between.contains('_') {
                    info.math = true;
                }
            }
        }
    }

    // --- Determine primary flavor ---
    let scores = [
        ("gfm", gfm_score),
        ("obsidian", obsidian_score),
        ("mdx", mdx_score),
        ("pandoc", pandoc_score),
    ];

    let max_score = scores
        .iter()
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
        .unwrap();

    if max_score.1 > 0.0 {
        info.primary = max_score.0.to_string();
        // Calculate confidence based on how dominant the top score is
        let total: f64 = scores.iter().map(|(_, s)| s).sum();
        if total > 0.0 {
            info.confidence = (max_score.1 / total).min(1.0).max(0.3);
        }
        // Boost confidence if score is high
        if max_score.1 >= 5.0 {
            info.confidence = info.confidence.max(0.8);
        }
    }

    info
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_gfm() {
        let md = r#"# Hello

- [x] Task 1
- [ ] Task 2

| Name | Age |
|------|-----|
| Alice | 30 |
"#;
        let info = detect(md);
        assert_eq!(info.primary, "gfm");
        assert!(info.confidence > 0.5);
    }

    #[test]
    fn test_detect_obsidian() {
        let md = r#"# My Note

This links to [[Another Note]] and [[Folder/Page]].

> [!note] Important
> This is a callout.

![[embedded-image.png]]
"#;
        let info = detect(md);
        assert_eq!(info.primary, "obsidian");
        assert!(info.wikilinks);
        assert!(info.confidence > 0.7);
    }

    #[test]
    fn test_detect_mdx() {
        let md = r#"import { Chart } from './components'

# Dashboard

<Chart data={metrics} />

export const meta = { title: "Dashboard" }
"#;
        let info = detect(md);
        assert_eq!(info.primary, "mdx");
        assert!(info.jsx);
    }

    #[test]
    fn test_detect_math() {
        let md = r#"# Euler's Identity

The famous equation $e^{i\pi} + 1 = 0$ is beautiful.

$$
\int_0^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
"#;
        let info = detect(md);
        assert!(info.math);
    }

    #[test]
    fn test_detect_frontmatter() {
        let md = r#"---
title: My Post
date: 2026-03-20
tags: [rust, wasm]
---

# Hello World
"#;
        let info = detect(md);
        assert_eq!(info.frontmatter, Some("yaml".to_string()));
    }

    #[test]
    fn test_detect_mermaid() {
        let md = r#"# Architecture

```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```
"#;
        let info = detect(md);
        assert!(info.mermaid);
    }

    #[test]
    fn test_plain_commonmark() {
        let md = r#"# Hello

This is a **bold** paragraph with [a link](https://example.com).

- Item 1
- Item 2
- Item 3
"#;
        let info = detect(md);
        assert_eq!(info.primary, "commonmark");
    }
}
