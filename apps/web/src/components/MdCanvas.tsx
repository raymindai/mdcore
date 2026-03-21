"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  type CanvasNode,
  type CanvasEdge,
  canvasToMermaid,
  mermaidToCanvas,
  wrapInCodeBlock,
} from "@/lib/canvas-to-mermaid";

let nextId = 1;
function genId() {
  return `n${nextId++}`;
}

type Direction = "LR" | "TD";

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  fromId: string;
  mouseX: number;
  mouseY: number;
}

const shapeCSS: Record<CanvasNode["shape"], React.CSSProperties> = {
  round: { borderRadius: "20px" },
  square: { borderRadius: "4px" },
  circle: { borderRadius: "50%", minWidth: "80px", minHeight: "80px", display: "flex", alignItems: "center", justifyContent: "center" },
  diamond: { transform: "rotate(45deg)", borderRadius: "4px", minWidth: "70px", minHeight: "70px", display: "flex", alignItems: "center", justifyContent: "center" },
};

const shapeLabels: Record<CanvasNode["shape"], string> = {
  round: "()",
  square: "[]",
  circle: "(())",
  diamond: "{}",
};

export default function MdCanvas({
  onGenerate,
  initialMermaid,
}: {
  onGenerate: (md: string) => void;
  initialMermaid?: string;
}) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [direction, setDirection] = useState<Direction>("LR");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [showCode, setShowCode] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);

  // Live Mermaid code preview
  const liveCode = useMemo(
    () => (nodes.length > 0 ? canvasToMermaid(nodes, edges, direction) : ""),
    [nodes, edges, direction]
  );

  // Render live Mermaid preview
  useEffect(() => {
    if (!previewPanelRef.current || !liveCode || !showCode) return;
    const container = previewPanelRef.current.querySelector(".mermaid-preview-render");
    if (!container) return;

    import("mermaid").then(async (mermaidModule) => {
      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "dark",
        themeVariables: {
          primaryColor: "#fb923c",
          primaryTextColor: "#fafafa",
          primaryBorderColor: "#ea580c",
          lineColor: "#71717a",
          secondaryColor: "#27272a",
          tertiaryColor: "#18181b",
          background: "#09090b",
          mainBkg: "#27272a",
          nodeBorder: "#3f3f46",
          clusterBkg: "#18181b",
          titleColor: "#fafafa",
          edgeLabelBackground: "#18181b",
        },
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
      });

      try {
        const id = `mermaid-preview-${Date.now()}`;
        const { svg } = await mermaid.render(id, liveCode);
        container.innerHTML = svg;
      } catch {
        container.innerHTML = `<span style="color:var(--text-faint);font-size:11px">Invalid diagram</span>`;
      }
    });
  }, [liveCode, showCode]);

  // Load initial mermaid code
  useEffect(() => {
    if (initialMermaid) {
      const result = mermaidToCanvas(initialMermaid);
      if (result) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setDirection(result.direction === "TD" || result.direction === "TB" ? "TD" : "LR");
        nextId = result.nodes.length + 1;
      }
    }
  }, [initialMermaid]);

  // Add node on double-click canvas
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".canvas-node")) return;
      if ((e.target as HTMLElement).closest(".edge-label")) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const id = genId();
      const newNode: CanvasNode = {
        id,
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 18,
        text: "",
        shape: "round",
      };
      setNodes((prev) => [...prev, newNode]);
      setEditingId(id);
      setSelectedId(id);
    },
    []
  );

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.stopPropagation();
      setSelectedId(nodeId);

      if (e.altKey) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        setConnectState({
          fromId: nodeId,
          mouseX: e.clientX - rect.left,
          mouseY: e.clientY - rect.top,
        });
        return;
      }

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragState({
        nodeId,
        offsetX: e.clientX - rect.left - node.x,
        offsetY: e.clientY - rect.top - node.y,
      });
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragState) {
        const x = e.clientX - rect.left - dragState.offsetX;
        const y = e.clientY - rect.top - dragState.offsetY;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragState.nodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n
          )
        );
      }

      if (connectState) {
        setConnectState((prev) =>
          prev ? { ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : null
        );
      }
    },
    [dragState, connectState]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (connectState) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const target = nodes.find(
            (n) =>
              n.id !== connectState.fromId &&
              mx >= n.x - 10 &&
              mx <= n.x + 150 &&
              my >= n.y - 10 &&
              my <= n.y + 50
          );
          if (target) {
            const exists = edges.some(
              (ed) => ed.from === connectState.fromId && ed.to === target.id
            );
            if (!exists) {
              setEdges((prev) => [...prev, { from: connectState.fromId, to: target.id }]);
            }
          }
        }
        setConnectState(null);
      }
      setDragState(null);
    },
    [connectState, nodes, edges]
  );

  const handleTextChange = useCallback((nodeId: string, text: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, text } : n)));
  }, []);

  const cycleShape = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const shapes: CanvasNode["shape"][] = ["round", "square", "circle", "diamond"];
        const idx = shapes.indexOf(n.shape);
        return { ...n, shape: shapes[(idx + 1) % shapes.length] };
      })
    );
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.from !== selectedId && e.to !== selectedId));
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId]);

  const deleteEdge = useCallback((index: number) => {
    setEdges((prev) => prev.filter((_, i) => i !== index));
    setEditingEdge(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingId || editingEdge !== null) return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, editingId, editingEdge]);

  const handleGenerate = useCallback(() => {
    const mermaidCode = canvasToMermaid(nodes, edges, direction);
    const md = wrapInCodeBlock(mermaidCode);
    onGenerate(md);
  }, [nodes, edges, direction, onGenerate]);

  const handleImport = useCallback(() => {
    // Strip code fences if present
    let code = importCode.trim();
    code = code.replace(/^```mermaid\n?/, "").replace(/\n?```$/, "");

    const result = mermaidToCanvas(code);
    if (result) {
      setNodes(result.nodes);
      setEdges(result.edges);
      setDirection(result.direction === "TD" || result.direction === "TB" ? "TD" : "LR");
      nextId = result.nodes.length + 1;
      setShowImport(false);
      setImportCode("");
    }
  }, [importCode]);

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 70, y: node.y + 20 };
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2 text-xs flex-wrap gap-2"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Mermaid Editor
          </span>
          <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["LR", "TD"] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className="px-2 py-0.5 text-[10px] font-mono"
                style={{
                  background: direction === d ? "var(--accent-dim)" : "transparent",
                  color: direction === d ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {d === "LR" ? "→" : "↓"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-2 py-1 rounded-md font-mono text-[11px]"
            style={{
              background: showGuide ? "var(--accent-dim)" : "var(--toggle-bg)",
              color: showGuide ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            ?
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-2 py-1 rounded-md font-mono text-[11px]"
            style={{
              background: showCode ? "var(--accent-dim)" : "var(--toggle-bg)",
              color: showCode ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            Code
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-2 py-1 rounded-md font-mono text-[11px]"
            style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
          >
            Import
          </button>
          <span className="font-mono text-[10px]" style={{ color: "var(--text-faint)" }}>
            {nodes.length}n · {edges.length}e
          </span>
          <button
            onClick={handleGenerate}
            disabled={nodes.length === 0}
            className="px-3 py-1 rounded-md font-mono text-[11px] font-semibold"
            style={{
              background: nodes.length > 0 ? "var(--accent)" : "var(--toggle-bg)",
              color: nodes.length > 0 ? "#000" : "var(--text-muted)",
            }}
          >
            Generate Mermaid
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div
          className="px-4 py-3 flex gap-2"
          style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--surface)" }}
        >
          <textarea
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="Paste Mermaid code here (graph LR; A --> B)"
            className="flex-1 bg-transparent text-xs font-mono outline-none resize-none"
            style={{ color: "var(--text-primary)", minHeight: 48 }}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleImport}
              className="px-3 py-1 rounded text-[11px] font-mono"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              Load
            </button>
            <button
              onClick={() => { setShowImport(false); setImportCode(""); }}
              className="px-3 py-1 rounded text-[11px] font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Guide panel */}
      {showGuide && (
        <div
          className="px-4 py-3 text-xs overflow-auto"
          style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--surface)", maxHeight: 200 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ color: "var(--text-tertiary)" }}>
            <div>
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Create</p>
              <p><span style={{ color: "var(--accent)" }}>Double-click</span> canvas to add a node</p>
              <p><span style={{ color: "var(--accent)" }}>Click shape button</span> ()/[]/(()/{"{}"}{")"} to change shape</p>
              <p><span style={{ color: "var(--accent)" }}>Double-click node</span> to edit text</p>
            </div>
            <div>
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Connect</p>
              <p><span style={{ color: "var(--accent)" }}>Alt + drag</span> from one node to another</p>
              <p><span style={{ color: "var(--accent)" }}>Double-click edge</span> to add a label</p>
              <p><span style={{ color: "var(--accent)" }}>Delete/Backspace</span> to remove selected</p>
            </div>
            <div>
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Shapes → Mermaid</p>
              <p><span style={{ color: "var(--accent)" }}>()</span> Round = default node</p>
              <p><span style={{ color: "var(--accent)" }}>[]</span> Square = process/action</p>
              <p><span style={{ color: "var(--accent)" }}>(())</span> Circle = start/end</p>
              <p><span style={{ color: "var(--accent)" }}>{"{}"}</span> Diamond = decision/condition</p>
            </div>
          </div>
        </div>
      )}

      {/* Main area: canvas + code panel */}
      <div className="flex flex-1 min-h-0">

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`${showCode && nodes.length > 0 ? "w-2/3" : "w-full"} relative overflow-auto cursor-crosshair select-none`}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest(".canvas-node") && !(e.target as HTMLElement).closest(".edge-label")) {
            setSelectedId(null);
            setEditingId(null);
            setEditingEdge(null);
          }
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--border-dim) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Edges SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--text-faint)" />
            </marker>
            <marker id="arr-accent" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const from = getNodeCenter(edge.from);
            const to = getNodeCenter(edge.to);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            // Curved path with control point offset
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const isHorizontalish = Math.abs(dx) > Math.abs(dy);
            const cx1 = isHorizontalish ? from.x + dx * 0.5 : from.x;
            const cy1 = isHorizontalish ? from.y : from.y + dy * 0.5;
            const cx2 = isHorizontalish ? to.x - dx * 0.5 : to.x;
            const cy2 = isHorizontalish ? to.y : to.y - dy * 0.5;
            const pathD = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;

            return (
              <g key={i}>
                <path
                  d={pathD}
                  stroke="var(--text-faint)" strokeWidth={1.5}
                  fill="none"
                  markerEnd="url(#arr)"
                />
                {/* Clickable hit area */}
                <path
                  d={pathD}
                  stroke="transparent" strokeWidth={14}
                  fill="none"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingEdge(i); }}
                />
                {/* Edge label */}
                {edge.label && (
                  <g>
                    <rect
                      x={midX - edge.label.length * 3.5 - 6}
                      y={midY - 18}
                      width={edge.label.length * 7 + 12}
                      height={20}
                      rx={4}
                      fill="var(--surface)"
                      stroke="var(--border)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={midX} y={midY - 5}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize={11}
                      fontFamily="var(--font-geist-mono), monospace"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {connectState && (
            <line
              x1={getNodeCenter(connectState.fromId).x}
              y1={getNodeCenter(connectState.fromId).y}
              x2={connectState.mouseX} y2={connectState.mouseY}
              stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 3"
              markerEnd="url(#arr-accent)"
            />
          )}
        </svg>

        {/* Edge label editor */}
        {editingEdge !== null && edges[editingEdge] && (() => {
          const edge = edges[editingEdge];
          const from = getNodeCenter(edge.from);
          const to = getNodeCenter(edge.to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <div
              className="edge-label absolute z-20 flex gap-1"
              style={{ left: midX - 60, top: midY - 16 }}
            >
              <input
                autoFocus
                value={edge.label || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setEdges((prev) => prev.map((ed, idx) => idx === editingEdge ? { ...ed, label: val } : ed));
                }}
                onBlur={() => setEditingEdge(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") setEditingEdge(null);
                }}
                placeholder="label"
                className="px-2 py-1 text-[11px] font-mono rounded outline-none w-24"
                style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--text-primary)" }}
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); deleteEdge(editingEdge); }}
                className="px-1.5 py-1 rounded text-[10px]"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
              >
                ×
              </button>
            </div>
          );
        })()}

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="canvas-node absolute"
            style={{ left: node.x, top: node.y, zIndex: selectedId === node.id ? 10 : 2, minWidth: 120 }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingId(node.id); }}
          >
            <div
              className="px-3 py-2 text-sm transition-colors"
              style={{
                background: "var(--surface)",
                border: `1.5px solid ${selectedId === node.id ? "var(--accent)" : "var(--border)"}`,
                boxShadow: selectedId === node.id
                  ? "0 0 0 2px var(--accent-dim), 0 4px 12px rgba(0,0,0,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.2)",
                ...shapeCSS[node.shape],
              }}
            >
              {/* Diamond: counter-rotate content */}
              <div style={node.shape === "diamond" ? { transform: "rotate(-45deg)" } : {}}>
                <div className="flex items-center gap-1.5 mb-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); cycleShape(node.id); }}
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
                    title="Change shape: () round, [] square, (()) circle, {} diamond"
                  >
                    {shapeLabels[node.shape]}
                  </button>
                </div>
                {editingId === node.id ? (
                  <input
                    autoFocus
                    value={node.text}
                    onChange={(e) => handleTextChange(node.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingId(null);
                      e.stopPropagation();
                    }}
                    className="w-full bg-transparent outline-none text-xs"
                    style={{ color: "var(--text-primary)", minWidth: 80 }}
                  />
                ) : (
                  <div
                    className="text-xs min-h-[20px] whitespace-nowrap"
                    style={{ color: node.text ? "var(--text-secondary)" : "var(--text-faint)" }}
                  >
                    {node.text || "..."}
                  </div>
                )}
              </div>{/* end diamond rotate wrapper */}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {nodes.length === 0 && !showImport && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="text-4xl opacity-20">🔀</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Double-click anywhere to add a node
            </p>
            <div className="text-xs space-y-1 text-center" style={{ color: "var(--text-faint)" }}>
              <p>Alt + drag between nodes to connect them</p>
              <p>Click <span style={{ color: "var(--accent)" }}>?</span> for the full guide</p>
            </div>
          </div>
        )}
      </div>

      {/* Code + Preview panel */}
      {showCode && nodes.length > 0 && (
        <div
          className="w-1/3 flex flex-col"
          style={{ borderLeft: "1px solid var(--border-dim)" }}
        >
          {/* Code */}
          <div className="flex flex-col h-1/2" style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <div
              className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider shrink-0"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Code</span>
              <span style={{ color: "var(--text-faint)" }}>live</span>
            </div>
            <pre
              className="flex-1 p-3 overflow-auto text-xs font-mono leading-relaxed"
              style={{ color: "var(--text-secondary)", background: "var(--surface)", margin: 0 }}
            >
              {liveCode}
            </pre>
          </div>

          {/* Rendered Preview */}
          <div className="flex flex-col h-1/2">
            <div
              className="flex items-center px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider shrink-0"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Preview</span>
            </div>
            <div className="flex-1 overflow-auto p-3 flex items-center justify-center" ref={previewPanelRef}>
              {liveCode ? (
                <div className="mermaid-preview-render" style={{ textAlign: "center", width: "100%" }} />
              ) : (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>Add nodes to see preview</span>
              )}
            </div>
          </div>
        </div>
      )}

      </div>{/* end main area */}
    </div>
  );
}
