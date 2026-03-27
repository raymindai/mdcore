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

export type EdgeStyle = "solid" | "dotted" | "thick";
export type EdgeDirection = "forward" | "both" | "none";

export interface CanvasEdge {
  from: string;
  to: string;
  label?: string;
  style?: EdgeStyle;
  direction?: EdgeDirection;
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
    // Arrow style + direction
    const dir = edge.direction || "forward";
    let arrow: string;
    if (edge.style === "dotted") {
      arrow = dir === "both" ? "<-.->" : dir === "none" ? "-.-" : "-.->";
    } else if (edge.style === "thick") {
      arrow = dir === "both" ? "<==> " : dir === "none" ? "===" : "==>";
    } else {
      arrow = dir === "both" ? "<-->" : dir === "none" ? "---" : "-->";
    }
    if (edge.label) {
      lines.push(`    ${fromId} ${arrow}|${sanitizeMermaidText(edge.label)}| ${toId}`);
    } else {
      lines.push(`    ${fromId} ${arrow} ${toId}`);
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

  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    const list = childrenMap.get(e.from) || [];
    list.push(e.to);
    childrenMap.set(e.from, list);
    hasParent.add(e.to);
  }

  const roots = nodes.filter((n) => !hasParent.has(n.id));
  if (roots.length === 0) roots.push(nodes[0]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const isHorizontal = direction === "LR" || direction === "RL";
  const NODE_W = 160;
  const NODE_H = 60;
  const GAP_MAIN = isHorizontal ? NODE_W + 60 : NODE_H + 80; // along flow direction (more vertical spacing)
  const GAP_CROSS = isHorizontal ? NODE_H + 30 : NODE_W + 60; // perpendicular (more horizontal spacing)

  // Calculate subtree sizes (number of leaf descendants) for centering
  const subtreeSize = new Map<string, number>();
  const visited = new Set<string>();

  function calcSize(id: string): number {
    if (visited.has(id)) return 1;
    visited.add(id);
    const kids = childrenMap.get(id) || [];
    if (kids.length === 0) {
      subtreeSize.set(id, 1);
      return 1;
    }
    let total = 0;
    for (const kid of kids) {
      total += calcSize(kid);
    }
    subtreeSize.set(id, total);
    return total;
  }

  for (const root of roots) calcSize(root.id);
  // Also calc for any unvisited nodes
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      subtreeSize.set(n.id, 1);
    }
  }

  // All calculations use CENTER coordinates, then convert to top-left at the end
  // This ensures alignment regardless of node visual size differences
  const HALF_W = NODE_W / 2; // half of estimated node width
  const HALF_H = NODE_H / 2;

  const positioned = new Set<string>();
  let globalCrossOffset = 0;

  // cx/cy store CENTER positions temporarily
  const centerX = new Map<string, number>();
  const centerY = new Map<string, number>();

  function positionTree(id: string, depth: number, crossStart: number) {
    if (positioned.has(id)) return;
    positioned.add(id);

    const node = nodeMap.get(id);
    if (!node) return;

    const kids = (childrenMap.get(id) || []).filter((k) => !positioned.has(k));

    if (kids.length === 0) {
      // Leaf node
      if (isHorizontal) {
        centerX.set(id, 80 + HALF_W + depth * GAP_MAIN);
        centerY.set(id, 80 + HALF_H + crossStart * GAP_CROSS);
      } else {
        centerX.set(id, 80 + HALF_W + crossStart * GAP_CROSS);
        centerY.set(id, 80 + HALF_H + depth * GAP_MAIN);
      }
    } else {
      let offset = crossStart;
      for (const kid of kids) {
        const kidSize = subtreeSize.get(kid) || 1;
        positionTree(kid, depth + 1, offset);
        offset += kidSize;
      }

      // Center parent between first and last child (using CENTER coords)
      const firstCx = centerX.get(kids[0]) || 0;
      const lastCx = centerX.get(kids[kids.length - 1]) || 0;
      const firstCy = centerY.get(kids[0]) || 0;
      const lastCy = centerY.get(kids[kids.length - 1]) || 0;

      if (isHorizontal) {
        centerX.set(id, 80 + HALF_W + depth * GAP_MAIN);
        centerY.set(id, (firstCy + lastCy) / 2);
      } else {
        centerX.set(id, (firstCx + lastCx) / 2);
        centerY.set(id, 80 + HALF_H + depth * GAP_MAIN);
      }
    }
  }

  for (const root of roots) {
    const size = subtreeSize.get(root.id) || 1;
    positionTree(root.id, 0, globalCrossOffset);
    globalCrossOffset += size;
  }

  // Unpositioned nodes
  for (const node of nodes) {
    if (!positioned.has(node.id)) {
      if (isHorizontal) {
        centerX.set(node.id, 80 + HALF_W);
        centerY.set(node.id, 80 + HALF_H + globalCrossOffset * GAP_CROSS);
      } else {
        centerX.set(node.id, 80 + HALF_W + globalCrossOffset * GAP_CROSS);
        centerY.set(node.id, 80 + HALF_H);
      }
      globalCrossOffset++;
    }
  }

  // Fix merge nodes: center between parents using CENTER coords
  const parentMap = new Map<string, string[]>();
  for (const e of edges) {
    const parents = parentMap.get(e.to) || [];
    parents.push(e.from);
    parentMap.set(e.to, parents);
  }

  for (const node of nodes) {
    const parents = parentMap.get(node.id);
    if (!parents || parents.length < 2) continue;
    const pCentersX = parents.map(pid => centerX.get(pid) || 0);
    const pCentersY = parents.map(pid => centerY.get(pid) || 0);

    if (isHorizontal) {
      centerY.set(node.id, (Math.min(...pCentersY) + Math.max(...pCentersY)) / 2);
      centerX.set(node.id, Math.max(...pCentersX) + GAP_MAIN);
    } else {
      centerX.set(node.id, (Math.min(...pCentersX) + Math.max(...pCentersX)) / 2);
      centerY.set(node.id, Math.max(...pCentersY) + GAP_MAIN);
    }
  }

  // Convert CENTER coordinates to top-left (node.x, node.y)
  for (const node of nodes) {
    node.x = (centerX.get(node.id) || 0) - HALF_W;
    node.y = (centerY.get(node.id) || 0) - HALF_H;
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
