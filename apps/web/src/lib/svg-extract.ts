/**
 * Extract diagram info from Mermaid SVG + source code.
 * Combines:
 * - Mermaid source code (structure, connections, branching)
 * - Node styling from SVG (fill colors, special shapes)
 * Returns text for AI to render as styled HTML.
 */
export function extractStructureFromSvg(svgString: string, mermaidCode: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");

  const lines: string[] = [];

  // Always include mermaid source code — it has the exact structure
  lines.push("=== MERMAID SOURCE CODE ===");
  lines.push(mermaidCode);
  lines.push("");

  // Extract node styles from SVG (colors that mermaid code doesn't show)
  if (svg) {
    const styles = extractNodeStyles(svg);
    if (styles.length > 0) {
      lines.push("=== NODE STYLES (from rendered SVG) ===");
      styles.forEach((s) => {
        lines.push(`  - "${s.text}": fill=${s.fill}, stroke=${s.stroke}`);
      });
      lines.push("");
    }
  }

  return lines.join("\n");
}

interface NodeStyle {
  text: string;
  fill: string;
  stroke: string;
}

function extractNodeStyles(svg: SVGSVGElement): NodeStyle[] {
  const styles: NodeStyle[] = [];
  const seen = new Set<string>();

  svg.querySelectorAll(".node").forEach((node) => {
    const labelEl = node.querySelector(".nodeLabel") ||
                    node.querySelector(".label") ||
                    node.querySelector("text") ||
                    node.querySelector("foreignObject span");
    const text = (labelEl?.textContent || "").trim();
    if (!text || seen.has(text)) return;
    seen.add(text);

    // Get fill/stroke from the shape element
    const shape = node.querySelector("rect, circle, ellipse, polygon, path");
    if (!shape) return;

    const fill = shape.getAttribute("fill") || getComputedFill(shape);
    const stroke = shape.getAttribute("stroke") || "";

    // Only report non-default colors (skip mermaid's default dark theme grays)
    const isDefault = !fill || isDefaultColor(fill);
    if (!isDefault) {
      styles.push({ text, fill, stroke });
    }
  });

  return styles;
}

function getComputedFill(el: Element): string {
  const style = el.getAttribute("style") || "";
  const m = style.match(/fill:\s*([^;]+)/);
  return m ? m[1].trim() : "";
}

function isDefaultColor(color: string): boolean {
  if (!color) return true;
  const c = color.toLowerCase().replace(/\s/g, "");
  // Mermaid dark theme defaults
  const defaults = [
    "#1f2020", "#1f2937", "#2d3748", "#333", "#444",
    "rgb(31,32,32)", "rgb(31,41,55)", "none", "transparent",
    "#222230", "#1c1c26", // our themeVariables
  ];
  return defaults.some((d) => c.startsWith(d.replace(/\s/g, "")));
}
