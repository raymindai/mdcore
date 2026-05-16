"use client";

// Hub Galaxy — standalone full-canvas surface for the constellation
// view. Extracted from the earlier inline Start-tab embed (HubConstellation)
// so the visualization can have its own real estate: search, filter pills,
// click-to-details panel, zoom-aware labels, full-page canvas.
//
// API:  GET /api/user/hub/constellation  (owner-only, returns nodes /
//       edges / clusters / hubStart-hubEnd)
//
// Anti-patterns we explicitly avoid (per claude memory
// `start_growing_hub_concept_2026_05`):
//   - No gamification / badges
//   - No social comparison
//   - No "you broke your streak" shame
// The galaxy is visceral by intent — labels appear, nodes glow, things
// connect — not a scorecard.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

interface ApiNode {
  id: string;
  label: string;
  kind: "concept" | "entity" | "tag" | "doc";
  weight: number;
  description?: string | null;
  occurrence?: number;
  createdAt: string;
  docIds?: string[];
  bundleId?: string | null;
  intent?: string | null;
}
interface ApiEdge {
  id: string;
  source: string;
  target: string;
  kind: "concept_doc" | "concept_concept";
  weight: number;
  label?: string;
  createdAt: string;
}
interface ApiCluster {
  id: string;
  label: string;
  createdAt: string;
}
interface GalaxyData {
  nodes: ApiNode[];
  edges: ApiEdge[];
  clusters: ApiCluster[];
  hubStart: string;
  hubEnd: string;
  counts: { nodes: number; edges: number; clusters: number; cappedConcepts: boolean; cappedDocs: boolean };
}

interface Props {
  authHeaders: Record<string, string>;
}

const CLUSTER_COLOURS = ["#fb923c", "#60a5fa", "#a78bfa", "#4ade80", "#f472b6", "#fbbf24"];
const KIND_ORDER: Array<ApiNode["kind"]> = ["concept", "entity", "tag", "doc"];

function colourForBundle(bundleId: string | null | undefined, clusters: ApiCluster[]): string {
  if (!bundleId) return "color-mix(in srgb, var(--text-faint) 40%, transparent 60%)";
  const idx = clusters.findIndex((c) => c.id === bundleId);
  return idx >= 0 ? CLUSTER_COLOURS[idx % CLUSTER_COLOURS.length] : "var(--accent)";
}
function colourForConcept(kind: ApiNode["kind"]): string {
  if (kind === "entity") return "var(--accent)";
  if (kind === "tag") return "color-mix(in srgb, var(--accent) 50%, var(--text-muted) 50%)";
  return "color-mix(in srgb, var(--accent) 75%, var(--text-primary) 25%)";
}

const elk = new ELK();
async function layoutGraph(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const result = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "force",
      "elk.force.iterations": "160",
      "elk.spacing.nodeNode": "32",
      "elk.padding": "[top=20, left=20, bottom=20, right=20]",
    },
    children: nodes.map((n) => ({ id: n.id, width: 20, height: 20 })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  return nodes.map((n) => {
    const laid = result.children?.find((c) => c.id === n.id);
    return { ...n, position: { x: laid?.x ?? 0, y: laid?.y ?? 0 } };
  });
}

// Node renders as a dot + (when zoomed in or matched by search) a label.
// Intersected with Record<string, unknown> so it's assignable to xyflow's
// Node['data'] shape (which requires an index signature).
type DotNodeData = {
  kind: ApiNode["kind"];
  size: number;
  colour: string;
  label: string;
  showLabel: boolean;
  dimmed: boolean;
  selected: boolean;
} & Record<string, unknown>;
function DotNode({ data }: { data: DotNodeData }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        opacity: data.dimmed ? 0.18 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        title={data.label}
        style={{
          width: data.size,
          height: data.size,
          borderRadius: data.kind === "doc" ? 3 : "50%",
          background: data.colour,
          boxShadow: data.selected
            ? `0 0 ${data.size}px ${data.colour}, 0 0 ${data.size * 1.6}px ${data.colour}88`
            : `0 0 ${Math.max(2, data.size / 3)}px ${data.colour}55`,
          opacity: data.dimmed ? 0.5 : 0.9,
          outline: data.selected ? `1.5px solid ${data.colour}` : "none",
          outlineOffset: 2,
        }}
      />
      {data.showLabel && (
        <span
          style={{
            fontSize: 10,
            color: "var(--text-secondary)",
            background: "color-mix(in srgb, var(--background) 80%, transparent 20%)",
            padding: "1px 5px",
            borderRadius: 3,
            maxWidth: 140,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {data.label}
        </span>
      )}
    </div>
  );
}
const NODE_TYPES: NodeTypes = { dot: DotNode };

function HubGalaxyInner({ authHeaders }: Props) {
  const [data, setData] = useState<GalaxyData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliderDate, setSliderDate] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleKinds, setVisibleKinds] = useState<Set<ApiNode["kind"]>>(
    () => new Set(KIND_ORDER)
  );
  const [zoom, setZoom] = useState(0.8);
  const playRef = useRef<number | null>(null);
  const flow = useReactFlow();

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/hub/constellation", { headers: authHeaders });
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 401 ? "auth" : "fetch");
            setLoaded(true);
          }
          return;
        }
        const json = (await res.json()) as GalaxyData;
        if (cancelled) return;
        setData(json);
        setSliderDate(json.hubEnd);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setError("fetch");
          setLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layout once
  useEffect(() => {
    if (!data || data.nodes.length === 0) return;
    let cancelled = false;
    (async () => {
      const initial: Node[] = data.nodes.map((n) => ({
        id: n.id,
        type: "dot",
        position: { x: 0, y: 0 },
        data: {
          kind: n.kind,
          size: n.kind === "doc" ? 10 : Math.max(7, Math.min(22, 7 + (n.occurrence || 1) * 0.7)),
          colour: n.kind === "doc" ? colourForBundle(n.bundleId, data.clusters) : colourForConcept(n.kind),
          label: n.label,
          showLabel: false,
          dimmed: false,
          selected: false,
        } satisfies DotNodeData,
        draggable: false,
        selectable: true,
      }));
      const flowEdges: Edge[] = data.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
      const positioned = await layoutGraph(initial, flowEdges);
      if (!cancelled) setLayoutedNodes(positioned);
    })();
    return () => { cancelled = true; };
  }, [data]);

  const apiNodeMap = useMemo(() => {
    const m = new Map<string, ApiNode>();
    for (const n of data?.nodes || []) m.set(n.id, n);
    return m;
  }, [data]);

  // Visible (filter+search+slider applied) — recomputed on every relevant change
  const visible = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[], neighbours: new Set<string>() };
    const cutoffIso = (sliderDate || data.hubEnd) + "T23:59:59Z";
    const term = searchTerm.trim().toLowerCase();
    const visibleIds = new Set<string>();
    for (const n of data.nodes) {
      if (n.createdAt > cutoffIso) continue;
      if (!visibleKinds.has(n.kind)) continue;
      visibleIds.add(n.id);
    }

    // If user clicked a node, compute its immediate neighbours so the
    // detail panel can list "related." Also used to skip dimming for
    // those nodes during search.
    const neighbours = new Set<string>();
    if (selectedId && visibleIds.has(selectedId)) {
      for (const e of data.edges) {
        if (e.createdAt > cutoffIso) continue;
        if (e.source === selectedId && visibleIds.has(e.target)) neighbours.add(e.target);
        if (e.target === selectedId && visibleIds.has(e.source)) neighbours.add(e.source);
      }
    }

    const matched = term
      ? new Set(
          data.nodes
            .filter((n) => visibleIds.has(n.id) && n.label.toLowerCase().includes(term))
            .map((n) => n.id),
        )
      : null;

    const showLabels = zoom > 1.3 || matched !== null || selectedId !== null;
    const nodes: Node[] = layoutedNodes
      .filter((n) => visibleIds.has(n.id))
      .map((n) => {
        const api = apiNodeMap.get(n.id);
        const colour = api
          ? api.kind === "doc"
            ? colourForBundle(api.bundleId, data.clusters)
            : colourForConcept(api.kind)
          : "var(--accent)";
        const size = api
          ? api.kind === "doc"
            ? 10
            : Math.max(7, Math.min(22, 7 + (api.occurrence || 1) * 0.7))
          : 10;
        const dimmed = matched
          ? !matched.has(n.id) && n.id !== selectedId && !neighbours.has(n.id)
          : false;
        const selected = n.id === selectedId;
        const showLabelHere =
          (showLabels && (selected || (matched ? matched.has(n.id) : true))) ||
          neighbours.has(n.id);
        const data2: DotNodeData = {
          kind: api?.kind ?? "concept",
          size,
          colour,
          label: api?.label ?? n.id,
          showLabel: showLabelHere,
          dimmed,
          selected,
        };
        return { ...n, data: data2 };
      });

    const edges: Edge[] = data.edges
      .filter((e) => e.createdAt <= cutoffIso && visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const isNeighbour =
          selectedId !== null && (e.source === selectedId || e.target === selectedId);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          style: {
            stroke:
              e.kind === "concept_concept"
                ? isNeighbour
                  ? "color-mix(in srgb, var(--accent) 70%, transparent 30%)"
                  : "color-mix(in srgb, var(--accent) 30%, transparent 70%)"
                : isNeighbour
                  ? "color-mix(in srgb, var(--accent) 60%, transparent 40%)"
                  : "color-mix(in srgb, var(--text-faint) 25%, transparent 75%)",
            strokeWidth: isNeighbour ? 1.6 : e.kind === "concept_concept" ? 1.2 : 0.7,
            opacity: matched ? (isNeighbour ? 1 : 0.25) : 1,
          },
        };
      });

    return { nodes, edges, neighbours };
  }, [data, layoutedNodes, sliderDate, visibleKinds, searchTerm, selectedId, apiNodeMap, zoom]);

  // Zoom-to-fit when search lands on results
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term || !data) return;
    const matches = visible.nodes.filter((n) => {
      const d = n.data as DotNodeData;
      return d.label.toLowerCase().includes(term.toLowerCase());
    });
    if (matches.length === 0) return;
    // ReactFlow's fitView optionally takes a `nodes` list to fit to;
    // re-fit on each match transition for a satisfying focus pull.
    flow.fitView({ nodes: matches.map((m) => ({ id: m.id })), padding: 0.18, duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Replay growth (animate slider from hubStart to hubEnd)
  useEffect(() => {
    if (!playing || !data) return;
    const startMs = new Date(data.hubStart + "T00:00:00Z").getTime();
    const endMs = new Date(data.hubEnd + "T00:00:00Z").getTime();
    const cursorStart = sliderDate
      ? new Date(sliderDate + "T00:00:00Z").getTime()
      : startMs;
    const fromMs = cursorStart >= endMs ? startMs : cursorStart;
    const totalMs = endMs - fromMs;
    const animMs = 6000;
    if (totalMs <= 0) { setPlaying(false); return; }
    const startT = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startT;
      const t = Math.min(1, elapsed / animMs);
      const now = fromMs + totalMs * t;
      setSliderDate(new Date(now).toISOString().slice(0, 10));
      if (t >= 1) {
        setPlaying(false);
        playRef.current = null;
        return;
      }
      playRef.current = requestAnimationFrame(tick);
    };
    playRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
      playRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const selected = selectedId ? apiNodeMap.get(selectedId) : null;
  const linkedDocs = useMemo(() => {
    if (!selected || !data) return [];
    if (selected.kind === "doc") return [];
    return (selected.docIds || [])
      .map((id) => apiNodeMap.get(`doc:${id}`))
      .filter((n): n is ApiNode => !!n)
      .slice(0, 12);
  }, [selected, data, apiNodeMap]);

  if (!loaded) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          color: "var(--text-faint)",
        }}
      >
        <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: 1 }}>
          Loading galaxy…
        </span>
      </div>
    );
  }
  if (error === "auth") {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          gap: 12,
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sign in to see your galaxy.</p>
        <Link
          href="/"
          style={{
            background: "var(--accent)",
            color: "#000",
            padding: "10px 20px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Go to mdfy.app
        </Link>
      </div>
    );
  }
  if (!data || data.nodes.length === 0) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          gap: 12,
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 360, textAlign: "center" }}>
          Your galaxy is empty so far. Capture a few docs and let analysis run — concepts and
          connections will appear here.
        </p>
        <Link
          href="/"
          style={{
            background: "var(--accent)",
            color: "#000",
            padding: "10px 20px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Back to editor
        </Link>
      </div>
    );
  }

  // ─── Render ───
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border-dim)",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          ← Back
        </Link>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: 1, color: "var(--text-faint)" }}
        >
          Galaxy
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => {
            if (playing) { setPlaying(false); return; }
            setSliderDate(data.hubStart);
            setPlaying(true);
          }}
          style={{
            background: "var(--toggle-bg)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-dim)",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {playing ? "Pause" : "Replay growth"}
        </button>
      </div>

      {/* Body: left filters / center canvas / right details */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left: search + filters */}
        <aside
          style={{
            width: 220,
            borderRight: "1px solid var(--border-dim)",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <div>
            <label
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-faint)", display: "block", marginBottom: 6 }}
            >
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by label"
              style={{
                width: "100%",
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 6,
                padding: "6px 10px",
                color: "var(--text-primary)",
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-faint)", display: "block", marginBottom: 6 }}
            >
              Show
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {KIND_ORDER.map((k) => {
                const active = visibleKinds.has(k);
                const colour =
                  k === "doc"
                    ? "var(--text-faint)"
                    : k === "entity"
                    ? "var(--accent)"
                    : k === "tag"
                    ? "color-mix(in srgb, var(--accent) 50%, var(--text-muted) 50%)"
                    : "color-mix(in srgb, var(--accent) 75%, var(--text-primary) 25%)";
                return (
                  <button
                    key={k}
                    onClick={() => {
                      const next = new Set(visibleKinds);
                      if (next.has(k)) next.delete(k);
                      else next.add(k);
                      setVisibleKinds(next);
                    }}
                    style={{
                      background: active ? "var(--toggle-bg)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-faint)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 12,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: k === "doc" ? 2 : "50%",
                        background: colour,
                        opacity: active ? 1 : 0.35,
                      }}
                    />
                    <span style={{ flex: 1, textTransform: "capitalize" }}>{k}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 12 }}>
            <label
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-faint)", display: "block", marginBottom: 6 }}
            >
              Snapshot
            </label>
            <p className="text-caption" style={{ color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{visible.nodes.length}</span>
              {" "}of {data.nodes.length} nodes
              <br />
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{visible.edges.length}</span>
              {" "}of {data.edges.length} edges
              <br />
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{data.clusters.length}</span>
              {" "}bundles
            </p>
            {(data.counts.cappedConcepts || data.counts.cappedDocs) && (
              <p className="text-caption" style={{ color: "var(--text-faint)", marginTop: 6, lineHeight: 1.5, fontSize: 10 }}>
                Capped at top 200 concepts / 200 most-recent docs to keep the canvas responsive.
              </p>
            )}
          </div>
        </aside>

        {/* Center: canvas */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            background: "color-mix(in srgb, var(--background) 90%, var(--surface) 10%)",
          }}
        >
          <ReactFlow
            nodes={visible.nodes}
            edges={visible.edges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            panOnDrag
            zoomOnScroll
            minZoom={0.25}
            maxZoom={3}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onMove={(_, vp: Viewport) => setZoom(vp.zoom)}
            onNodeClick={(_, n) => setSelectedId(n.id === selectedId ? null : n.id)}
            onPaneClick={() => setSelectedId(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              gap={28}
              size={1}
              color="color-mix(in srgb, var(--text-faint) 14%, transparent 86%)"
            />
            <Controls
              showInteractive={false}
              position="bottom-right"
              style={{ background: "transparent", border: "none" }}
            />
          </ReactFlow>
        </div>

        {/* Right: selected-node detail panel */}
        {selected && (
          <aside
            style={{
              width: 300,
              borderLeft: "1px solid var(--border-dim)",
              padding: "16px 16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              flexShrink: 0,
              background: "var(--surface)",
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-faint)" }}
              >
                {selected.kind}
              </span>
              <span className="text-caption font-mono" style={{ color: "var(--text-faint)" }}>
                {selected.createdAt.slice(0, 10)}
              </span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-faint)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {selected.label}
            </h3>

            {selected.description && (
              <p
                className="text-caption"
                style={{ color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}
              >
                {selected.description}
              </p>
            )}

            {selected.kind !== "doc" && (selected.occurrence || 0) > 0 && (
              <p
                className="text-caption"
                style={{ color: "var(--text-faint)", margin: 0 }}
              >
                Appears in {(selected.docIds || []).length} {(selected.docIds || []).length === 1 ? "doc" : "docs"}, mentioned {selected.occurrence}x
              </p>
            )}

            {linkedDocs.length > 0 && (
              <div>
                <label
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-faint)", display: "block", marginBottom: 6 }}
                >
                  Appears in
                </label>
                <ul className="space-y-1" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {linkedDocs.map((d) => {
                    const id = d.id.startsWith("doc:") ? d.id.slice(4) : d.id;
                    return (
                      <li key={d.id}>
                        <a
                          href={`/${id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption"
                          style={{
                            color: "var(--text-secondary)",
                            textDecoration: "none",
                            display: "block",
                            padding: "4px 0",
                          }}
                        >
                          {d.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {selected.kind === "doc" && (
              <div style={{ marginTop: 4 }}>
                <a
                  href={`/${selected.id.startsWith("doc:") ? selected.id.slice(4) : selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption"
                  style={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  Open document →
                </a>
              </div>
            )}

            {visible.neighbours.size > 0 && (
              <div>
                <label
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: 0.5, color: "var(--text-faint)", display: "block", marginBottom: 6 }}
                >
                  Connected
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.from(visible.neighbours)
                    .map((id) => apiNodeMap.get(id))
                    .filter((n): n is ApiNode => !!n && n.kind !== "doc")
                    .slice(0, 12)
                    .map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedId(n.id)}
                        className="text-caption"
                        style={{
                          background: "var(--toggle-bg)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-dim)",
                          borderRadius: 4,
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontSize: 11,
                        }}
                      >
                        {n.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom: time slider */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderTop: "1px solid var(--border-dim)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span className="text-caption font-mono shrink-0" style={{ color: "var(--text-faint)", fontSize: 10 }}>
          {data.hubStart}
        </span>
        <input
          type="range"
          min={0}
          max={1000}
          value={(() => {
            const startMs = new Date(data.hubStart + "T00:00:00Z").getTime();
            const endMs = new Date(data.hubEnd + "T00:00:00Z").getTime();
            const curMs = new Date((sliderDate || data.hubEnd) + "T00:00:00Z").getTime();
            const total = Math.max(1, endMs - startMs);
            return Math.round(((curMs - startMs) / total) * 1000);
          })()}
          onChange={(e) => {
            const v = Number(e.target.value) / 1000;
            const startMs = new Date(data.hubStart + "T00:00:00Z").getTime();
            const endMs = new Date(data.hubEnd + "T00:00:00Z").getTime();
            const target = startMs + (endMs - startMs) * v;
            setPlaying(false);
            setSliderDate(new Date(target).toISOString().slice(0, 10));
          }}
          style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
        />
        <span
          className="text-caption font-mono shrink-0"
          style={{ color: "var(--text-secondary)", fontSize: 11, minWidth: 80, textAlign: "right" }}
        >
          {sliderDate || data.hubEnd}
        </span>
      </div>
    </div>
  );
}

export default function HubGalaxy(props: Props) {
  return (
    <ReactFlowProvider>
      <HubGalaxyInner {...props} />
    </ReactFlowProvider>
  );
}
