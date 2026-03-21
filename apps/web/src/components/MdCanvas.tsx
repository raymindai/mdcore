"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  CanvasNode,
  CanvasEdge,
  canvasToMarkdown,
} from "@/lib/canvas-to-md";

let nextId = 1;
function genId() {
  return `node-${nextId++}`;
}

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

export default function MdCanvas({
  onGenerate,
}: {
  onGenerate: (md: string) => void;
}) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Add node on double-click canvas
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".canvas-node")) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const id = genId();
      const newNode: CanvasNode = {
        id,
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 18,
        text: "",
        type: "text",
      };
      setNodes((prev) => [...prev, newNode]);
      setEditingId(id);
      setSelectedId(id);
    },
    []
  );

  // Start dragging a node
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      e.stopPropagation();
      setSelectedId(nodeId);

      // Alt/Option + click = start connecting
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

  // Mouse move — drag or connect
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
          prev
            ? { ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top }
            : null
        );
      }
    },
    [dragState, connectState]
  );

  // Mouse up — finish drag or connect
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (connectState) {
        // Find node under mouse
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const target = nodes.find(
            (n) =>
              n.id !== connectState.fromId &&
              mx >= n.x &&
              mx <= n.x + 140 &&
              my >= n.y &&
              my <= n.y + 40
          );
          if (target) {
            // Don't add duplicate edges
            const exists = edges.some(
              (ed) => ed.from === connectState.fromId && ed.to === target.id
            );
            if (!exists) {
              setEdges((prev) => [
                ...prev,
                { from: connectState.fromId, to: target.id },
              ]);
            }
          }
        }
        setConnectState(null);
      }
      setDragState(null);
    },
    [connectState, nodes, edges]
  );

  // Update node text
  const handleTextChange = useCallback((nodeId: string, text: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, text } : n))
    );
  }, []);

  // Change node type
  const cycleType = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const types: CanvasNode["type"][] = ["text", "code", "task"];
        const idx = types.indexOf(n.type);
        return { ...n, type: types[(idx + 1) % types.length] };
      })
    );
  }, []);

  // Toggle task checkbox
  const toggleCheck = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, checked: !n.checked } : n
      )
    );
  }, []);

  // Delete selected node
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) =>
      prev.filter((e) => e.from !== selectedId && e.to !== selectedId)
    );
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingId) return; // don't delete while editing text
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, editingId]);

  // Generate MD
  const handleGenerate = useCallback(() => {
    const md = canvasToMarkdown(nodes, edges);
    onGenerate(md);
  }, [nodes, edges, onGenerate]);

  // Get node center for edge drawing
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 70, y: node.y + 20 };
  };

  const typeLabel = { text: "T", code: "</>", task: "[]" };
  const typeColor = { text: "var(--accent)", code: "#4ade80", task: "#60a5fa" };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2 text-xs"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Canvas
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
            Double-click to add · Drag to move · Alt+drag to connect · Delete to remove
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]" style={{ color: "var(--text-faint)" }}>
            {nodes.length} nodes · {edges.length} edges
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
            Generate MD
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto cursor-crosshair select-none"
        style={{ background: "var(--background)" }}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest(".canvas-node")) {
            setSelectedId(null);
            setEditingId(null);
          }
        }}
      >
        {/* Grid dots */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--border-dim) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* SVG for edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {edges.map((edge, i) => {
            const from = getNodeCenter(edge.from);
            const to = getNodeCenter(edge.to);
            return (
              <g key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="var(--text-faint)"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
          })}
          {/* Connecting line preview */}
          {connectState && (
            <line
              x1={getNodeCenter(connectState.fromId).x}
              y1={getNodeCenter(connectState.fromId).y}
              x2={connectState.mouseX}
              y2={connectState.mouseY}
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
          )}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--text-faint)" />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="canvas-node absolute"
            style={{
              left: node.x,
              top: node.y,
              zIndex: selectedId === node.id ? 10 : 2,
              minWidth: 140,
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingId(node.id);
            }}
          >
            <div
              className="rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: "var(--surface)",
                border: `1.5px solid ${selectedId === node.id ? "var(--accent)" : "var(--border)"}`,
                boxShadow: selectedId === node.id ? "0 0 0 2px var(--accent-dim)" : "none",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <button
                  onClick={(e) => { e.stopPropagation(); cycleType(node.id); }}
                  className="text-[9px] font-mono font-bold px-1 rounded"
                  style={{ color: typeColor[node.type], background: `${typeColor[node.type]}15` }}
                >
                  {typeLabel[node.type]}
                </button>
                {node.type === "task" && (
                  <input
                    type="checkbox"
                    checked={node.checked || false}
                    onChange={() => toggleCheck(node.id)}
                    className="cursor-pointer"
                    style={{ accentColor: "var(--accent)" }}
                  />
                )}
              </div>
              {editingId === node.id ? (
                <textarea
                  autoFocus
                  value={node.text}
                  onChange={(e) => handleTextChange(node.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingId(null);
                    e.stopPropagation();
                  }}
                  className="w-full bg-transparent outline-none resize-none text-xs leading-relaxed"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: node.type === "code" ? "var(--font-geist-mono), monospace" : "inherit",
                    minHeight: 24,
                  }}
                  rows={Math.max(1, node.text.split("\n").length)}
                />
              ) : (
                <div
                  className="text-xs leading-relaxed min-h-[24px] whitespace-pre-wrap"
                  style={{
                    color: node.text ? "var(--text-secondary)" : "var(--text-faint)",
                    fontFamily: node.type === "code" ? "var(--font-geist-mono), monospace" : "inherit",
                  }}
                >
                  {node.text || "Double-click to edit"}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="text-4xl opacity-20">🧩</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Double-click anywhere to add a node
            </p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Alt + drag between nodes to connect them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
