/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import dagre from "dagre";

// ─── Types ───

interface BundleDocument {
  id: string;
  title: string | null;
  markdown: string;
  created_at: string;
  updated_at: string;
}

interface AIGraphData {
  nodes: Array<{ id: string; label: string; type: string; weight: number; documentId?: string }>;
  edges: Array<{ source: string; target: string; label?: string; weight: number; type: string }>;
  clusters: Array<{ id: string; label: string; nodeIds: string[]; color: string }>;
}

interface BundleCanvasProps {
  documents: BundleDocument[];
  aiGraph?: AIGraphData | null;
  isAnalyzing?: boolean;
  onDocumentClick?: (docId: string) => void;
  onCopyContext?: () => void;
  className?: string;
}

// ─── Layout ───

function buildLayout(docs: BundleDocument[], aiGraph?: AIGraphData | null) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 100, marginx: 40, marginy: 40 });

  const docW = 260, docH = 120, conceptW = 150, conceptH = 34;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Document nodes (always present)
  docs.forEach((doc, i) => {
    const nid = `doc:${doc.id}`;
    g.setNode(nid, { width: docW, height: docH });
    nodes.push({
      id: nid, type: "documentCard", position: { x: 0, y: 0 },
      data: {
        title: doc.title || "Untitled",
        preview: getPreview(doc.markdown),
        wordCount: doc.markdown.split(/\s+/).filter(Boolean).length,
        index: i + 1, total: docs.length, docId: doc.id,
      },
    });
  });

  // AI-generated concept nodes + edges
  if (aiGraph) {
    for (const n of aiGraph.nodes) {
      if (n.type === "document") continue; // skip, we already added doc nodes
      g.setNode(n.id, { width: conceptW, height: conceptH });
      nodes.push({
        id: n.id, type: "conceptTag", position: { x: 0, y: 0 },
        data: { label: n.label, type: n.type, weight: n.weight },
      });
    }

    for (const e of aiGraph.edges) {
      const src = e.source;
      const tgt = e.target;
      // Only add if both nodes exist
      if (g.hasNode(src) && g.hasNode(tgt)) {
        g.setEdge(src, tgt);
        edges.push({
          id: `ai-${src}-${tgt}`,
          source: src, target: tgt,
          type: "default",
          label: e.label || undefined,
          style: {
            stroke: e.type === "related" ? "#60a5fa" : "var(--accent)",
            strokeWidth: Math.max(1, e.weight * 0.5),
            opacity: 0.4,
            ...(e.type === "related" ? { strokeDasharray: "5,5" } : {}),
          },
          labelStyle: { fill: "var(--text-muted)", fontSize: 9 },
          labelBgStyle: { fill: "var(--background)", fillOpacity: 0.8 },
          labelBgPadding: [3, 2] as [number, number],
        });
      }
    }
  }

  dagre.layout(g);

  const layouted = nodes.map(node => {
    const pos = g.node(node.id);
    const w = node.type === "documentCard" ? docW : conceptW;
    const h = node.type === "documentCard" ? docH : conceptH;
    return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });

  return { nodes: layouted, edges };
}

function getPreview(md: string): string {
  return md.replace(/^#{1,6}\s+/gm, "").replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`[^`]+`/g, "").replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1").replace(/^[>\-*+]\s*/gm, "")
    .replace(/^\|.*\|$/gm, "").split("\n").map(l => l.trim())
    .filter(l => l.length > 0).slice(0, 2).join(" · ");
}

// ─── Node Components ───

function DocumentCardNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{
      width: 260, background: "var(--surface)",
      border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
      boxShadow: selected ? "0 0 0 3px var(--accent-dim)" : "0 2px 12px rgba(0,0,0,0.25)",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: "var(--accent)", width: 6, height: 6, border: "none", opacity: 0.5 }} />
      <Handle type="source" position={Position.Right} style={{ background: "var(--accent)", width: 6, height: 6, border: "none", opacity: 0.5 }} />
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--accent-dim)" }}>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "#fff" }}>{data.index}</span>
        <span className="text-xs font-semibold truncate flex-1" style={{ color: "var(--text-primary)" }}>{data.title}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>{data.preview || "Empty"}</p>
      </div>
      <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-dim)" }}>
        <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>{data.wordCount.toLocaleString()} words</span>
        <span className="text-[9px] font-medium" style={{ color: "var(--accent)" }}>Click to read →</span>
      </div>
    </div>
  );
}

function ConceptTagNode({ data }: { data: any }) {
  const colors: Record<string, string> = { concept: "#fb923c", entity: "#4ade80", tag: "#a78bfa" };
  const color = colors[data.type] || "#fb923c";
  return (
    <div className="rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{
      background: "var(--background)", border: `1.5px solid ${color}`,
      boxShadow: `0 1px 6px ${color}25`, maxWidth: 180,
    }}>
      <Handle type="target" position={Position.Left} style={{ background: "transparent", width: 1, height: 1, border: "none" }} />
      <Handle type="source" position={Position.Right} style={{ background: "transparent", width: 1, height: 1, border: "none" }} />
      <span className="text-[10px] font-medium truncate" style={{ color }}>{data.label}</span>
    </div>
  );
}

const nodeTypes: NodeTypes = { documentCard: DocumentCardNode, conceptTag: ConceptTagNode };

// ─── Main ───

export default function BundleCanvas({ documents, aiGraph, isAnalyzing, onDocumentClick, onCopyContext, className = "" }: BundleCanvasProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const detect = () => setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const { nodes: initN, edges: initE } = useMemo(() => buildLayout(documents, aiGraph), [documents, aiGraph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initN);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initE);

  useEffect(() => {
    const { nodes: n, edges: e } = buildLayout(documents, aiGraph);
    setNodes(n);
    setEdges(e);
  }, [documents, aiGraph, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === "documentCard" && onDocumentClick && node.data?.docId)
      onDocumentClick(node.data.docId as string);
  }, [onDocumentClick]);

  const totalWords = documents.reduce((s, d) => s + d.markdown.split(/\s+/).filter(Boolean).length, 0);
  const conceptCount = aiGraph?.nodes.filter(n => n.type !== "document").length || 0;

  return (
    <div className={`relative ${className}`} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        onInit={(i) => { setTimeout(() => i.fitView({ padding: 0.3, maxZoom: 1.2 }), 100); }}
        minZoom={0.2} maxZoom={2} proOptions={{ hideAttribution: true }}
        style={{ background: "var(--background)" }}
      >
        <Background color={theme === "dark" ? "#1a1a1f" : "#e8e8e5"} gap={20} size={1} />
        <Controls position="top-right" showInteractive={false} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
        <MiniMap position="bottom-right" nodeColor={(n) => n.type === "documentCard" ? "#fb923c" : "#60a5fa"} maskColor="rgba(9,9,11,0.8)" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
      </ReactFlow>

      {/* Top bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button onClick={onCopyContext} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium hover:brightness-110"
          style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px rgba(251,146,60,0.3)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy as Context
        </button>
        <span className="text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.6)", color: "var(--text-muted)" }}>
          {documents.length} docs · {totalWords.toLocaleString()} words · ~{Math.ceil(totalWords / 200)} min
          {conceptCount > 0 && ` · ${conceptCount} concepts`}
        </span>
        {isAnalyzing && (
          <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(251,146,60,0.15)", color: "var(--accent)" }}>
            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            Analyzing with AI...
          </span>
        )}
      </div>
    </div>
  );
}
