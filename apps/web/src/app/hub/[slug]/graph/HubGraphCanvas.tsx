"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface Node {
  id: string;
  type: "doc" | "bundle";
  label: string;
  url: string;
  x: number;
  y: number;
  weight: number;
  groupBundleId?: string | null;
}

interface Edge {
  source: string;
  target: string;
  type: "bundle_member" | "semantic";
  weight: number;
}

interface HubGraph {
  nodes: Node[];
  edges: Edge[];
  totals: { docs: number; bundles: number; semanticEdges: number };
  computedAt: string;
}

interface Props {
  apiPath: string;
  hubUrl: string;
}

/**
 * Lightweight hub-graph viewer.
 *
 * Server already precomputed (x, y) positions in /lib/hub-graph.ts so
 * no client-side force simulation is needed. We center on (0, 0), pan
 * with the cursor, and render edges first / nodes on top in plain SVG.
 *
 * Hover surfaces a tooltip with the node label. Click on any node
 * navigates to the underlying URL (doc or bundle).
 */
export default function HubGraphCanvas({ apiPath, hubUrl }: Props) {
  const [graph, setGraph] = useState<HubGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragState = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(apiPath, { credentials: "include" });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          if (!abort) setError(e.error || `Failed (${res.status})`);
          return;
        }
        const data: HubGraph = await res.json();
        if (!abort) {
          setGraph(data);
          setLoading(false);
        }
      } catch (err) {
        if (!abort) {
          setError(err instanceof Error ? err.message : "Failed");
          setLoading(false);
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [apiPath]);

  const nodeIndex = useMemo(() => {
    const map = new Map<string, Node>();
    graph?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graph]);

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).dataset?.node) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragState.current) return;
    setPan({
      x: dragState.current.startPan.x + (e.clientX - dragState.current.startX),
      y: dragState.current.startPan.y + (e.clientY - dragState.current.startY),
    });
  };
  const onMouseUp = () => {
    dragState.current = null;
  };
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.max(0.3, Math.min(3, s * delta)));
  };

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>
        Loading hub graph...
      </div>
    );
  }
  if (error || !graph) {
    return (
      <div style={{ padding: 32, color: "#ef4444" }}>
        {error || "Could not load graph."}
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 56px)", position: "relative", background: "var(--background)" }}>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          padding: "8px 12px",
          borderRadius: 8,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        {graph.totals.docs} docs, {graph.totals.bundles} bundles,{" "}
        {graph.totals.semanticEdges} semantic links.{" "}
        <Link href={hubUrl} style={{ color: "var(--accent)", textDecoration: "underline" }}>
          back to hub
        </Link>
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox="-600 -500 1200 1000"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ cursor: dragState.current ? "grabbing" : "grab", userSelect: "none" }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Edges first so nodes paint on top. */}
          {graph.edges.map((e, i) => {
            const a = nodeIndex.get(e.source);
            const b = nodeIndex.get(e.target);
            if (!a || !b) return null;
            const isMember = e.type === "bundle_member";
            const stroke = isMember ? "var(--accent)" : "color-mix(in srgb, var(--text-faint) 60%, transparent)";
            const opacity = isMember ? 0.55 : 0.35;
            const strokeWidth = isMember ? 1.6 : 1;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeOpacity={opacity}
                strokeWidth={strokeWidth}
                strokeDasharray={isMember ? undefined : "3,3"}
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((n) => {
            const r = n.type === "bundle" ? 14 + Math.min(n.weight, 8) : 6;
            const fill = n.type === "bundle" ? "var(--accent)" : "var(--surface)";
            const stroke = n.type === "bundle" ? "var(--accent)" : "var(--border)";
            return (
              <g key={n.id}>
                <Link href={n.url}>
                  <circle
                    data-node="1"
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.5}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{ cursor: "pointer" }}
                  />
                </Link>
                {(n.type === "bundle" || hoverId === n.id) && (
                  <text
                    x={n.x}
                    y={n.y + r + 14}
                    textAnchor="middle"
                    fontSize={n.type === "bundle" ? 11 : 10}
                    fill={n.type === "bundle" ? "var(--text-primary)" : "var(--text-secondary)"}
                    style={{ pointerEvents: "none" }}
                  >
                    {n.label.length > 36 ? n.label.slice(0, 33) + "..." : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          fontSize: 11,
          color: "var(--text-faint)",
        }}
      >
        Drag to pan. Scroll to zoom. Click a node to open it.
      </div>
    </div>
  );
}
