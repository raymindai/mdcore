/**
 * Convert canvas graph structure to Markdown.
 * Traverses from root nodes (no incoming edges) through the graph,
 * mapping depth to heading levels and leaf clusters to lists.
 */

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  text: string;
  type: "text" | "code" | "task";
  checked?: boolean; // for task type
}

export interface CanvasEdge {
  from: string;
  to: string;
}

export function canvasToMarkdown(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): string {
  if (nodes.length === 0) return "";

  // Build adjacency list
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of edges) {
    const list = children.get(edge.from) || [];
    list.push(edge.to);
    children.set(edge.from, list);
    hasParent.add(edge.to);
  }

  // Find root nodes (no incoming edges)
  let roots = nodes.filter((n) => !hasParent.has(n.id));

  // If no roots (cycle or all connected), use topmost-leftmost nodes
  if (roots.length === 0) {
    roots = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 1);
  }

  // Sort roots by position (top to bottom, left to right)
  roots.sort((a, b) => a.y - b.y || a.x - b.x);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const lines: string[] = [];

  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    const kids = children.get(nodeId) || [];
    // Sort children by position
    const sortedKids = kids
      .map((id) => nodeMap.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.y - b!.y || a!.x - b!.x)
      .map((n) => n!.id);

    const hasChildren = sortedKids.length > 0;
    const text = node.text.trim();
    if (!text) return;

    if (node.type === "code") {
      // Code block
      if (depth === 0 && hasChildren) {
        lines.push(`# ${text}`);
      } else {
        lines.push("");
        lines.push("```");
        lines.push(text);
        lines.push("```");
      }
    } else if (node.type === "task") {
      // Task list item
      const check = node.checked ? "x" : " ";
      const indent = "  ".repeat(Math.max(0, depth - 1));
      lines.push(`${indent}- [${check}] ${text}`);
    } else if (depth === 0) {
      // Root level → h1
      lines.push(`# ${text}`);
    } else if (depth === 1 && hasChildren) {
      // Second level with children → h2
      lines.push("");
      lines.push(`## ${text}`);
    } else if (depth === 2 && hasChildren) {
      // Third level with children → h3
      lines.push("");
      lines.push(`### ${text}`);
    } else {
      // Leaf node or deep → list item
      const indent = "  ".repeat(Math.max(0, depth - 2));
      lines.push(`${indent}- ${text}`);
    }

    for (const childId of sortedKids) {
      traverse(childId, depth + 1);
    }
  }

  for (const root of roots) {
    traverse(root.id, 0);
    lines.push("");
  }

  // Also add any unconnected nodes as standalone paragraphs
  for (const node of nodes) {
    if (!visited.has(node.id) && node.text.trim()) {
      if (node.type === "code") {
        lines.push("```");
        lines.push(node.text.trim());
        lines.push("```");
      } else if (node.type === "task") {
        const check = node.checked ? "x" : " ";
        lines.push(`- [${check}] ${node.text.trim()}`);
      } else {
        lines.push(node.text.trim());
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
