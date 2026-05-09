"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface DocBundleNode {
  id: string;
  type: "doc" | "bundle";
  label: string;
  url: string;
  x: number;
  y: number;
  weight: number;
  groupBundleId?: string | null;
}

interface DocBundleEdge {
  source: string;
  target: string;
  type: "bundle_member" | "semantic";
  weight: number;
}

interface HubGraph {
  nodes: DocBundleNode[];
  edges: DocBundleEdge[];
  totals: { docs: number; bundles: number; semanticEdges: number };
  computedAt: string;
}

interface ConceptNode {
  id: number;
  label: string;
  conceptType: string | null;
  description: string | null;
  weight: number;
  occurrenceCount: number;
  docIds: string[];
  bundleIds: string[];
  x: number;
  y: number;
  size: number;
}

interface ConceptEdge {
  source: number;
  target: number;
  relationLabel: string;
  weight: number;
}

interface HubConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  totals: { concepts: number; relations: number; docs: number };
  computedAt: string;
}

interface Props {
  apiPath: string;
  hubUrl: string;
}

type ViewMode = "docs" | "concepts";

/**
 * Hub-graph viewer with two views.
 *
 * - "docs" (default): bundles + docs + semantic edges. Server has
 *    precomputed (x, y) so no client-side simulation is needed.
 * - "concepts": ontology graph from concept_index +
 *    concept_relations. Same layout strategy — server-precomputed
 *    positions from a force-relaxed layout.
 *
 * Pan with drag, zoom with scroll. Click a doc/bundle to open it.
 * Click a concept to open the side panel listing its evidence docs
 * and 1-hop neighbors.
 */
export default function HubGraphCanvas({ apiPath, hubUrl }: Props) {
  const [view, setView] = useState<ViewMode>("docs");
  const [graph, setGraph] = useState<HubGraph | null>(null);
  const [conceptGraph, setConceptGraph] = useState<HubConceptGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragState = useRef<{ startX: number; startY: number; startPan: { x: number; y: number }; moved: boolean } | null>(null);

  // Fetch the active view. Both fetches are cheap and cached so
  // toggling between views feels instant after the first load.
  useEffect(() => {
    let abort = false;
    const target = view === "concepts" ? "/api/user/hub/concepts" : apiPath;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(target, { credentials: "include" });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          if (!abort) {
            setError(e.error || `Failed (${res.status})`);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (!abort) {
          if (view === "concepts") setConceptGraph(data as HubConceptGraph);
          else setGraph(data as HubGraph);
          setLoading(false);
        }
      } catch (err) {
        if (!abort) {
          setError(err instanceof Error ? err.message : "Failed");
          setLoading(false);
        }
      }
    })();
    return () => { abort = true; };
  }, [apiPath, view]);

  // Keep the camera state when toggling views — it's the same canvas
  // size, just different data.

  const docNodeIndex = useMemo(() => {
    const map = new Map<string, DocBundleNode>();
    graph?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graph]);
  const conceptNodeIndex = useMemo(() => {
    const map = new Map<number, ConceptNode>();
    conceptGraph?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [conceptGraph]);

  const selectedConcept = selectedConceptId != null ? conceptNodeIndex.get(selectedConceptId) || null : null;
  const selectedNeighbors = useMemo(() => {
    if (!selectedConcept || !conceptGraph) return [];
    const nbrs: Array<{ node: ConceptNode; relation: string }> = [];
    for (const e of conceptGraph.edges) {
      if (e.source === selectedConcept.id) {
        const n = conceptNodeIndex.get(e.target);
        if (n) nbrs.push({ node: n, relation: e.relationLabel });
      } else if (e.target === selectedConcept.id) {
        const n = conceptNodeIndex.get(e.source);
        if (n) nbrs.push({ node: n, relation: e.relationLabel });
      }
    }
    return nbrs.slice(0, 30);
  }, [selectedConcept, conceptGraph, conceptNodeIndex]);

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).dataset?.node) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan }, moved: false };
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragState.current.moved = true;
    setPan({ x: dragState.current.startPan.x + dx, y: dragState.current.startPan.y + dy });
  };
  const onMouseUp = () => { dragState.current = null; };
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.max(0.3, Math.min(3, s * delta)));
  };
  const onCanvasClick = () => {
    // Clicking blank canvas closes the concept side panel — but only
    // when the click wasn't part of a drag.
    if (!dragState.current?.moved) setSelectedConceptId(null);
  };

  if (loading && !graph && !conceptGraph) {
    return <div style={{ padding: 32, color: "var(--text-muted)" }}>Loading hub graph...</div>;
  }
  if (error && !graph && !conceptGraph) {
    return <div style={{ padding: 32, color: "#ef4444" }}>{error || "Could not load graph."}</div>;
  }

  const stats = view === "concepts" && conceptGraph
    ? `${conceptGraph.totals.concepts} concepts, ${conceptGraph.totals.relations} relations across ${conceptGraph.totals.docs} docs`
    : graph
      ? `${graph.totals.docs} docs, ${graph.totals.bundles} bundles, ${graph.totals.semanticEdges} semantic links`
      : "";

  return (
    <div style={{ height: "calc(100vh - 56px)", position: "relative", background: "var(--background)" }}>
      {/* Top-left HUD: stats + view toggle + back link. */}
      <div
        style={{
          position: "absolute", top: 16, left: 16, zIndex: 10,
          padding: "8px 10px", borderRadius: 8,
          background: "var(--surface)", border: "1px solid var(--border)",
          fontSize: 12, color: "var(--text-secondary)",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 0, padding: 2, background: "var(--toggle-bg)", borderRadius: 6 }}>
          {(["docs", "concepts"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "3px 10px", fontSize: 11, fontWeight: 600,
                background: view === v ? "var(--accent-dim)" : "transparent",
                color: view === v ? "var(--accent)" : "var(--text-muted)",
                border: "none", borderRadius: 4, cursor: "pointer",
              }}
            >
              {v === "docs" ? "Docs & Bundles" : "Concepts"}
            </button>
          ))}
        </div>
        <span>{stats}</span>
        <Link href={hubUrl} style={{ color: "var(--accent)", textDecoration: "underline" }}>
          back to hub
        </Link>
      </div>

      {loading && (
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 10,
          padding: "4px 10px", borderRadius: 6,
          background: "var(--surface)", border: "1px solid var(--border)",
          fontSize: 11, color: "var(--text-faint)",
        }}>
          loading…
        </div>
      )}

      <svg
        width="100%" height="100%"
        viewBox="-600 -500 1200 1000"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onClick={onCanvasClick}
        style={{ cursor: dragState.current ? "grabbing" : "grab", userSelect: "none" }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {view === "docs" && graph && (
            <DocBundleLayer graph={graph} nodeIndex={docNodeIndex} hoverId={hoverId} setHoverId={setHoverId} />
          )}
          {view === "concepts" && conceptGraph && (
            <ConceptLayer
              graph={conceptGraph}
              nodeIndex={conceptNodeIndex}
              hoverId={hoverId}
              setHoverId={setHoverId}
              selectedId={selectedConceptId}
              onSelect={(id) => setSelectedConceptId((cur) => cur === id ? null : id)}
            />
          )}
        </g>
      </svg>

      {/* Concept side panel — shows up when a concept is selected. */}
      {view === "concepts" && selectedConcept && (
        <ConceptSidePanel
          concept={selectedConcept}
          neighbors={selectedNeighbors}
          onClose={() => setSelectedConceptId(null)}
          onJumpToConcept={(id) => setSelectedConceptId(id)}
        />
      )}

      <div style={{ position: "absolute", bottom: 16, left: 16, fontSize: 11, color: "var(--text-faint)" }}>
        Drag to pan. Scroll to zoom. {view === "concepts" ? "Click a concept for evidence + neighbors." : "Click a node to open it."}
      </div>
    </div>
  );
}

function DocBundleLayer({ graph, nodeIndex, hoverId, setHoverId }: {
  graph: HubGraph;
  nodeIndex: Map<string, DocBundleNode>;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
}) {
  return (
    <>
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
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={stroke}
            strokeOpacity={opacity}
            strokeWidth={strokeWidth}
            strokeDasharray={isMember ? undefined : "3,3"}
          />
        );
      })}
      {graph.nodes.map((n) => {
        const r = n.type === "bundle" ? 14 + Math.min(n.weight, 8) : 6;
        const fill = n.type === "bundle" ? "var(--accent)" : "var(--surface)";
        const stroke = n.type === "bundle" ? "var(--accent)" : "var(--border)";
        return (
          <g key={n.id}>
            <Link href={n.url}>
              <circle
                data-node="1"
                cx={n.x} cy={n.y} r={r}
                fill={fill} stroke={stroke} strokeWidth={1.5}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{ cursor: "pointer" }}
              />
            </Link>
            {(n.type === "bundle" || hoverId === n.id) && (
              <text
                x={n.x} y={n.y + r + 14} textAnchor="middle"
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
    </>
  );
}

function ConceptLayer({ graph, nodeIndex, hoverId, setHoverId, selectedId, onSelect }: {
  graph: HubConceptGraph;
  nodeIndex: Map<number, ConceptNode>;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const adjacentIds = useMemo(() => {
    if (selectedId == null) return null;
    const set = new Set<number>([selectedId]);
    for (const e of graph.edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [selectedId, graph.edges]);
  return (
    <>
      {graph.edges.map((e, i) => {
        const a = nodeIndex.get(e.source);
        const b = nodeIndex.get(e.target);
        if (!a || !b) return null;
        const inSelection = adjacentIds && (adjacentIds.has(e.source) && adjacentIds.has(e.target));
        const opacity = adjacentIds ? (inSelection ? 0.85 : 0.06) : 0.35;
        const strokeWidth = inSelection ? 1.8 : 1;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="var(--accent)"
            strokeOpacity={opacity}
            strokeWidth={strokeWidth}
          />
        );
      })}
      {graph.nodes.map((n) => {
        const r = 5 + n.size * 4;
        const isSel = selectedId === n.id;
        const dimmed = adjacentIds ? !adjacentIds.has(n.id) : false;
        const fill = isSel ? "var(--accent)" : "var(--surface)";
        const stroke = isSel ? "var(--accent)" : "var(--accent)";
        return (
          <g key={n.id} style={{ opacity: dimmed ? 0.25 : 1 }}>
            <circle
              data-node="1"
              cx={n.x} cy={n.y} r={r}
              fill={fill} stroke={stroke}
              strokeWidth={isSel ? 2.5 : 1.4}
              onMouseEnter={() => setHoverId(String(n.id))}
              onMouseLeave={() => setHoverId(null)}
              onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
              style={{ cursor: "pointer" }}
            />
            {(isSel || hoverId === String(n.id) || n.size > 2.2) && (
              <text
                x={n.x} y={n.y + r + 12} textAnchor="middle"
                fontSize={isSel ? 12 : 10}
                fontWeight={isSel ? 600 : 400}
                fill={isSel ? "var(--text-primary)" : "var(--text-secondary)"}
                style={{ pointerEvents: "none" }}
              >
                {n.label.length > 32 ? n.label.slice(0, 29) + "..." : n.label}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function ConceptSidePanel({ concept, neighbors, onClose, onJumpToConcept }: {
  concept: ConceptNode;
  neighbors: Array<{ node: ConceptNode; relation: string }>;
  onClose: () => void;
  onJumpToConcept: (id: number) => void;
}) {
  return (
    <div style={{
      position: "absolute", top: 16, right: 16, bottom: 16,
      width: 320, zIndex: 20,
      padding: 16, borderRadius: 10,
      background: "var(--surface)", border: "1px solid var(--border)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex", flexDirection: "column", gap: 12,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-faint)" }}>
            {concept.conceptType || "concept"} · weight {concept.weight.toFixed(1)} · {concept.occurrenceCount} mentions
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginTop: 4, wordBreak: "break-word" }}>
            {concept.label}
          </h2>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }} title="Close">×</button>
      </div>

      {concept.description && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{concept.description}</p>
      )}

      <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {concept.docIds.length > 0 && (
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-faint)", marginBottom: 6 }}>
              Evidence ({concept.docIds.length} docs)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {concept.docIds.slice(0, 10).map((id) => (
                <Link key={id} href={`/${id}`} target="_blank" style={{
                  fontSize: 12, color: "var(--text-secondary)",
                  padding: "4px 8px", borderRadius: 4,
                  background: "var(--toggle-bg)", textDecoration: "none",
                  fontFamily: "var(--font-mono, monospace)",
                  display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  /{id}
                </Link>
              ))}
              {concept.docIds.length > 10 && (
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                  +{concept.docIds.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {neighbors.length > 0 && (
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-faint)", marginBottom: 6 }}>
              Related concepts ({neighbors.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {neighbors.map(({ node, relation }) => (
                <button
                  key={`${node.id}-${relation}`}
                  onClick={() => onJumpToConcept(node.id)}
                  style={{
                    textAlign: "left",
                    padding: "5px 8px", borderRadius: 4,
                    background: "transparent", border: "1px solid var(--border-dim)",
                    color: "var(--text-secondary)", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 2,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{node.label}</span>
                  <span style={{ fontSize: 10, color: "var(--accent)" }}>{relation}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
