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

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const shapeCSS: Record<CanvasNode["shape"], React.CSSProperties> = {
  round: { borderRadius: "20px" },
  square: { borderRadius: "4px" },
  circle: { borderRadius: "50%", width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" },
  diamond: { transform: "rotate(45deg)", borderRadius: "4px", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" },
};

// SVG mini icons for shape selector
function ShapeIcon({ shape, size = 14 }: { shape: CanvasNode["shape"]; size?: number }) {
  const s = size;
  const c = "var(--accent)";
  switch (shape) {
    case "round":
      return <svg width={s} height={s} viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="5" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
    case "square":
      return <svg width={s} height={s} viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
    case "circle":
      return <svg width={s} height={s} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
    case "diamond":
      return <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
  }
}

export default function MdCanvas({
  onGenerate,
  onCancel,
  initialMermaid,
}: {
  onGenerate: (md: string) => void;
  onCancel?: () => void;
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
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const justSelectedRef = useRef(false);
  const [showImport, setShowImport] = useState(false);
  const [rawCodeMode, setRawCodeMode] = useState(false);
  const [rawCode, setRawCode] = useState("");
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
    const codeToRender = rawCodeMode ? rawCode : liveCode;
    if (!previewPanelRef.current || !codeToRender || !showCode) return;
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
        const { svg } = await mermaid.render(id, codeToRender);
        container.innerHTML = svg;
      } catch {
        container.innerHTML = `<span style="color:var(--text-faint);font-size:11px">Invalid diagram</span>`;
      }
    });
  }, [liveCode, rawCode, rawCodeMode, showCode]);

  // Load initial mermaid code
  useEffect(() => {
    if (initialMermaid) {
      const result = mermaidToCanvas(initialMermaid);
      if (result && result.nodes.length > 0) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setDirection(result.direction === "TD" || result.direction === "TB" ? "TD" : "LR");
        nextId = result.nodes.length + 1;
        setRawCodeMode(false);
      } else {
        // Can't parse as flowchart (sequence, pie, etc) → raw code edit mode
        setRawCodeMode(true);
        setRawCode(initialMermaid);
        setNodes([]);
        setEdges([]);
      }
    } else {
      setNodes([]);
      setEdges([]);
      setRawCodeMode(false);
      setRawCode("");
      nextId = 1;
    }
    setSelectedId(null);
    setEditingId(null);
    setEditingEdge(null);
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
    // Delete multi-selected nodes
    if (selectedIds.size > 0) {
      setNodes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setEdges((prev) => prev.filter((e) => !selectedIds.has(e.from) && !selectedIds.has(e.to)));
      setSelectedIds(new Set());
      return;
    }
    // Delete single selected node
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.from !== selectedId && e.to !== selectedId));
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    const newId = genId();
    setNodes((prev) => [...prev, { ...node, id: newId, x: node.x + 30, y: node.y + 30 }]);
    setSelectedId(newId);
  }, [selectedId, nodes]);

  const deleteEdge = useCallback((index: number) => {
    setEdges((prev) => prev.filter((_, i) => i !== index));
    setEditingEdge(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingId || editingEdge !== null) return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected, editingId, editingEdge]);

  const handleGenerate = useCallback(() => {
    if (rawCodeMode) {
      const md = wrapInCodeBlock(rawCode);
      onGenerate(md);
    } else {
      const mermaidCode = canvasToMermaid(nodes, edges, direction);
      const md = wrapInCodeBlock(mermaidCode);
      onGenerate(md);
    }
  }, [nodes, edges, direction, onGenerate, rawCodeMode, rawCode]);

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
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-2 py-1 rounded-md font-mono text-[11px]"
            style={{
              background: showGuide ? "var(--accent-dim)" : "var(--toggle-bg)",
              color: showGuide ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            Help
          </button>
          {!rawCodeMode && (
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
          )}
        </div>
        <div className="flex items-center gap-2">
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
          {nodes.length > 0 && (
            <button
              onClick={() => { setNodes([]); setEdges([]); setSelectedId(null); nextId = 1; }}
              className="px-2 py-1 rounded-md font-mono text-[11px]"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
            >
              Clear
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-md font-mono text-[11px]"
              style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={nodes.length === 0 && !rawCodeMode}
            className="px-3 py-1 rounded-md font-mono text-[11px] font-semibold"
            style={{
              background: (nodes.length > 0 || rawCodeMode) ? "var(--accent)" : "var(--toggle-bg)",
              color: (nodes.length > 0 || rawCodeMode) ? "#000" : "var(--text-muted)",
            }}
          >
            Apply
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
              <p><span style={{ color: "var(--accent)" }}>Cmd+D</span> to duplicate selected</p>
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

      {/* Raw code mode for non-flowchart diagrams (sequence, pie, etc) */}
      {rawCodeMode ? (
        <div className="flex-1 flex flex-col">
          <div
            className="flex items-center px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
          >
            Code Editor (sequence, pie, gantt, etc.)
          </div>
          <textarea
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            className="flex-1 p-4 bg-transparent font-mono text-[13px] resize-none outline-none leading-relaxed"
            style={{ color: "var(--editor-text)" }}
            spellCheck={false}
          />
        </div>
      ) : (
      /* Canvas */
      <div
        ref={canvasRef}
        className={`${showCode && nodes.length > 0 ? "w-2/3" : "w-full"} relative overflow-auto cursor-crosshair select-none`}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseDown={(e) => {
          // Start selection box if clicking on empty canvas
          if ((e.target as HTMLElement).closest(".canvas-node") || (e.target as HTMLElement).closest(".edge-label")) return;
          if (e.button !== 0) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }}
        onMouseMove={(e) => {
          handleMouseMove(e);
          // Update selection box
          if (selectionBox && !dragState && !connectState) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            setSelectionBox((prev) => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null);
          }
        }}
        onMouseUp={(e) => {
          handleMouseUp(e);
          // Finish selection box
          if (selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minY = Math.min(selectionBox.startY, selectionBox.endY);
            const maxY = Math.max(selectionBox.startY, selectionBox.endY);
            // Only select if box is bigger than 10px (not just a click)
            if (maxX - minX > 10 && maxY - minY > 10) {
              const selected = new Set<string>();
              nodes.forEach((n) => {
                const cx = n.x + 60;
                const cy = n.y + 20;
                if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                  selected.add(n.id);
                }
              });
              setSelectedIds(selected);
              if (selected.size > 0) {
                setSelectedId(null);
                justSelectedRef.current = true;
                setTimeout(() => { justSelectedRef.current = false; }, 100);
              }
            }
            setSelectionBox(null);
          }
        }}
        onClick={(e) => {
          if (justSelectedRef.current) return; // skip click after drag selection
          if (!(e.target as HTMLElement).closest(".canvas-node") && !(e.target as HTMLElement).closest(".edge-label")) {
            setSelectedId(null);
            setSelectedIds(new Set());
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
            <marker id="arr-start" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto-start-reverse">
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
                  stroke="var(--text-faint)"
                  strokeWidth={edge.style === "thick" ? 3 : 1.5}
                  strokeDasharray={edge.style === "dotted" ? "6 4" : undefined}
                  fill="none"
                  markerEnd={edge.direction === "none" ? undefined : "url(#arr)"}
                  markerStart={edge.direction === "both" ? "url(#arr-start)" : undefined}
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

        {/* Edge editor (label + style) */}
        {editingEdge !== null && edges[editingEdge] && (() => {
          const edge = edges[editingEdge];
          const from = getNodeCenter(edge.from);
          const to = getNodeCenter(edge.to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <div
              className="edge-label absolute z-20 flex flex-col gap-1.5"
              style={{ left: midX - 100, top: midY - 22, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
            >
              <div className="flex gap-1 items-center">
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
                  className="px-2 py-1.5 text-[11px] font-mono rounded outline-none w-28"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); deleteEdge(editingEdge); }}
                  className="px-1.5 py-1.5 rounded text-[11px] font-bold"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
                >
                  ×
                </button>
              </div>
              {/* Style + Direction row */}
              <div className="flex gap-1">
                <span className="text-[9px] py-1" style={{ color: "var(--text-faint)" }}>Line:</span>
                {(["solid", "dotted", "thick"] as const).map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setEdges((prev) => prev.map((ed, idx) => idx === editingEdge ? { ...ed, style: s } : ed));
                    }}
                    className="px-2 py-1 rounded text-[11px]"
                    style={{
                      background: (edge.style || "solid") === s ? "var(--accent)" : "var(--background)",
                      color: (edge.style || "solid") === s ? "#000" : "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {s === "solid" ? "━" : s === "dotted" ? "┄" : "┃"}
                  </button>
                ))}
                <span className="text-[9px] py-1 ml-1" style={{ color: "var(--text-faint)" }}>Dir:</span>
                {(["forward", "both", "none"] as const).map((d) => (
                  <button
                    key={d}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setEdges((prev) => prev.map((ed, idx) => idx === editingEdge ? { ...ed, direction: d } : ed));
                    }}
                    className="px-2 py-1 rounded text-[11px]"
                    style={{
                      background: (edge.direction || "forward") === d ? "var(--accent)" : "var(--background)",
                      color: (edge.direction || "forward") === d ? "#000" : "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {d === "forward" ? "→" : d === "both" ? "⇄" : "―"}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedId === node.id || selectedIds.has(node.id);
          return (
          <div
            key={node.id}
            className="canvas-node absolute group"
            style={{ left: node.x, top: node.y, zIndex: isSelected ? 10 : 2, minWidth: 120 }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingId(node.id); }}
          >
            {/* Shape toggle — outside node, top-right */}
            <button
              onClick={(e) => { e.stopPropagation(); cycleShape(node.id); }}
              className="absolute opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full z-10"
              style={{ top: -10, right: -10, background: "var(--surface)", border: "1px solid var(--border)" }}
              title="Click to change shape"
            >
              <ShapeIcon shape={node.shape} size={12} />
            </button>
            <div
              className="px-3 py-2 text-sm transition-colors"
              style={{
                background: "var(--surface)",
                border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                boxShadow: isSelected
                  ? "0 0 0 2px var(--accent-dim), 0 4px 12px rgba(0,0,0,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.2)",
                ...shapeCSS[node.shape],
              }}
            >
              {/* Diamond: counter-rotate content */}
              <div style={node.shape === "diamond" ? { transform: "rotate(-45deg)" } : {}}>
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
          );
        })}

        {/* Empty state */}
        {/* Selection box */}
        {selectionBox && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
              border: "1px dashed var(--accent)",
              background: "var(--accent-dim)",
              borderRadius: 4,
              zIndex: 20,
            }}
          />
        )}

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
      )}{/* end rawCodeMode conditional */}

      {/* Code + Preview panel */}
      {showCode && (nodes.length > 0 || rawCodeMode) && (
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
              {rawCodeMode ? rawCode : liveCode}
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
              {(rawCodeMode ? rawCode : liveCode) ? (
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
