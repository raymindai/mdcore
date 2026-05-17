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

// Cosmos palette — hard-coded so /galaxy ignores light/dark site theme.
// A galaxy is not a UI surface; it's a *place* with its own physics.
const COSMOS = {
  bg: "#03040a",
  bgGradient:
    "radial-gradient(ellipse at 30% 20%, #0b1334 0%, #060818 35%, #03040a 70%)",
  text: "#e8ecf5",
  textMuted: "#8b94b5",
  textFaint: "#5a6385",
  border: "rgba(132, 144, 188, 0.12)",
  surface: "rgba(11, 15, 36, 0.72)",
  surfaceHover: "rgba(20, 28, 60, 0.85)",
  // Star colours by kind — astronomical temperature mapping.
  // doc = main-sequence blue-white, concept = G-type golden,
  // entity = K-type warm orange, tag = young cyan/teal.
  starDoc: "#cfd6ff",
  starConcept: "#ffd97a",
  starEntity: "#ff9b6b",
  starTag: "#7be9ff",
  starCore: "#ffffff",
  // Edge "cosmic threads"
  edgeFaint: "rgba(174, 195, 255, 0.06)",
  edgeMedium: "rgba(174, 195, 255, 0.18)",
  edgeBright: "rgba(180, 220, 255, 0.6)",
};

// Nebula palette — large, soft, low-opacity blobs clustered per bundle.
// Six hues, cycled. Each is the cluster's "home" colour and tints its
// member docs too, so the bundle reads visually without needing labels.
const NEBULA_PALETTE = [
  { hex: "#ff9b6b", rgb: "255, 155, 107" },
  { hex: "#7be9ff", rgb: "123, 233, 255" },
  { hex: "#ffd97a", rgb: "255, 217, 122" },
  { hex: "#c8b6ff", rgb: "200, 182, 255" },
  { hex: "#ff8fb1", rgb: "255, 143, 177" },
  { hex: "#9ef0c8", rgb: "158, 240, 200" },
];

const KIND_ORDER: Array<ApiNode["kind"]> = ["concept", "entity", "tag", "doc"];

function clusterPalette(idx: number) {
  return NEBULA_PALETTE[((idx % NEBULA_PALETTE.length) + NEBULA_PALETTE.length) % NEBULA_PALETTE.length];
}

function colourForBundle(bundleId: string | null | undefined, clusters: ApiCluster[]): string {
  if (!bundleId) return COSMOS.starDoc;
  const idx = clusters.findIndex((c) => c.id === bundleId);
  return idx >= 0 ? clusterPalette(idx).hex : COSMOS.starDoc;
}
function colourForConcept(kind: ApiNode["kind"]): string {
  if (kind === "entity") return COSMOS.starEntity;
  if (kind === "tag") return COSMOS.starTag;
  return COSMOS.starConcept;
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

// Node = a star. Bright white core fading to a colored halo, with multiple
// box-shadow layers stacked for the bloom. Twinkles via CSS keyframe with a
// per-node animation-delay so the field doesn't pulse in lockstep.
//
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
  twinkleDelay: number; // 0..6s — staggers the twinkle animation
} & Record<string, unknown>;

function StarNode({ data }: { data: DotNodeData }) {
  const isDoc = data.kind === "doc";
  // Core + glow halo. Docs render as a slightly elongated diamond (disk
  // galaxy feel); concepts/entities/tags as round stars.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        opacity: data.dimmed ? 0.12 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        className="galaxy-star"
        title={data.label}
        style={{
          width: data.size,
          height: data.size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COSMOS.starCore} 0%, ${data.colour} 30%, ${data.colour}00 70%)`,
          transform: isDoc ? "scaleX(1.35) scaleY(0.85)" : undefined,
          boxShadow: data.selected
            ? `0 0 ${data.size * 0.9}px ${data.colour}, 0 0 ${data.size * 2.2}px ${data.colour}cc, 0 0 ${data.size * 4}px ${data.colour}55`
            : `0 0 ${data.size * 0.55}px ${data.colour}aa, 0 0 ${data.size * 1.4}px ${data.colour}44, 0 0 ${data.size * 2.8}px ${data.colour}18`,
          animation: `galaxyTwinkle ${4 + (data.twinkleDelay % 3)}s ease-in-out infinite`,
          animationDelay: `-${data.twinkleDelay}s`,
        }}
      />
      {data.showLabel && (
        <span
          style={{
            fontSize: 10,
            color: COSMOS.text,
            background: "rgba(3, 4, 10, 0.78)",
            padding: "2px 7px",
            borderRadius: 3,
            maxWidth: 160,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            letterSpacing: 0.3,
            border: `1px solid ${COSMOS.border}`,
            textShadow: `0 0 6px ${data.colour}66`,
          }}
        >
          {data.label}
        </span>
      )}
    </div>
  );
}
const NODE_TYPES: NodeTypes = { dot: StarNode };

// Background star field — random pinpoints scattered across the viewport
// at varying sizes and twinkle phases. Deterministic so it doesn't reshuffle
// on every re-render.
interface BgStar {
  left: number; // 0..100 (%)
  top: number;  // 0..100 (%)
  size: number; // px
  opacity: number; // 0..1
  delay: number; // s
  duration: number; // s
}
function makeStars(count: number, seed: number): BgStar[] {
  // Mulberry32 PRNG so the field is stable across renders.
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: BgStar[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: rng() * 100,
      top: rng() * 100,
      size: rng() < 0.85 ? 1 + rng() * 1.2 : 1.8 + rng() * 1.5,
      opacity: 0.25 + rng() * 0.7,
      delay: rng() * 8,
      duration: 3 + rng() * 5,
    });
  }
  return out;
}
function StarField({ stars }: { stars: BgStar[] }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: s.opacity,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,${s.opacity * 0.6})`,
            animation: `galaxyTwinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `-${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Soft nebula clouds — one per bundle, anchored at the bundle's centroid.
// Pure CSS radial gradients on absolutely-positioned divs, drifting via
// long-period transforms so the cosmos feels alive without distracting.
interface NebulaBlob {
  id: string;
  x: number; // canvas coordinate (xyflow flow space)
  y: number;
  radius: number;
  rgb: string;
  driftSeed: number;
}
// Inject keyframes for star twinkle + nebula drift. A regular <style> in
// JSX is fine in React; we only need this once per page mount.
function GalaxyKeyframes() {
  return (
    <style>{`
      @keyframes galaxyTwinkle {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 1; }
      }
      @keyframes galaxyDrift {
        0%   { transform: translate(0, 0); }
        50%  { transform: translate(18px, -14px); }
        100% { transform: translate(-12px, 16px); }
      }
      @keyframes galaxyShimmer {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 0.85; }
      }
      /* Override xyflow's Controls so it doesn't look like a UI tool */
      .react-flow__controls {
        background: rgba(11, 15, 36, 0.6) !important;
        border: 1px solid rgba(132, 144, 188, 0.18) !important;
        border-radius: 6px !important;
        backdrop-filter: blur(8px) !important;
      }
      .react-flow__controls-button {
        background: transparent !important;
        border-bottom: 1px solid rgba(132, 144, 188, 0.12) !important;
        color: rgba(180, 220, 255, 0.7) !important;
        fill: rgba(180, 220, 255, 0.7) !important;
      }
      .react-flow__controls-button:hover {
        background: rgba(180, 220, 255, 0.08) !important;
      }
      /* xyflow Handle dots — hide, we don't connect anything */
      .react-flow__handle { display: none !important; }
      /* xyflow node selection ring — we use our own glow */
      .react-flow__node.selected, .react-flow__node:focus { outline: none !important; box-shadow: none !important; }
      .galaxy-star { will-change: opacity, transform; }
      .galaxy-input::placeholder { color: ${COSMOS.textFaint}; }
      .galaxy-range {
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right, ${COSMOS.starTag}88 0%, ${COSMOS.starConcept}55 100%);
        height: 2px;
        border-radius: 1px;
      }
      .galaxy-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${COSMOS.starCore};
        box-shadow: 0 0 12px ${COSMOS.starTag}, 0 0 4px ${COSMOS.starCore};
        cursor: pointer;
        border: none;
      }
      .galaxy-range::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${COSMOS.starCore};
        box-shadow: 0 0 12px ${COSMOS.starTag};
        cursor: pointer;
        border: none;
      }
    `}</style>
  );
}

function NebulaLayer({ blobs }: { blobs: NebulaBlob[] }) {
  return (
    <div
      aria-hidden
      className="react-flow__pane-overlay"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {blobs.map((b) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: b.x - b.radius,
            top: b.y - b.radius,
            width: b.radius * 2,
            height: b.radius * 2,
            background: `radial-gradient(circle, rgba(${b.rgb}, 0.32) 0%, rgba(${b.rgb}, 0.14) 35%, rgba(${b.rgb}, 0) 70%)`,
            filter: "blur(28px)",
            animation: `galaxyDrift ${24 + (b.driftSeed % 18)}s ease-in-out infinite alternate`,
            animationDelay: `-${b.driftSeed}s`,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </div>
  );
}

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
  // Track full viewport so backdrop nebula can transform with pan/zoom.
  const [vp, setVp] = useState<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 0.8 });
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
      const initial: Node[] = data.nodes.map((n, idx) => ({
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
          twinkleDelay: (idx * 0.37) % 6,
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
        const prevData = n.data as DotNodeData;
        const data2: DotNodeData = {
          kind: api?.kind ?? "concept",
          size,
          colour,
          label: api?.label ?? n.id,
          showLabel: showLabelHere,
          dimmed,
          selected,
          twinkleDelay: prevData?.twinkleDelay ?? 0,
        };
        return { ...n, data: data2 };
      });

    const edges: Edge[] = data.edges
      .filter((e) => e.createdAt <= cutoffIso && visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const isNeighbour =
          selectedId !== null && (e.source === selectedId || e.target === selectedId);
        // Cosmic threads — concept↔concept faint white, concept→doc fainter still,
        // selected neighbours glow bright cyan.
        const stroke = isNeighbour
          ? COSMOS.edgeBright
          : e.kind === "concept_concept"
            ? COSMOS.edgeMedium
            : COSMOS.edgeFaint;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          style: {
            stroke,
            strokeWidth: isNeighbour ? 1.4 : e.kind === "concept_concept" ? 0.8 : 0.5,
            filter: isNeighbour ? "drop-shadow(0 0 3px rgba(180,220,255,0.7))" : undefined,
            opacity: matched ? (isNeighbour ? 1 : 0.15) : 1,
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

  // One nebula per bundle, anchored at the centroid of its doc nodes in
  // flow-space. Soft, large, low-opacity — visually groups members without
  // requiring labels.
  const nebulaBlobs = useMemo<NebulaBlob[]>(() => {
    if (!data || layoutedNodes.length === 0) return [];
    const out: NebulaBlob[] = [];
    data.clusters.forEach((c, idx) => {
      const memberDocIds = new Set(
        data.nodes.filter((n) => n.kind === "doc" && n.bundleId === c.id).map((n) => n.id),
      );
      if (memberDocIds.size === 0) return;
      const positions = layoutedNodes
        .filter((n) => memberDocIds.has(n.id))
        .map((n) => n.position);
      if (positions.length === 0) return;
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
      // Radius grows (gently) with member count, capped so big bundles
      // don't swallow the canvas.
      const radius = Math.min(360, 120 + memberDocIds.size * 18);
      out.push({
        id: c.id,
        x: cx,
        y: cy,
        radius,
        rgb: clusterPalette(idx).rgb,
        driftSeed: (idx * 5.7) % 18,
      });
    });
    return out;
  }, [data, layoutedNodes]);

  // Background star field — re-seeded per session, stable across renders.
  const bgStars = useMemo(() => makeStars(280, 0x9e3779b1), []);
  const farStars = useMemo(() => makeStars(120, 0xc2b2ae35), []);

  const selected = selectedId ? apiNodeMap.get(selectedId) : null;
  const linkedDocs = useMemo(() => {
    if (!selected || !data) return [];
    if (selected.kind === "doc") return [];
    return (selected.docIds || [])
      .map((id) => apiNodeMap.get(`doc:${id}`))
      .filter((n): n is ApiNode => !!n)
      .slice(0, 12);
  }, [selected, data, apiNodeMap]);

  // Shared cosmos chrome — the same dark backdrop wraps loading / auth /
  // empty / live states, so the surface feels like a single place.
  const cosmosWrap: React.CSSProperties = {
    height: "100vh",
    background: COSMOS.bg,
    backgroundImage: COSMOS.bgGradient,
    color: COSMOS.text,
    position: "relative",
    overflow: "hidden",
  };

  if (!loaded) {
    return (
      <div style={{ ...cosmosWrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GalaxyKeyframes />
        <StarField stars={bgStars} />
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: 2, color: COSMOS.textMuted, zIndex: 1 }}
        >
          Locating galaxy…
        </span>
      </div>
    );
  }
  if (error === "auth") {
    return (
      <div
        style={{
          ...cosmosWrap,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <GalaxyKeyframes />
        <StarField stars={bgStars} />
        <p style={{ color: COSMOS.textMuted, fontSize: 14, zIndex: 1 }}>Sign in to see your galaxy.</p>
        <Link
          href="/"
          style={{
            background: COSMOS.starTag,
            color: "#000",
            padding: "10px 20px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 1,
            boxShadow: `0 0 24px ${COSMOS.starTag}55`,
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
          ...cosmosWrap,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <GalaxyKeyframes />
        <StarField stars={bgStars} />
        <p
          style={{
            color: COSMOS.textMuted,
            fontSize: 14,
            maxWidth: 360,
            textAlign: "center",
            zIndex: 1,
            lineHeight: 1.55,
          }}
        >
          Your galaxy is empty so far. Capture a few docs and let analysis run —
          concepts and connections will appear here as stars.
        </p>
        <Link
          href="/"
          style={{
            background: COSMOS.starTag,
            color: "#000",
            padding: "10px 20px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 1,
            boxShadow: `0 0 24px ${COSMOS.starTag}55`,
          }}
        >
          Back to editor
        </Link>
      </div>
    );
  }

  // ─── Render ───
  // Cosmos chrome wraps everything: header / sidebar / canvas / detail panel / slider
  // all live on top of the same dark-cosmos surface so the page feels like
  // one *place*, not a UI with a graph in it.
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: COSMOS.bg,
        backgroundImage: COSMOS.bgGradient,
        color: COSMOS.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GalaxyKeyframes />

      {/* Deep-space backdrop — sits behind the entire chrome, not just the
          canvas. So when the sidebar is translucent the stars peek through. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <StarField stars={farStars} />
      </div>

      {/* Header */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: `1px solid ${COSMOS.border}`,
          gap: 16,
          flexShrink: 0,
          background: "rgba(3, 4, 10, 0.55)",
          backdropFilter: "blur(8px)",
          zIndex: 2,
        }}
      >
        <Link
          href="/"
          style={{ color: COSMOS.textMuted, textDecoration: "none", fontSize: 13 }}
        >
          ← Back
        </Link>
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: COSMOS.text,
            textShadow: `0 0 8px ${COSMOS.starTag}66`,
          }}
        >
          Galaxy
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10, color: COSMOS.textFaint, letterSpacing: 0.5 }}
        >
          {data.counts.nodes} stars · {data.clusters.length} nebulae
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => {
            if (playing) { setPlaying(false); return; }
            setSliderDate(data.hubStart);
            setPlaying(true);
          }}
          style={{
            background: playing ? `${COSMOS.starTag}22` : "rgba(11, 15, 36, 0.6)",
            color: playing ? COSMOS.starTag : COSMOS.text,
            border: `1px solid ${playing ? COSMOS.starTag + "66" : COSMOS.border}`,
            borderRadius: 6,
            padding: "5px 14px",
            fontSize: 11,
            cursor: "pointer",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            boxShadow: playing ? `0 0 12px ${COSMOS.starTag}33` : "none",
          }}
        >
          {playing ? "Pause" : "Replay growth"}
        </button>
      </div>

      {/* Body: left filters / center canvas / right details */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative", zIndex: 1 }}>
        {/* Left: search + filters */}
        <aside
          style={{
            width: 220,
            borderRight: `1px solid ${COSMOS.border}`,
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            overflowY: "auto",
            flexShrink: 0,
            background: "rgba(3, 4, 10, 0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div>
            <label
              className="font-mono uppercase"
              style={{
                fontSize: 9,
                letterSpacing: 1,
                color: COSMOS.textFaint,
                display: "block",
                marginBottom: 6,
              }}
            >
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="filter by label"
              className="galaxy-input"
              style={{
                width: "100%",
                background: "rgba(11, 15, 36, 0.6)",
                border: `1px solid ${COSMOS.border}`,
                borderRadius: 6,
                padding: "6px 10px",
                color: COSMOS.text,
                fontSize: 12,
                outline: "none",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            />
          </div>

          <div>
            <label
              className="font-mono uppercase"
              style={{
                fontSize: 9,
                letterSpacing: 1,
                color: COSMOS.textFaint,
                display: "block",
                marginBottom: 6,
              }}
            >
              Star kinds
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {KIND_ORDER.map((k) => {
                const active = visibleKinds.has(k);
                const colour =
                  k === "doc"
                    ? COSMOS.starDoc
                    : k === "entity"
                    ? COSMOS.starEntity
                    : k === "tag"
                    ? COSMOS.starTag
                    : COSMOS.starConcept;
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
                      background: active ? "rgba(11, 15, 36, 0.7)" : "transparent",
                      color: active ? COSMOS.text : COSMOS.textFaint,
                      border: `1px solid ${active ? colour + "44" : COSMOS.border}`,
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 12,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "border 0.15s ease, background 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${COSMOS.starCore} 0%, ${colour} 50%, transparent 100%)`,
                        boxShadow: active ? `0 0 8px ${colour}aa` : "none",
                        opacity: active ? 1 : 0.35,
                      }}
                    />
                    <span style={{ flex: 1, textTransform: "capitalize" }}>{k}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {data.clusters.length > 0 && (
            <div>
              <label
                className="font-mono uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  color: COSMOS.textFaint,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Nebulae
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {data.clusters.slice(0, 8).map((c, idx) => {
                  const palette = clusterPalette(idx);
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "2px 0",
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 6,
                          borderRadius: 3,
                          background: `linear-gradient(to right, ${palette.hex}cc, ${palette.hex}33)`,
                          boxShadow: `0 0 6px ${palette.hex}66`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: COSMOS.textMuted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={c.label}
                      >
                        {c.label}
                      </span>
                    </div>
                  );
                })}
                {data.clusters.length > 8 && (
                  <span style={{ fontSize: 10, color: COSMOS.textFaint, paddingTop: 2 }}>
                    +{data.clusters.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${COSMOS.border}`, paddingTop: 12, marginTop: "auto" }}>
            <p
              className="font-mono"
              style={{
                color: COSMOS.textMuted,
                lineHeight: 1.7,
                margin: 0,
                fontSize: 10,
                letterSpacing: 0.3,
              }}
            >
              <span style={{ color: COSMOS.text }}>{visible.nodes.length}</span>
              {" / "}
              {data.nodes.length} visible stars
              <br />
              <span style={{ color: COSMOS.text }}>{visible.edges.length}</span>
              {" / "}
              {data.edges.length} threads
            </p>
            {(data.counts.cappedConcepts || data.counts.cappedDocs) && (
              <p
                style={{
                  color: COSMOS.textFaint,
                  marginTop: 8,
                  lineHeight: 1.5,
                  fontSize: 10,
                }}
              >
                Capped at top 200 concepts / 200 most-recent docs.
              </p>
            )}
          </div>
        </aside>

        {/* Center: cosmos canvas */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {/* Layer 0: deep stars (already at root); add a closer star
              layer here that subtly parallaxes with pan. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              transform: `translate(${vp.x * 0.04}px, ${vp.y * 0.04}px)`,
            }}
          >
            <StarField stars={bgStars} />
          </div>

          {/* Layer 1: Nebula clouds — transform with the same viewport
              transform xyflow uses, so they sit "under" the stars. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              transformOrigin: "0 0",
              transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
              willChange: "transform",
            }}
          >
            <NebulaLayer blobs={nebulaBlobs} />
          </div>

          {/* Layer 2: the actual graph */}
          <ReactFlow
            nodes={visible.nodes}
            edges={visible.edges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            panOnDrag
            zoomOnScroll
            minZoom={0.25}
            maxZoom={3.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onMove={(_, v: Viewport) => {
              setZoom(v.zoom);
              setVp({ x: v.x, y: v.y, zoom: v.zoom });
            }}
            onNodeClick={(_, n) => setSelectedId(n.id === selectedId ? null : n.id)}
            onPaneClick={() => setSelectedId(null)}
            proOptions={{ hideAttribution: true }}
            style={{ background: "transparent" }}
          >
            <Controls
              showInteractive={false}
              position="bottom-right"
            />
          </ReactFlow>
        </div>

        {/* Right: selected-star detail panel */}
        {selected && (
          <aside
            style={{
              width: 320,
              borderLeft: `1px solid ${COSMOS.border}`,
              padding: "18px 18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              overflowY: "auto",
              flexShrink: 0,
              background: "rgba(3, 4, 10, 0.72)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: 1.2,
                  color:
                    selected.kind === "doc"
                      ? COSMOS.starDoc
                      : selected.kind === "entity"
                      ? COSMOS.starEntity
                      : selected.kind === "tag"
                      ? COSMOS.starTag
                      : COSMOS.starConcept,
                  textShadow: `0 0 6px currentColor`,
                }}
              >
                {selected.kind}
              </span>
              <span className="font-mono" style={{ color: COSMOS.textFaint, fontSize: 10 }}>
                {selected.createdAt.slice(0, 10)}
              </span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COSMOS.textFaint,
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
                fontSize: 17,
                fontWeight: 600,
                color: COSMOS.text,
                lineHeight: 1.3,
                letterSpacing: 0.2,
              }}
            >
              {selected.label}
            </h3>

            {selected.description && (
              <p style={{ color: COSMOS.textMuted, lineHeight: 1.55, margin: 0, fontSize: 13 }}>
                {selected.description}
              </p>
            )}

            {selected.kind !== "doc" && (selected.occurrence || 0) > 0 && (
              <p style={{ color: COSMOS.textFaint, margin: 0, fontSize: 12 }}>
                magnitude {selected.occurrence} (mentioned in{" "}
                {(selected.docIds || []).length}{" "}
                {(selected.docIds || []).length === 1 ? "doc" : "docs"})
              </p>
            )}

            {linkedDocs.length > 0 && (
              <div>
                <label
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: 1,
                    color: COSMOS.textFaint,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Anchored to
                </label>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {linkedDocs.map((d) => {
                    const id = d.id.startsWith("doc:") ? d.id.slice(4) : d.id;
                    return (
                      <li key={d.id}>
                        <a
                          href={`/${id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: COSMOS.text,
                            textDecoration: "none",
                            display: "block",
                            padding: "4px 0",
                            fontSize: 12,
                            borderBottom: `1px solid ${COSMOS.border}`,
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
              <a
                href={`/${selected.id.startsWith("doc:") ? selected.id.slice(4) : selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: COSMOS.starTag,
                  textDecoration: "none",
                  fontSize: 13,
                  marginTop: 2,
                  textShadow: `0 0 6px ${COSMOS.starTag}55`,
                }}
              >
                Open document →
              </a>
            )}

            {visible.neighbours.size > 0 && (
              <div>
                <label
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: 1,
                    color: COSMOS.textFaint,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Connected stars
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.from(visible.neighbours)
                    .map((id) => apiNodeMap.get(id))
                    .filter((n): n is ApiNode => !!n && n.kind !== "doc")
                    .slice(0, 12)
                    .map((n) => {
                      const c =
                        n.kind === "entity"
                          ? COSMOS.starEntity
                          : n.kind === "tag"
                          ? COSMOS.starTag
                          : COSMOS.starConcept;
                      return (
                        <button
                          key={n.id}
                          onClick={() => setSelectedId(n.id)}
                          style={{
                            background: "rgba(11, 15, 36, 0.6)",
                            color: COSMOS.text,
                            border: `1px solid ${c}44`,
                            borderRadius: 4,
                            padding: "3px 8px",
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          {n.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom: time slider — the cosmos clock */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderTop: `1px solid ${COSMOS.border}`,
          gap: 14,
          flexShrink: 0,
          background: "rgba(3, 4, 10, 0.55)",
          backdropFilter: "blur(8px)",
          zIndex: 2,
        }}
      >
        <span
          className="font-mono"
          style={{ color: COSMOS.textFaint, fontSize: 10, letterSpacing: 0.5, flexShrink: 0 }}
        >
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
          className="galaxy-range"
          style={{ flex: 1, cursor: "pointer" }}
        />
        <span
          className="font-mono"
          style={{
            color: COSMOS.text,
            fontSize: 11,
            minWidth: 90,
            textAlign: "right",
            letterSpacing: 0.5,
            textShadow: `0 0 6px ${COSMOS.starTag}33`,
          }}
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
