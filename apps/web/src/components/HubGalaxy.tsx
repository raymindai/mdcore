"use client";

// Hub Galaxy — pure SVG cosmos.
//
// Why SVG (and not xyflow): xyflow renders each node as an HTML div,
// which means anything with a radial gradient ends up boxed in a
// rectangular container with a hard alpha edge — looks like a "dark
// border" the moment you zoom in. SVG circles + <feGaussianBlur>
// filters give us real cinematic glow that fades smoothly into the
// dark cosmos, and edges become visible coloured threads instead of
// hairline strokes.
//
// API:  GET /api/user/hub/constellation  (owner-only)
// Auth: handled by GalaxyClient — we just pass headers through.
//
// Anti-patterns we avoid (per claude memory
// `start_growing_hub_concept_2026_05`):
//   - No gamification / badges
//   - No social comparison
//   - No "you broke your streak" shame
// The galaxy is visceral by intent — labels appear, things glow,
// connections light up — not a scorecard.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
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

// Hard-coded cosmos palette — keeps /galaxy on-brand with mdfy.app
// (warm zinc + orange). No cyan / purple / pink anywhere; cool hues
// belong in other products. A galaxy is a place, not a UI surface.
const COSMOS = {
  bg: "#0a0908",
  bgGradient:
    "radial-gradient(ellipse at 30% 18%, #1a1410 0%, #0e0a07 40%, #060403 78%)",
  text: "#f5f4ef",
  textMuted: "#a8a29e",
  textFaint: "#57534e",
  border: "rgba(245, 244, 239, 0.07)",
  // Star colours by kind — kept inside a warm zinc+orange spectrum.
  // Variation comes from saturation, not hue.
  starDoc: "#f5f4ef",     // warm white — main sequence
  starConcept: "#fb923c", // mdfy accent orange — primary stars
  starEntity: "#ea580c",  // deeper orange — proper nouns
  starTag: "#c8a787",     // muted warm peach — meta labels
};

// Per-bundle nebula palette — orange/warm variants only. Each cluster
// gets a different temperature inside the same warm family so bundles
// read distinct without breaking the brand.
const NEBULA_PALETTE = [
  "#fb923c", // mdfy orange
  "#ffb677", // light peach
  "#d4a373", // sandy
  "#b08968", // warm taupe
  "#ffd5a5", // cream
  "#ea580c", // deep orange
];

const KIND_ORDER: Array<ApiNode["kind"]> = ["concept", "entity", "tag", "doc"];

function colourForKind(kind: ApiNode["kind"]): string {
  if (kind === "entity") return COSMOS.starEntity;
  if (kind === "tag") return COSMOS.starTag;
  if (kind === "doc") return COSMOS.starDoc;
  return COSMOS.starConcept;
}
function colourForBundle(bundleId: string | null | undefined, clusters: ApiCluster[]): string {
  if (!bundleId) return COSMOS.starDoc;
  const idx = clusters.findIndex((c) => c.id === bundleId);
  return idx >= 0 ? NEBULA_PALETTE[idx % NEBULA_PALETTE.length] : COSMOS.starDoc;
}

interface Positioned {
  id: string;
  x: number;
  y: number;
  api: ApiNode;
  size: number;        // base radius of the visible core
  colour: string;      // star colour (kind for concepts, bundle hue for docs)
  twinkleDelay: number;
}

interface NebulaBlob {
  id: string;
  x: number;
  y: number;
  radius: number;
  colour: string;
}

const elk = new ELK();
async function layoutGraph(nodes: ApiNode[], edges: ApiEdge[]): Promise<Map<string, { x: number; y: number }>> {
  const result = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "force",
      "elk.force.iterations": "200",
      "elk.spacing.nodeNode": "44",
      "elk.padding": "[top=40, left=40, bottom=40, right=40]",
    },
    children: nodes.map((n) => ({ id: n.id, width: 24, height: 24 })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const map = new Map<string, { x: number; y: number }>();
  for (const c of result.children || []) {
    map.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 });
  }
  return map;
}

// CSS keyframes — twinkle + four float patterns (assigned by idx % 4)
// so stars drift on staggered orbits. Edges stay anchored to the
// node's mathematical position, so the floats read as "stars breathe"
// rather than "the whole graph wobbles." Injected once.
function GalaxyKeyframes() {
  return (
    <style>{`
      @keyframes galaxyTwinkle {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      @keyframes galaxyFloat0 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(1.6px, -1.2px); }
      }
      @keyframes galaxyFloat1 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(-1.4px, 1.4px); }
      }
      @keyframes galaxyFloat2 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(0.8px, 1.6px); }
      }
      @keyframes galaxyFloat3 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(-1.2px, -0.8px); }
      }
      @keyframes galaxyNebulaDrift {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(6px, -8px); }
      }
      @keyframes galaxyPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      .galaxy-star {
        transform-box: fill-box;
        transform-origin: center;
      }
      .galaxy-input::placeholder { color: ${COSMOS.textFaint}; }
      .galaxy-range {
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right, ${COSMOS.starTag}66 0%, ${COSMOS.starConcept}44 100%);
        height: 2px;
        border-radius: 1px;
      }
      .galaxy-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 12px ${COSMOS.starTag}, 0 0 4px #ffffff;
        cursor: pointer;
        border: none;
      }
      .galaxy-range::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 12px ${COSMOS.starTag};
        cursor: pointer;
        border: none;
      }
    `}</style>
  );
}

export default function HubGalaxy({ authHeaders }: Props) {
  const [data, setData] = useState<GalaxyData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }> | null>(null);
  const [sliderDate, setSliderDate] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleKinds, setVisibleKinds] = useState<Set<ApiNode["kind"]>>(
    () => new Set(KIND_ORDER),
  );
  // View transform — pan + scale, applied to the world <g>.
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const playRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);

  // Fetch data
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
      const pos = await layoutGraph(data.nodes, data.edges);
      if (!cancelled) setPositions(pos);
    })();
    return () => { cancelled = true; };
  }, [data]);

  // Container size — fit-to-content needs to know the canvas size.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [loaded]);

  // Positioned nodes (after layout). Stable across re-renders.
  const all = useMemo<Positioned[]>(() => {
    if (!data || !positions) return [];
    return data.nodes.map((n, idx) => {
      const p = positions.get(n.id) || { x: 0, y: 0 };
      const colour = n.kind === "doc"
        ? colourForBundle(n.bundleId, data.clusters)
        : colourForKind(n.kind);
      // Core radius — wider dynamic range so the big concepts read as
      // giants, not as "slightly larger dots." sqrt curve so growth
      // tapers off (a 50-occurrence concept isn't 5× the size of a
      // 10-occurrence one — that would crowd the canvas).
      const occ = n.occurrence || 1;
      const size = n.kind === "doc"
        ? 1.6
        : Math.max(1.2, Math.min(9, Math.sqrt(occ) * 1.8));
      return {
        id: n.id,
        x: p.x,
        y: p.y,
        api: n,
        size,
        colour,
        twinkleDelay: (idx * 0.37) % 6,
      };
    });
  }, [data, positions]);

  // Fit-to-view once layout + size are known.
  // Only auto-fits once on initial load; user pan/zoom takes over after that.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current) return;
    if (all.length === 0 || size.w === 0 || size.h === 0) return;
    const xs = all.map((n) => n.x);
    const ys = all.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const bbW = Math.max(1, maxX - minX);
    const bbH = Math.max(1, maxY - minY);
    const margin = 80;
    const k = Math.min((size.w - margin * 2) / bbW, (size.h - margin * 2) / bbH);
    const clampedK = Math.max(0.2, Math.min(3, k));
    const x = size.w / 2 - (minX + bbW / 2) * clampedK;
    const y = size.h / 2 - (minY + bbH / 2) * clampedK;
    setView({ x, y, k: clampedK });
    didFitRef.current = true;
  }, [all, size]);

  // Compute visible set (filter / search / slider applied).
  const apiMap = useMemo(() => {
    const m = new Map<string, ApiNode>();
    for (const n of data?.nodes || []) m.set(n.id, n);
    return m;
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return { nodes: [] as Positioned[], edges: [] as ApiEdge[], neighbours: new Set<string>() };
    const cutoff = (sliderDate || data.hubEnd) + "T23:59:59Z";
    const term = searchTerm.trim().toLowerCase();
    const visibleIds = new Set<string>();
    for (const n of data.nodes) {
      if (n.createdAt > cutoff) continue;
      if (!visibleKinds.has(n.kind)) continue;
      visibleIds.add(n.id);
    }
    const neighbours = new Set<string>();
    if (selectedId && visibleIds.has(selectedId)) {
      for (const e of data.edges) {
        if (e.createdAt > cutoff) continue;
        if (e.source === selectedId && visibleIds.has(e.target)) neighbours.add(e.target);
        if (e.target === selectedId && visibleIds.has(e.source)) neighbours.add(e.source);
      }
    }
    const nodes = all.filter((n) => visibleIds.has(n.id) && (!term || n.api.label.toLowerCase().includes(term) || selectedId === n.id || neighbours.has(n.id)));
    const edges = data.edges.filter(
      (e) => e.createdAt <= cutoff && visibleIds.has(e.source) && visibleIds.has(e.target),
    );
    return { nodes, edges, neighbours };
  }, [data, all, sliderDate, visibleKinds, searchTerm, selectedId]);

  // Nebula blobs — centroid of each bundle's doc nodes.
  const nebulae = useMemo<NebulaBlob[]>(() => {
    if (!data || all.length === 0) return [];
    const byBundle = new Map<string, Positioned[]>();
    for (const n of all) {
      if (n.api.kind !== "doc" || !n.api.bundleId) continue;
      const arr = byBundle.get(n.api.bundleId) || [];
      arr.push(n);
      byBundle.set(n.api.bundleId, arr);
    }
    const out: NebulaBlob[] = [];
    data.clusters.forEach((c, idx) => {
      const members = byBundle.get(c.id);
      if (!members || members.length === 0) return;
      const cx = members.reduce((s, m) => s + m.x, 0) / members.length;
      const cy = members.reduce((s, m) => s + m.y, 0) / members.length;
      // Radius grows gently with member count; clamped so big bundles
      // don't drown the canvas. Pulled tighter than before — nebulae
      // should suggest grouping, not dominate the scene.
      const radius = Math.min(260, 90 + members.length * 14);
      out.push({
        id: c.id,
        x: cx,
        y: cy,
        radius,
        colour: NEBULA_PALETTE[idx % NEBULA_PALETTE.length],
      });
    });
    return out;
  }, [data, all]);

  // Replay animation
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

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
    };
  }, [view.x, view.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setView((v) => ({ ...v, x: dragRef.current!.viewX + dx, y: dragRef.current!.viewY + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Zoom on wheel, centred on cursor (so what's under the mouse stays put).
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const delta = -e.deltaY * 0.0014;
      const newK = Math.max(0.2, Math.min(4, v.k * (1 + delta)));
      const x = mx - (mx - v.x) * (newK / v.k);
      const y = my - (my - v.y) * (newK / v.k);
      return { x, y, k: newK };
    });
  }, []);

  // Recentre / refit
  const handleRecentre = useCallback(() => {
    if (visible.nodes.length === 0 || size.w === 0) return;
    const xs = visible.nodes.map((n) => n.x);
    const ys = visible.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const bbW = Math.max(1, maxX - minX);
    const bbH = Math.max(1, maxY - minY);
    const margin = 80;
    const k = Math.min((size.w - margin * 2) / bbW, (size.h - margin * 2) / bbH);
    const clampedK = Math.max(0.2, Math.min(3, k));
    const x = size.w / 2 - (minX + bbW / 2) * clampedK;
    const y = size.h / 2 - (minY + bbH / 2) * clampedK;
    setView({ x, y, k: clampedK });
  }, [visible.nodes, size]);

  // Native wheel listener — React's synthetic wheel is passive by default,
  // so preventDefault inside it gets ignored and the page scrolls instead
  // of zooming. Attach with passive:false.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      e.preventDefault();
      setView((v) => {
        const delta = -e.deltaY * 0.0014;
        const newK = Math.max(0.2, Math.min(4, v.k * (1 + delta)));
        const x = mx - (mx - v.x) * (newK / v.k);
        const y = my - (my - v.y) * (newK / v.k);
        return { x, y, k: newK };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Selection + linked docs for detail panel
  const selected = selectedId ? apiMap.get(selectedId) : null;
  const linkedDocs = useMemo(() => {
    if (!selected || !data) return [];
    if (selected.kind === "doc") return [];
    return (selected.docIds || [])
      .map((id) => apiMap.get(`doc:${id}`))
      .filter((n): n is ApiNode => !!n)
      .slice(0, 12);
  }, [selected, data, apiMap]);

  // Shared cosmos wrap for loading / auth / empty states.
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
        <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: COSMOS.textMuted }}>
          Locating galaxy…
        </span>
      </div>
    );
  }
  if (error === "auth") {
    return (
      <div style={{ ...cosmosWrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <GalaxyKeyframes />
        <p style={{ color: COSMOS.textMuted, fontSize: 14 }}>Sign in to see your galaxy.</p>
        <Link href="/" style={{ background: COSMOS.starTag, color: "#000", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600, boxShadow: `0 0 24px ${COSMOS.starTag}55` }}>
          Go to mdfy.app
        </Link>
      </div>
    );
  }
  if (!data || data.nodes.length === 0) {
    return (
      <div style={{ ...cosmosWrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <GalaxyKeyframes />
        <p style={{ color: COSMOS.textMuted, fontSize: 14, maxWidth: 360, textAlign: "center", lineHeight: 1.55 }}>
          Your galaxy is empty so far. Capture a few docs and let analysis run — concepts and connections will appear here as stars.
        </p>
        <Link href="/" style={{ background: COSMOS.starTag, color: "#000", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600, boxShadow: `0 0 24px ${COSMOS.starTag}55` }}>
          Back to editor
        </Link>
      </div>
    );
  }

  const searchActive = searchTerm.trim().length > 0;
  const term = searchTerm.trim().toLowerCase();

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
        <Link href="/" style={{ color: COSMOS.textMuted, textDecoration: "none", fontSize: 13 }}>
          ← Back
        </Link>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: 2, color: COSMOS.text, textShadow: `0 0 8px ${COSMOS.starTag}55` }}
        >
          Galaxy
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10, color: COSMOS.textFaint, letterSpacing: 0.5 }}
        >
          {data.counts.nodes} stars / {data.clusters.length} nebulae
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={handleRecentre}
          style={{
            background: "transparent",
            color: COSMOS.textMuted,
            border: `1px solid ${COSMOS.border}`,
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 11,
            cursor: "pointer",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          Recentre
        </button>
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

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative", zIndex: 1 }}>
        {/* Left sidebar */}
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
            <label className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: 1, color: COSMOS.textFaint, display: "block", marginBottom: 6 }}>
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
            <label className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: 1, color: COSMOS.textFaint, display: "block", marginBottom: 6 }}>
              Star kinds
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {KIND_ORDER.map((k) => {
                const active = visibleKinds.has(k);
                const c = colourForKind(k);
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
                      border: `1px solid ${active ? c + "44" : COSMOS.border}`,
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
                        background: `radial-gradient(circle, #fff 0%, ${c} 50%, transparent 100%)`,
                        boxShadow: active ? `0 0 8px ${c}aa` : "none",
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
              <label className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: 1, color: COSMOS.textFaint, display: "block", marginBottom: 6 }}>
                Nebulae
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {data.clusters.slice(0, 8).map((c, idx) => {
                  const colour = NEBULA_PALETTE[idx % NEBULA_PALETTE.length];
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                      <span
                        style={{
                          width: 18,
                          height: 6,
                          borderRadius: 3,
                          background: `linear-gradient(to right, ${colour}cc, ${colour}33)`,
                          boxShadow: `0 0 6px ${colour}66`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{ fontSize: 11, color: COSMOS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
            <p className="font-mono" style={{ color: COSMOS.textMuted, lineHeight: 1.7, margin: 0, fontSize: 10, letterSpacing: 0.3 }}>
              <span style={{ color: COSMOS.text }}>{visible.nodes.length}</span>
              {" / "}
              {data.nodes.length} visible stars
              <br />
              <span style={{ color: COSMOS.text }}>{visible.edges.length}</span>
              {" / "}
              {data.edges.length} threads
            </p>
            {(data.counts.cappedConcepts || data.counts.cappedDocs) && (
              <p style={{ color: COSMOS.textFaint, marginTop: 8, lineHeight: 1.5, fontSize: 10 }}>
                Capped at top 200 concepts / 200 most-recent docs.
              </p>
            )}
            <p style={{ color: COSMOS.textFaint, marginTop: 10, fontSize: 10, lineHeight: 1.5 }}>
              Drag to pan · scroll to zoom
            </p>
          </div>
        </aside>

        {/* SVG cosmos canvas */}
        <div
          ref={containerRef}
          style={{ flex: 1, minWidth: 0, position: "relative", cursor: dragRef.current ? "grabbing" : "grab" }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={(e) => {
              if (e.target === svgRef.current) setSelectedId(null);
            }}
            style={{ display: "block" }}
          >
            <defs>
              {/* Soft glow for the core white dot — turns the pinpoint into a star */}
              <filter id="glow-core" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="1.4" result="b1" />
                <feMerge>
                  <feMergeNode in="b1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-core-strong" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur stdDeviation="3" result="b1" />
                <feMerge>
                  <feMergeNode in="b1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Big soft blur for nebula clouds */}
              <filter id="nebula-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="32" />
              </filter>
              {/* Edge glow for selected paths */}
              <filter id="thread-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b1" />
                <feMerge>
                  <feMergeNode in="b1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Per-kind halo gradient — fades all the way to transparent */}
              {(["doc", "concept", "entity", "tag"] as const).map((k) => {
                const c = colourForKind(k);
                return (
                  <radialGradient key={k} id={`halo-${k}`}>
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="20%" stopColor={c} stopOpacity="0.7" />
                    <stop offset="55%" stopColor={c} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={c} stopOpacity="0" />
                  </radialGradient>
                );
              })}

              {/* Per-bundle doc halo — uses bundle hue instead of kind */}
              {nebulae.map((b) => (
                <radialGradient key={`doc-${b.id}`} id={`halo-doc-${b.id}`}>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="20%" stopColor={b.colour} stopOpacity="0.75" />
                  <stop offset="55%" stopColor={b.colour} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={b.colour} stopOpacity="0" />
                </radialGradient>
              ))}

              {/* Nebula cloud gradients — softer than before so they
                  hint at clustering instead of competing with stars. */}
              {nebulae.map((b) => (
                <radialGradient key={`neb-${b.id}`} id={`neb-${b.id}`}>
                  <stop offset="0%" stopColor={b.colour} stopOpacity="0.22" />
                  <stop offset="45%" stopColor={b.colour} stopOpacity="0.07" />
                  <stop offset="100%" stopColor={b.colour} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {/* World group — all coordinates are in flow-space, transformed
                by the view (pan + zoom). */}
            <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
              {/* Layer 1: nebulae (screen-blended so they brighten the
                  bg without darkening anything). Pre-blurred via SVG
                  filter. Each cloud drifts on its own slow period —
                  that's the "stuff is happening" cue even when nothing
                  is selected. */}
              <g style={{ mixBlendMode: "screen" }}>
                {nebulae.map((b, idx) => (
                  <circle
                    key={b.id}
                    cx={b.x}
                    cy={b.y}
                    r={b.radius}
                    fill={`url(#neb-${b.id})`}
                    filter="url(#nebula-blur)"
                    style={{
                      animation: `galaxyNebulaDrift ${28 + (idx % 5) * 6}s ease-in-out infinite`,
                      animationDelay: `-${idx * 3.7}s`,
                      transformOrigin: `${b.x}px ${b.y}px`,
                    }}
                  />
                ))}
              </g>

              {/* Layer 2: edges as gentle bezier curves. Render below
                  nodes so stars sit on top of their connections.
                  Default opacity is intentionally near-invisible — the
                  full graph reads as a soft web; selection lights up
                  just the relevant path. */}
              <g>
                {visible.edges.map((e) => {
                  const a = positions?.get(e.source);
                  const b = positions?.get(e.target);
                  if (!a || !b) return null;
                  const isSelectedEnd = selectedId !== null && (e.source === selectedId || e.target === selectedId);
                  const anyDimmer = selectedId !== null || searchActive;
                  // Deterministic curve direction per edge so the
                  // network isn't visually thrashed across re-renders.
                  let h = 0;
                  for (let i = 0; i < e.id.length; i++) h = ((h << 5) - h + e.id.charCodeAt(i)) | 0;
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const sign = (h & 1) ? 1 : -1;
                  const bend = Math.min(60, len * 0.18) * sign;
                  // Perpendicular vector for control-point offset.
                  const cx = (a.x + b.x) / 2 + (-dy / len) * bend;
                  const cy = (a.y + b.y) / 2 + (dx / len) * bend;
                  const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
                  return (
                    <path
                      key={e.id}
                      d={d}
                      fill="none"
                      stroke={isSelectedEnd ? COSMOS.starConcept : COSMOS.text}
                      strokeOpacity={
                        isSelectedEnd
                          ? 0.65
                          : anyDimmer
                            ? 0.015
                            : e.kind === "concept_concept" ? 0.09 : 0.05
                      }
                      strokeWidth={(isSelectedEnd ? 0.9 : 0.35) / Math.max(0.5, view.k * 0.7)}
                      strokeLinecap="round"
                      filter={isSelectedEnd ? "url(#thread-glow)" : undefined}
                    />
                  );
                })}
              </g>

              {/* Layer 3: stars. Each star gets one of four float
                  keyframes so the field "breathes" on different
                  phases — that's the position-based animation. The
                  edges deliberately don't follow (stars float ±1.5px,
                  far below their gap to neighbours), which keeps the
                  layout stable while the cosmos feels alive. */}
              <g>
                {visible.nodes.map((n, idx) => {
                  const matched = !searchActive || n.api.label.toLowerCase().includes(term);
                  const isSelected = n.id === selectedId;
                  const isNeighbour = visible.neighbours.has(n.id);
                  // Dim hard: anything not part of the current focus
                  // (selection, neighbours, search match) drops far down.
                  const focusing = selectedId !== null || searchActive;
                  const inFocus = isSelected || isNeighbour || (searchActive && matched);
                  const dimmed = focusing && !inFocus;
                  // Halo radius — relative to core size, big enough for
                  // the gradient to fade nicely without rectangular edges
                  // (which is exactly why we left HTML behind).
                  const haloR = n.size * (isSelected ? 7 : 4.5);
                  const coreR = n.size * (isSelected ? 1.5 : 1);
                  const haloFill =
                    n.api.kind === "doc" && n.api.bundleId
                      ? `url(#halo-doc-${n.api.bundleId})`
                      : `url(#halo-${n.api.kind})`;
                  // Label visibility: at zoom >= 1.4, or always for selected / neighbour / search-match.
                  const showLabel =
                    isSelected || isNeighbour || (searchActive && matched) || view.k >= 1.4;
                  // Stagger float animations — period 7-13s so the
                  // whole field doesn't pulse in lockstep.
                  const floatIdx = idx % 4;
                  const period = 7 + (idx % 7);
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(n.id === selectedId ? null : n.id);
                      }}
                      style={{
                        cursor: "pointer",
                        opacity: dimmed ? 0.05 : 1,
                        transition: "opacity 0.3s ease",
                      }}
                    >
                      <g
                        className="galaxy-star"
                        style={{
                          animation: `galaxyFloat${floatIdx} ${period}s ease-in-out infinite`,
                          animationDelay: `-${n.twinkleDelay * 1.2}s`,
                        }}
                      >
                        {/* Halo — pure gradient circle, no border because
                            the gradient fades to opacity 0. */}
                        <circle
                          r={haloR}
                          fill={haloFill}
                          style={{
                            animation: `galaxyTwinkle ${5 + (n.twinkleDelay % 4)}s ease-in-out infinite`,
                            animationDelay: `-${n.twinkleDelay}s`,
                          }}
                        />
                        {/* Core — bright pinpoint, blurred by SVG
                            filter for the actual "star" feel. Selected
                            stars also pulse to draw the eye. */}
                        <circle
                          r={coreR}
                          fill={COSMOS.text}
                          filter={isSelected ? "url(#glow-core-strong)" : "url(#glow-core)"}
                          style={isSelected ? {
                            animation: `galaxyPulse 2.4s ease-in-out infinite`,
                            transformBox: "fill-box",
                            transformOrigin: "center",
                          } : undefined}
                        />
                      </g>
                      {showLabel && (
                        <text
                          y={haloR + 10}
                          textAnchor="middle"
                          style={{
                            fontSize: 10 / Math.max(0.6, view.k * 0.7),
                            fill: COSMOS.text,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            letterSpacing: 0.3,
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "rgba(10, 9, 8, 0.85)",
                            strokeWidth: 3 / Math.max(0.6, view.k * 0.7),
                            strokeLinejoin: "round",
                            opacity: dimmed ? 0 : 0.85,
                          }}
                        >
                          {n.api.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>

        {/* Detail panel */}
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
                  color: colourForKind(selected.kind),
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

            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: COSMOS.text, lineHeight: 1.3, letterSpacing: 0.2 }}>
              {selected.label}
            </h3>

            {selected.description && (
              <p style={{ color: COSMOS.textMuted, lineHeight: 1.55, margin: 0, fontSize: 13 }}>
                {selected.description}
              </p>
            )}

            {selected.kind !== "doc" && (selected.occurrence || 0) > 0 && (
              <p style={{ color: COSMOS.textFaint, margin: 0, fontSize: 12 }}>
                magnitude {selected.occurrence} (mentioned in {(selected.docIds || []).length}{" "}
                {(selected.docIds || []).length === 1 ? "doc" : "docs"})
              </p>
            )}

            {linkedDocs.length > 0 && (
              <div>
                <label className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: 1, color: COSMOS.textFaint, display: "block", marginBottom: 6 }}>
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
                <label className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: 1, color: COSMOS.textFaint, display: "block", marginBottom: 6 }}>
                  Connected stars
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.from(visible.neighbours)
                    .map((id) => apiMap.get(id))
                    .filter((n): n is ApiNode => !!n && n.kind !== "doc")
                    .slice(0, 12)
                    .map((n) => {
                      const c = colourForKind(n.kind);
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

      {/* Bottom: time slider */}
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
        <span className="font-mono" style={{ color: COSMOS.textFaint, fontSize: 10, letterSpacing: 0.5, flexShrink: 0 }}>
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
