/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

// ─── Types ───

interface BundleDocument {
  id: string;
  title: string | null;
  markdown: string;
  created_at: string;
  updated_at: string;
}

export interface AIGraphData {
  nodes: Array<{ id: string; label: string; type: string; weight: number; documentId?: string }>;
  edges: Array<{ source: string; target: string; label?: string; weight: number; type: string }>;
  clusters: Array<{ id: string; label: string; nodeIds: string[]; color: string }>;
  summary?: string;
  themes?: string[];
  insights?: string[];
}

// Detail levels: 1=docs only, 2=+summary, 3=+themes, 4=+top concepts, 5=everything
type DetailLevel = 1 | 2 | 3 | 4 | 5;
const DETAIL_LABELS = ["", "Documents", "+ Analysis", "+ Themes", "+ Key Concepts", "Full Map"];

interface BundleCanvasProps {
  documents: BundleDocument[];
  aiGraph?: AIGraphData | null;
  isAnalyzing?: boolean;
  selectedDocId?: string | null;
  onDocumentClick?: (docId: string) => void;
  onCopyContext?: () => void;
  onRegenerate?: () => void;
  className?: string;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  concept: { bg: "rgba(251,146,60,0.08)", border: "#fb923c", text: "#fb923c" },
  entity: { bg: "rgba(74,222,128,0.08)", border: "#4ade80", text: "#4ade80" },
  tag: { bg: "rgba(167,139,250,0.08)", border: "#a78bfa", text: "#a78bfa" },
};

// ─── Layout with ELK — advanced overlap-free positioning ───

const elk = new ELK();

const NODE_SIZES: Record<string, { w: number; h: number }> = {
  documentCard: { w: 270, h: 140 },
  summaryNode: { w: 300, h: 190 },
  themeTag: { w: 220, h: 32 },
  conceptTag: { w: 160, h: 36 },
  edgeLabel: { w: 120, h: 22 },
};

async function buildLayout(docs: BundleDocument[], aiGraph?: AIGraphData | null, selectedDocId?: string | null, detail: DetailLevel = 5): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const elkNodes: any[] = [];
  const elkEdges: any[] = [];
  const nodeSet = new Set<string>();
  const hasSummary = aiGraph?.summary || (aiGraph?.themes && aiGraph.themes.length > 0);

  function addNode(id: string, type: string, data: any) {
    if (nodeSet.has(id)) return;
    nodeSet.add(id);
    const size = NODE_SIZES[type] || NODE_SIZES.conceptTag;
    elkNodes.push({ id, width: size.w, height: size.h });
    nodes.push({ id, type, position: { x: 0, y: 0 }, data });
  }

  // ── 1. Summary (detail >= 2) ──
  if (hasSummary && detail >= 2) {
    addNode("analysis:summary", "summaryNode", {
      summary: aiGraph?.summary || "",
      insights: aiGraph?.insights || [],
      docCount: docs.length,
      totalWords: docs.reduce((s, d) => s + d.markdown.split(/\s+/).filter(Boolean).length, 0),
    });

    // ── 2. Themes (detail >= 3) ──
    if (aiGraph?.themes && detail >= 3) {
      aiGraph.themes.forEach((theme, i) => {
        const tid = `theme:${i}`;
        addNode(tid, "themeTag", { label: theme });
        elkEdges.push({ id: `e-summary-${tid}`, sources: ["analysis:summary"], targets: [tid] });
        edges.push({ id: `e-summary-${tid}`, source: "analysis:summary", target: tid, type: "default", style: { stroke: "#60a5fa", strokeWidth: 1.5, opacity: 0.3 } });
      });
    }
  }

  // ── 3. Documents ──
  docs.forEach((doc, i) => {
    const nid = `doc:${doc.id}`;
    const wc = doc.markdown.split(/\s+/).filter(Boolean).length;
    addNode(nid, "documentCard", {
      title: doc.title || "Untitled", preview: getPreview(doc.markdown), wordCount: wc,
      readingTime: Math.max(1, Math.ceil(wc / 200)), index: i + 1, total: docs.length,
      docId: doc.id, headingCount: (doc.markdown.match(/^#{1,3}\s+/gm) || []).length,
      hasCode: /```\w+/.test(doc.markdown), isSelected: selectedDocId === doc.id,
    });
    if (hasSummary && aiGraph?.themes && detail >= 3) {
      const tid = `theme:${i % aiGraph.themes.length}`;
      if (nodeSet.has(tid)) {
        elkEdges.push({ id: `e-${tid}-${nid}`, sources: [tid], targets: [nid] });
        edges.push({ id: `e-${tid}-${nid}`, source: tid, target: nid, type: "default", style: { stroke: "#60a5fa", strokeWidth: 1, opacity: 0.2 } });
      }
    }
  });

  // ── 4. Concepts (detail >= 4) ──
  if (aiGraph && detail >= 4) {
    const conceptNodes = aiGraph.nodes.filter(n => n.type !== "document");
    const showNodes = detail >= 5 ? conceptNodes : conceptNodes.sort((a, b) => b.weight - a.weight).slice(0, 6);
    for (const n of showNodes) {
      addNode(n.id, "conceptTag", { label: n.label, type: n.type, weight: n.weight });
    }

    for (const e of aiGraph.edges) {
      if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue;
      const isDocToDoc = e.source.startsWith("doc:") && e.target.startsWith("doc:");
      const edgeColor = isDocToDoc ? "#60a5fa" : (TYPE_COLORS[e.type]?.border || "var(--accent)");
      const edgeStyle = {
        stroke: edgeColor, strokeWidth: Math.min(2.5, Math.max(1, e.weight * 0.6)),
        opacity: isDocToDoc ? 0.35 : 0.2, ...(isDocToDoc ? { strokeDasharray: "6,4" } : {}),
      };

      if (e.label) {
        const labelId = `label-${e.source}-${e.target}`;
        addNode(labelId, "edgeLabel", { label: e.label, color: edgeColor });
        elkEdges.push({ id: `ai-${e.source}-${labelId}`, sources: [e.source], targets: [labelId] });
        elkEdges.push({ id: `ai-${labelId}-${e.target}`, sources: [labelId], targets: [e.target] });
        edges.push({ id: `ai-${e.source}-${labelId}`, source: e.source, target: labelId, type: "default", style: edgeStyle });
        edges.push({ id: `ai-${labelId}-${e.target}`, source: labelId, target: e.target, type: "default", style: edgeStyle });
      } else {
        elkEdges.push({ id: `ai-${e.source}-${e.target}`, sources: [e.source], targets: [e.target] });
        edges.push({ id: `ai-${e.source}-${e.target}`, source: e.source, target: e.target, type: "default", style: edgeStyle });
      }
    }

    // Remove orphan concept nodes (no path to document)
    const docNodeIds = new Set(docs.map(d => `doc:${d.id}`));
    function hasDocPath(nodeId: string, visited = new Set<string>()): boolean {
      if (docNodeIds.has(nodeId)) return true;
      visited.add(nodeId);
      for (const e of edges) {
        const nb = e.source === nodeId ? e.target : (e.target === nodeId ? e.source : null);
        if (nb && !visited.has(nb) && hasDocPath(nb, visited)) return true;
      }
      return false;
    }
    const orphanIds = new Set<string>();
    for (const n of showNodes) { if (!hasDocPath(n.id)) orphanIds.add(n.id); }
    if (orphanIds.size > 0) {
      nodes.splice(0, nodes.length, ...nodes.filter(n => !orphanIds.has(n.id)));
      edges.splice(0, edges.length, ...edges.filter(e => !orphanIds.has(e.source) && !orphanIds.has(e.target)));
      elkNodes.splice(0, elkNodes.length, ...elkNodes.filter((n: any) => !orphanIds.has(n.id)));
      elkEdges.splice(0, elkEdges.length, ...elkEdges.filter((e: any) => !orphanIds.has(e.sources[0]) && !orphanIds.has(e.targets[0])));
    }
  }

  // Run ELK layout
  try {
    const elkGraph = await elk.layout({
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.layered.spacing.nodeNodeBetweenLayers": "50",
        "elk.layered.spacing.edgeNodeBetweenLayers": "30",
        "elk.spacing.nodeNode": "40",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.padding": "[top=30,left=30,bottom=30,right=30]",
        "elk.edgeRouting": "SPLINES",
      },
      children: elkNodes,
      edges: elkEdges,
    });

    const posMap = new Map<string, { x: number; y: number }>();
    for (const child of elkGraph.children || []) {
      posMap.set(child.id, { x: child.x || 0, y: child.y || 0 });
    }

    for (const node of nodes) {
      const pos = posMap.get(node.id);
      if (pos) node.position = pos;
    }
  } catch (err) {
    console.error("ELK layout failed:", err);
    // Fallback: simple grid
    nodes.forEach((n, i) => { n.position = { x: (i % 4) * 320, y: Math.floor(i / 4) * 180 }; });
  }

  return { nodes, edges };
}

function getPreview(md: string): string {
  return md.replace(/^#{1,6}\s+/gm, "").replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`[^`]+`/g, "").replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1").replace(/^[>\-*+]\s*/gm, "")
    .replace(/^\|.*\|$/gm, "").split("\n").map(l => l.trim())
    .filter(l => l.length > 0).slice(0, 3).join(" · ");
}

// ─── Summary Node ───

function SummaryNode({ data }: { data: any }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{
      width: 300, background: "var(--surface)",
      border: "1.5px solid #60a5fa",
      boxShadow: "0 4px 20px rgba(96,165,250,0.12)",
    }}>
      <Handle type="source" position={Position.Right} style={{ background: "#60a5fa", width: 8, height: 8, border: "2px solid var(--surface)" }} />

      <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(96,165,250,0.08)", borderBottom: "1px solid var(--border-dim)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span className="text-[11px] font-semibold" style={{ color: "#60a5fa" }}>Bundle Analysis</span>
        <span className="text-[9px] ml-auto px-1.5 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>
          {data.docCount} docs · {data.totalWords.toLocaleString()} words
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        {data.summary && (
          <p className="text-[10px] leading-[1.6]" style={{ color: "var(--text-secondary)" }}>{data.summary}</p>
        )}
        {data.insights?.length > 0 && (
          <div className="space-y-1">
            {data.insights.slice(0, 3).map((ins: string, i: number) => (
              <div key={i} className="text-[9px] leading-[1.5] flex gap-1.5" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "#60a5fa", flexShrink: 0 }}>→</span>
                <span>{ins}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Theme Tag Node ───

function ThemeTagNode({ data }: { data: any }) {
  return (
    <div className="rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{
      background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.3)",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: "#60a5fa", width: 5, height: 5, border: "none" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#60a5fa", width: 5, height: 5, border: "none" }} />
      <span className="text-[10px] font-medium" style={{ color: "#60a5fa" }}>{data.label}</span>
    </div>
  );
}

// ─── Document Card Node ───

function DocumentCardNode({ data }: { data: any }) {
  const isSelected = data.isSelected;
  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{
      width: 270, background: isSelected ? "var(--accent-dim)" : "var(--surface)",
      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
      boxShadow: isSelected ? "0 0 0 3px rgba(251,146,60,0.15), 0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.2)",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: "var(--accent)", width: 8, height: 8, border: "2px solid var(--surface)" }} />
      <Handle type="source" position={Position.Right} style={{ background: "var(--accent)", width: 8, height: 8, border: "2px solid var(--surface)" }} />

      <div className="flex" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <div style={{ width: 4, background: "var(--accent)", flexShrink: 0 }} />
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold w-5 h-5 flex items-center justify-center rounded-md" style={{ background: "var(--accent)", color: "#fff" }}>{data.index}</span>
          <span className="text-[12px] font-semibold truncate flex-1" style={{ color: "var(--text-primary)" }}>{data.title}</span>
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="text-[10px] leading-[1.5] line-clamp-2" style={{ color: "var(--text-muted)" }}>{data.preview || "Empty"}</p>
      </div>

      <div className="px-3 py-1.5 flex items-center gap-1.5 flex-wrap" style={{ borderTop: "1px solid var(--border-dim)" }}>
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>{data.wordCount.toLocaleString()} words</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>~{data.readingTime}m</span>
        {data.hasCode && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>Code</span>}
      </div>
    </div>
  );
}

// ─── Concept Tag Node ───

function ConceptTagNode({ data }: { data: any }) {
  const style = TYPE_COLORS[data.type] || TYPE_COLORS.concept;
  const icon = data.type === "entity" ? "◆" : data.type === "tag" ? "#" : "○";
  return (
    <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{
      background: style.bg, border: `1.5px solid ${style.border}`, maxWidth: 180,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: style.border, width: 5, height: 5, border: "none" }} />
      <Handle type="source" position={Position.Right} style={{ background: style.border, width: 5, height: 5, border: "none" }} />
      <span className="text-[9px]" style={{ color: style.text, opacity: 0.5 }}>{icon}</span>
      <span className="text-[10px] font-medium truncate" style={{ color: style.text }}>{data.label}</span>
    </div>
  );
}

// ─── Edge Label Node (inline with edges so dagre reserves space) ───

function EdgeLabelNode({ data }: { data: any }) {
  return (
    <div className="flex items-center justify-center" style={{ minWidth: 40 }}>
      <Handle type="target" position={Position.Left} style={{ background: "transparent", width: 1, height: 1, border: "none" }} />
      <Handle type="source" position={Position.Right} style={{ background: "transparent", width: 1, height: 1, border: "none" }} />
      <span className="text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color: data.color || "var(--text-faint)", background: "var(--surface)", border: `1px solid ${data.color || "var(--border)"}30` }}>
        {data.label}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  summaryNode: SummaryNode,
  themeTag: ThemeTagNode,
  documentCard: DocumentCardNode,
  conceptTag: ConceptTagNode,
  edgeLabel: EdgeLabelNode,
};

// ─── Main ───

export default function BundleCanvas({ documents, aiGraph, isAnalyzing, selectedDocId, onDocumentClick, onCopyContext, onRegenerate, className = "" }: BundleCanvasProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [detail, setDetail] = useState<DetailLevel>(aiGraph ? 5 : 1);

  useEffect(() => {
    const detect = () => setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    buildLayout(documents, aiGraph, selectedDocId, detail).then(({ nodes: n, edges: e }) => {
      setNodes(n);
      setEdges(e);
    });
  }, [documents, aiGraph, selectedDocId, detail, setNodes, setEdges]);

  const [focusedNode, setFocusedNode] = useState<string | null>(null);

  // Compute connected nodes (traverse through label nodes for full chain)
  const connectedSet = useMemo(() => {
    if (!focusedNode) return null;
    const connected = new Set<string>();
    const queue = [focusedNode];
    connected.add(focusedNode);
    // BFS through edges, following label nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of edges) {
        const neighbor = e.source === current ? e.target : (e.target === current ? e.source : null);
        if (neighbor && !connected.has(neighbor)) {
          connected.add(neighbor);
          // Continue traversal through label/theme nodes (small intermediaries)
          if (neighbor.startsWith("label-") || neighbor.startsWith("theme:")) {
            queue.push(neighbor);
          }
        }
      }
    }
    return connected;
  }, [focusedNode, edges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    // Toggle focus
    setFocusedNode(prev => prev === node.id ? null : node.id);
    // Pass full node ID to parent (handles doc, concept, summary, theme)
    if (onDocumentClick && node.type !== "edgeLabel") {
      onDocumentClick(node.id);
    }
  }, [onDocumentClick]);

  const onPaneClick = useCallback(() => {
    setFocusedNode(null);
  }, []);

  const totalWords = documents.reduce((s, d) => s + d.markdown.split(/\s+/).filter(Boolean).length, 0);

  // Mark nodes/edges with CSS classes based on focus
  const styledNodes = useMemo(() => {
    if (!connectedSet) return nodes;
    return nodes.map(n => ({
      ...n,
      className: connectedSet.has(n.id) ? "bundle-node-active" : "bundle-node-dim",
    }));
  }, [nodes, connectedSet]);

  const styledEdges = useMemo(() => {
    if (!connectedSet) return edges;
    return edges.map(e => {
      const isActive = connectedSet.has(e.source) && connectedSet.has(e.target);
      return {
        ...e,
        style: { ...e.style, opacity: isActive ? 0.7 : 0.04, strokeWidth: isActive ? 2.5 : 1 },
      };
    });
  }, [edges, connectedSet]);

  return (
    <div className={`relative ${className}`} style={{ width: "100%", height: "100%" }}>
      <style>{`
        .react-flow__node { transition: transform 0.4s ease, opacity 0.3s ease; }
        .react-flow__edge { transition: opacity 0.3s ease; }
        .bundle-node-dim { opacity: 0.12 !important; }
        .bundle-node-active { opacity: 1 !important; }
        @keyframes nodeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .react-flow__node[data-id^="concept"] { animation: nodeIn 0.3s ease; }
        .react-flow__node[data-id^="theme"] { animation: nodeIn 0.25s ease; }
        .react-flow__node[data-id^="label"] { animation: nodeIn 0.2s ease; }
      `}</style>
      <ReactFlow
        nodes={styledNodes} edges={styledEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick} onPaneClick={onPaneClick} nodeTypes={nodeTypes} fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        onInit={(i) => { setTimeout(() => i.fitView({ padding: 0.3, maxZoom: 1 }), 150); }}
        minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }}
        style={{ background: "var(--background)" }}
      >
        <Background color={theme === "dark" ? "#151518" : "#ededea"} gap={24} size={1} />
        <Controls position="top-right" showInteractive={false} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
        <MiniMap position="bottom-right" pannable zoomable
          nodeColor={(n) => {
            if (n.type === "summaryNode") return "#60a5fa";
            if (n.type === "themeTag") return "#60a5fa";
            if (n.type === "documentCard") return "#fb923c";
            return TYPE_COLORS[(n.data as any)?.type]?.border || "#fb923c";
          }}
          maskColor={theme === "dark" ? "rgba(9,9,11,0.85)" : "rgba(250,249,247,0.85)"}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
      </ReactFlow>

      {/* Top bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button onClick={onCopyContext} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium hover:brightness-110"
          style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px rgba(251,146,60,0.3)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy as Context
        </button>
        {/* Detail slider */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>Detail</span>
          <input
            type="range" min={1} max={5} value={detail}
            onChange={(e) => setDetail(Number(e.target.value) as DetailLevel)}
            className="w-16 h-1 accent-[#fb923c]"
            style={{ cursor: "pointer" }}
          />
          <span className="text-[9px] min-w-[70px]" style={{ color: "var(--accent)" }}>{DETAIL_LABELS[detail]}</span>
        </div>

        {/* Regenerate */}
        {onRegenerate && !isAnalyzing && aiGraph && (
          <button onClick={onRegenerate} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium hover:bg-[var(--toggle-bg)]"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Regenerate
          </button>
        )}

        {isAnalyzing && (
          <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(251,146,60,0.15)", color: "var(--accent)" }}>
            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" rx="2" fill="#60a5fa"/></svg><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Analysis</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded" style={{ background: "#fb923c" }} /><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Documents</span></div>
        <div className="flex items-center gap-1"><span className="text-[9px]" style={{ color: "#fb923c" }}>○</span><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Concepts</span></div>
        <div className="flex items-center gap-1"><span className="text-[9px]" style={{ color: "#4ade80" }}>◆</span><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Entities</span></div>
        <div className="flex items-center gap-1"><span className="text-[9px]" style={{ color: "#a78bfa" }}>#</span><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Tags</span></div>
      </div>
    </div>
  );
}
