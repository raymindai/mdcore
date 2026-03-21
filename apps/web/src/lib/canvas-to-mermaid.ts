/**
 * Convert canvas graph to Mermaid code and vice versa.
 */

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  text: string;
  shape: "round" | "square" | "circle" | "diamond";
}

export interface CanvasEdge {
  from: string;
  to: string;
  label?: string;
}

type Direction = "LR" | "TD" | "TB" | "RL" | "BT";

/**
 * Convert canvas nodes + edges → Mermaid flowchart code
 */
export function canvasToMermaid(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  direction: Direction = "LR"
): string {
  if (nodes.length === 0) return "";

  const lines: string[] = [`graph ${direction}`];

  // Define nodes with shapes
  for (const node of nodes) {
    const label = node.text.trim() || node.id;
    const safe = sanitizeMermaidText(label);
    const nodeId = toMermaidId(node.id);

    switch (node.shape) {
      case "round":
        lines.push(`    ${nodeId}(${safe})`);
        break;
      case "square":
        lines.push(`    ${nodeId}[${safe}]`);
        break;
      case "circle":
        lines.push(`    ${nodeId}((${safe}))`);
        break;
      case "diamond":
        lines.push(`    ${nodeId}{${safe}}`);
        break;
    }
  }

  // Define edges
  for (const edge of edges) {
    const fromId = toMermaidId(edge.from);
    const toId = toMermaidId(edge.to);
    if (edge.label) {
      lines.push(`    ${fromId} -->|${sanitizeMermaidText(edge.label)}| ${toId}`);
    } else {
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  return lines.join("\n");
}

/**
 * Parse Mermaid flowchart code → canvas nodes + edges
 */
export function mermaidToCanvas(
  code: string
): { nodes: CanvasNode[]; edges: CanvasEdge[]; direction: Direction } | null {
  const lines = code.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Parse direction from first line
  const headerMatch = lines[0].match(/^(?:graph|flowchart)\s+(LR|TD|TB|RL|BT)/i);
  if (!headerMatch) return null;
  const direction = headerMatch[1].toUpperCase() as Direction;

  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const nodeIds = new Set<string>();
  const seenNodes = new Map<string, CanvasNode>();

  function ensureNode(id: string, text?: string, shape?: CanvasNode["shape"]) {
    if (seenNodes.has(id)) {
      // Update text/shape if provided
      if (text) {
        const n = seenNodes.get(id)!;
        n.text = text;
        if (shape) n.shape = shape;
      }
      return;
    }
    const node: CanvasNode = {
      id,
      x: 0,
      y: 0,
      text: text || id,
      shape: shape || "round",
    };
    nodes.push(node);
    seenNodes.set(id, node);
    nodeIds.add(id);
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip subgraph, end, style, class lines for now
    if (/^(subgraph|end|style|class|click)\b/i.test(line)) continue;

    // Edge: A --> B, A -->|label| B, A --- B
    const edgeMatch = line.match(
      /^(\w+)(?:\[.*?\]|\(.*?\)|\{.*?\}|\(\(.*?\)\))?\s*(-->|---|-\.-|==>)(?:\|([^|]*)\|)?\s*(\w+)(?:\[.*?\]|\(.*?\)|\{.*?\}|\(\(.*?\)\))?/
    );
    if (edgeMatch) {
      const [, fromId, , label, toId] = edgeMatch;
      ensureNode(fromId);
      ensureNode(toId);

      // Also parse node definitions inline
      parseInlineNode(line, fromId, ensureNode);
      parseInlineNode(line, toId, ensureNode);

      edges.push({ from: fromId, to: toId, label: label || undefined });
      continue;
    }

    // Node definition: A[text], A(text), A{text}, A((text))
    const nodeMatch = line.match(/^(\w+)(\[.*?\]|\(.*?\)|\{.*?\}|\(\(.*?\)\))/);
    if (nodeMatch) {
      const [, id, shapeText] = nodeMatch;
      const { text, shape } = parseShapeText(shapeText);
      ensureNode(id, text, shape);
    }
  }

  // Auto-layout: arrange nodes in a grid based on direction
  autoLayout(nodes, edges, direction);

  return { nodes, edges, direction };
}

function parseInlineNode(
  line: string,
  nodeId: string,
  ensureNode: (id: string, text?: string, shape?: CanvasNode["shape"]) => void
) {
  // Look for node definition in the line: nodeId[text] or nodeId(text) etc
  const patterns = [
    new RegExp(`${nodeId}\\[([^\\]]+)\\]`),
    new RegExp(`${nodeId}\\(\\(([^)]+)\\)\\)`),
    new RegExp(`${nodeId}\\(([^)]+)\\)`),
    new RegExp(`${nodeId}\\{([^}]+)\\}`),
  ];
  const shapes: CanvasNode["shape"][] = ["square", "circle", "round", "diamond"];

  for (let i = 0; i < patterns.length; i++) {
    const m = line.match(patterns[i]);
    if (m) {
      ensureNode(nodeId, m[1], shapes[i]);
      return;
    }
  }
}

function parseShapeText(shapeText: string): { text: string; shape: CanvasNode["shape"] } {
  if (shapeText.startsWith("((") && shapeText.endsWith("))")) {
    return { text: shapeText.slice(2, -2), shape: "circle" };
  }
  if (shapeText.startsWith("(") && shapeText.endsWith(")")) {
    return { text: shapeText.slice(1, -1), shape: "round" };
  }
  if (shapeText.startsWith("{") && shapeText.endsWith("}")) {
    return { text: shapeText.slice(1, -1), shape: "diamond" };
  }
  if (shapeText.startsWith("[") && shapeText.endsWith("]")) {
    return { text: shapeText.slice(1, -1), shape: "square" };
  }
  return { text: shapeText, shape: "round" };
}

function autoLayout(nodes: CanvasNode[], edges: CanvasEdge[], direction: Direction) {
  if (nodes.length === 0) return;

  // Build adjacency for topological sort
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    const list = children.get(e.from) || [];
    list.push(e.to);
    children.set(e.from, list);
    hasParent.add(e.to);
  }

  // BFS from roots to assign levels
  const roots = nodes.filter((n) => !hasParent.has(n.id));
  if (roots.length === 0) roots.push(nodes[0]);

  const levels = new Map<string, number>();
  const queue = roots.map((r) => ({ id: r.id, level: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    for (const childId of children.get(id) || []) {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    }
  }

  // Assign positions
  const levelCounts = new Map<number, number>();
  const isHorizontal = direction === "LR" || direction === "RL";
  const spacing = { x: isHorizontal ? 200 : 160, y: isHorizontal ? 80 : 100 };

  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    const count = levelCounts.get(level) ?? 0;
    levelCounts.set(level, count + 1);

    if (isHorizontal) {
      node.x = 40 + level * spacing.x;
      node.y = 40 + count * spacing.y;
    } else {
      node.x = 40 + count * spacing.x;
      node.y = 40 + level * spacing.y;
    }
  }
}

function sanitizeMermaidText(text: string): string {
  // Wrap in quotes if contains special chars
  if (/[[\]{}()|><!#&]/.test(text)) {
    return `"${text.replace(/"/g, "'")}"`;
  }
  return text;
}

function toMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Wrap mermaid code in a markdown code block
 */
export function wrapInCodeBlock(mermaidCode: string): string {
  return "```mermaid\n" + mermaidCode + "\n```";
}
