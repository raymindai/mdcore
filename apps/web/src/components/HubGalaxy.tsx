"use client";

// Hub Galaxy — pure SVG cosmos.
//
// Chrome (header / sidebar / detail panel / scrubber) uses mdfy CSS vars
// (--background, --surface, --border, --text-*, --accent), forced to
// dark theme. Canvas uses hand-picked hex (SVG gradient stops need
// explicit colours) inside mdfy's warm zinc + orange family.
//
// API:  GET /api/user/hub/constellation  (owner-only)

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Play, Pause, Maximize2 } from "lucide-react";
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

const SKY = {
  bg: "#09090b",
  bgGradient:
    "radial-gradient(ellipse at 30% 18%, #1a1410 0%, #0e0a07 42%, #09090b 78%)",
  starDoc: "#fafafa",
  starConcept: "#fb923c",
  starEntity: "#ea580c",
  starTag: "#a8a29e",
};

const NEBULA_PALETTE = [
  "#fb923c", "#ffb677", "#d4a373",
  "#b08968", "#ffd5a5", "#ea580c",
];

const KIND_ORDER: Array<ApiNode["kind"]> = ["concept", "entity", "tag", "doc"];

// Catalogues for fake astronomical designations — purely cosmetic.
// Deterministic per node id so the same star always carries the
// same name across reloads / sessions.
const CATALOGS = ["HD", "HIP", "NGC", "Kepler", "Gaia"];
function starDesignation(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  const abs = Math.abs(h);
  const cat = CATALOGS[abs % CATALOGS.length];
  const num = (abs >>> 8) % 99999;
  return `${cat}-${num}`;
}

function colourForKind(kind: ApiNode["kind"]): string {
  if (kind === "entity") return SKY.starEntity;
  if (kind === "tag") return SKY.starTag;
  if (kind === "doc") return SKY.starDoc;
  return SKY.starConcept;
}
function colourForBundle(bundleId: string | null | undefined, clusters: ApiCluster[]): string {
  if (!bundleId) return SKY.starDoc;
  const idx = clusters.findIndex((c) => c.id === bundleId);
  return idx >= 0 ? NEBULA_PALETTE[idx % NEBULA_PALETTE.length] : SKY.starDoc;
}

interface Positioned {
  id: string;
  x: number;
  y: number;
  api: ApiNode;
  size: number;
  colour: string;
  twinkleDelay: number;
}

interface NebulaBlob {
  id: string;
  x: number;
  y: number;
  radius: number;
  colour: string;
}

interface ShootingStar {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  totalLen: number;
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

function GalaxyKeyframes() {
  return (
    <style>{`
      @keyframes galaxyTwinkle {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      @keyframes galaxyFloat0 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(1.6px, -1.2px); } }
      @keyframes galaxyFloat1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-1.4px, 1.4px); } }
      @keyframes galaxyFloat2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(0.8px, 1.6px); } }
      @keyframes galaxyFloat3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-1.2px, -0.8px); } }
      @keyframes galaxyNebulaDrift {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(6px, -8px); }
      }
      @keyframes galaxyPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      /* Hover ripple — gentle expanding ring around the cursor target. */
      @keyframes galaxyHoverRipple {
        0%   { transform: scale(0.6); opacity: 0.5; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      /* Star ignite — a brief flash for a star appearing during Growth replay. */
      @keyframes galaxyIgnite {
        0%   { transform: scale(0.3); opacity: 0; }
        18%  { transform: scale(5); opacity: 0.95; }
        100% { transform: scale(18); opacity: 0; }
      }
      /* Search magnetic pulse — matched stars ring out, three times. */
      @keyframes galaxyMagneticPulse {
        0%   { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(3.6); opacity: 0; }
      }
      /* Shooting-star — animates stroke-dashoffset so a short trail
         segment travels along the line. --shoot-len is the path length
         in CSS pixels, set inline per instance. */
      @keyframes galaxyShoot {
        0%   { stroke-dashoffset: 0; opacity: 0; }
        7%   { opacity: 1; }
        92%  { opacity: 0.85; }
        100% { stroke-dashoffset: calc(var(--shoot-len) * -1); opacity: 0; }
      }
      .galaxy-star,
      .galaxy-pulse-ring,
      .galaxy-ignite-burst,
      .galaxy-hover-ring { transform-box: fill-box; transform-origin: center; }

      /* Range — mdfy accent on a thin track. */
      .galaxy-range {
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        height: 18px;
        cursor: pointer;
      }
      .galaxy-range::-webkit-slider-runnable-track {
        height: 2px;
        background: var(--border);
        border-radius: 1px;
      }
      .galaxy-range::-moz-range-track {
        height: 2px;
        background: var(--border);
        border-radius: 1px;
      }
      .galaxy-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        margin-top: -5px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-dim);
        border: none;
      }
      .galaxy-range::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-dim);
        border: none;
      }
    `}</style>
  );
}

function GalaxyButton({
  active,
  onClick,
  children,
  title,
  primary,
  floating,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  primary?: boolean;
  floating?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="text-caption font-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 10px",
        background: primary
          ? "var(--accent-dim)"
          : active
            ? "var(--toggle-bg)"
            : floating ? "rgba(9, 9, 11, 0.6)" : "transparent",
        color: primary || active ? "var(--accent)" : "var(--text-secondary)",
        border: "1px solid",
        borderColor: primary || active ? "var(--accent-dim)" : "var(--border)",
        borderRadius: 6,
        cursor: "pointer",
        letterSpacing: 0.3,
        transition: "background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default), border-color var(--duration-fast) var(--ease-default)",
        backdropFilter: floating ? "blur(8px)" : undefined,
      }}
    >
      {children}
    </button>
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pulseId, setPulseId] = useState(0);
  // Newly-ignited stars during Growth replay — id -> expiresAt(ms).
  const [igniteEntries, setIgniteEntries] = useState<Map<string, number>>(new Map());
  // Active shooting stars — auto-cleaned via setTimeout after their
  // CSS animation finishes.
  const [shooters, setShooters] = useState<ShootingStar[]>([]);
  const [visibleKinds, setVisibleKinds] = useState<Set<ApiNode["kind"]>>(
    () => new Set(KIND_ORDER),
  );
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const playRef = useRef<number | null>(null);
  const cameraAnimRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number; moved: boolean } | null>(null);
  const prevVisibleIdsRef = useRef<Set<string>>(new Set());

  // Fetch
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

  // Container size
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

  const all = useMemo<Positioned[]>(() => {
    if (!data || !positions) return [];
    return data.nodes.map((n, idx) => {
      const p = positions.get(n.id) || { x: 0, y: 0 };
      const colour = n.kind === "doc"
        ? colourForBundle(n.bundleId, data.clusters)
        : colourForKind(n.kind);
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

  const apiMap = useMemo(() => {
    const m = new Map<string, ApiNode>();
    for (const n of data?.nodes || []) m.set(n.id, n);
    return m;
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return { nodes: [] as Positioned[], edges: [] as ApiEdge[], neighbours: new Set<string>(), hoverNeighbours: new Set<string>() };
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
    const hoverNeighbours = new Set<string>();
    if (hoveredId && hoveredId !== selectedId && visibleIds.has(hoveredId)) {
      for (const e of data.edges) {
        if (e.createdAt > cutoff) continue;
        if (e.source === hoveredId && visibleIds.has(e.target)) hoverNeighbours.add(e.target);
        if (e.target === hoveredId && visibleIds.has(e.source)) hoverNeighbours.add(e.source);
      }
    }
    const nodes = all.filter((n) =>
      visibleIds.has(n.id) &&
      (!term || n.api.label.toLowerCase().includes(term) || selectedId === n.id || neighbours.has(n.id) || hoveredId === n.id || hoverNeighbours.has(n.id)),
    );
    const renderedIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => e.createdAt <= cutoff && renderedIds.has(e.source) && renderedIds.has(e.target),
    );
    return { nodes, edges, neighbours, hoverNeighbours };
  }, [data, all, sliderDate, visibleKinds, searchTerm, selectedId, hoveredId]);

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

  // Replay tween — also flag newly-appeared stars for the ignite flash.
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

  // Ignite tracker — when visible.nodes grows during play, flash the
  // new arrivals. Doesn't fire on manual scrubbing or kind-filter toggles.
  useEffect(() => {
    const currentIds = new Set(visible.nodes.map((n) => n.id));
    if (playing) {
      const prev = prevVisibleIdsRef.current;
      const newOnes: string[] = [];
      for (const id of currentIds) if (!prev.has(id)) newOnes.push(id);
      if (newOnes.length > 0) {
        const expiresAt = performance.now() + 900;
        setIgniteEntries((m) => {
          const next = new Map(m);
          for (const id of newOnes) next.set(id, expiresAt);
          return next;
        });
        for (const id of newOnes) {
          setTimeout(() => {
            setIgniteEntries((m) => {
              if (!m.has(id)) return m;
              const next = new Map(m);
              next.delete(id);
              return next;
            });
          }, 950);
        }
      }
    }
    prevVisibleIdsRef.current = currentIds;
  }, [visible.nodes, playing]);

  // Search magnetic pulse — bump pulse counter on each non-empty
  // search change. Matched stars get a transient ring overlay keyed
  // off pulseId so React re-mounts and the CSS animation restarts.
  useEffect(() => {
    if (searchTerm.trim().length > 0) setPulseId((p) => p + 1);
  }, [searchTerm]);

  // Shooting-star spawner — kicks off a new streak every 6-16s.
  // Lives in canvas-pixel space (not graph space) so it cuts across
  // the visible frame regardless of zoom.
  useEffect(() => {
    if (size.w === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      if (cancelled) return;
      const fromEdge = Math.floor(Math.random() * 4); // 0=top 1=right 2=bottom 3=left
      let fromX = 0, fromY = 0, toX = 0, toY = 0;
      if (fromEdge === 0) { fromX = Math.random() * size.w; fromY = -30; toX = fromX + (Math.random() - 0.5) * size.w * 0.6; toY = size.h * 0.7 + Math.random() * size.h * 0.3; }
      else if (fromEdge === 1) { fromX = size.w + 30; fromY = Math.random() * size.h * 0.5; toX = size.w * 0.2 + Math.random() * size.w * 0.5; toY = fromY + size.h * 0.5; }
      else if (fromEdge === 2) { fromX = Math.random() * size.w; fromY = size.h + 30; toX = fromX + (Math.random() - 0.5) * size.w * 0.5; toY = size.h * 0.3 - Math.random() * size.h * 0.3; }
      else { fromX = -30; fromY = Math.random() * size.h * 0.5; toX = size.w * 0.4 + Math.random() * size.w * 0.4; toY = fromY + size.h * 0.5; }
      const dx = toX - fromX, dy = toY - fromY;
      const totalLen = Math.sqrt(dx * dx + dy * dy);
      const id = `shoot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setShooters((s) => [...s, { id, fromX, fromY, toX, toY, totalLen }]);
      // Auto-clean after the streak's CSS animation completes.
      setTimeout(() => {
        setShooters((s) => s.filter((x) => x.id !== id));
      }, 1400);
      timer = setTimeout(spawn, 6000 + Math.random() * 10000);
    };
    // First streak after a short delay so the canvas isn't busy on load.
    timer = setTimeout(spawn, 3500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [size.w, size.h]);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
      moved: false,
    };
  }, [view.x, view.y]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    setView((v) => ({ ...v, x: dragRef.current!.viewX + dx, y: dragRef.current!.viewY + dy }));
  }, []);
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Native wheel listener with passive: false (so preventDefault works
  // and the page doesn't scroll behind the canvas). Re-attach when
  // the SVG mounts (deps include `loaded` because the SVG is in the
  // main render branch only).
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
  }, [loaded, error, data]);

  // Smooth camera animation between two view states (used by Fit and
  // double-click zoom-to-focus).
  const animateViewTo = useCallback((targetX: number, targetY: number, targetK: number, durationMs = 450) => {
    if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current);
    const fromX = viewRef.current.x;
    const fromY = viewRef.current.y;
    const fromK = viewRef.current.k;
    const startT = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - startT) / durationMs);
      // ease-in-out cubic
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setView({
        x: fromX + (targetX - fromX) * e,
        y: fromY + (targetY - fromY) * e,
        k: fromK + (targetK - fromK) * e,
      });
      if (t < 1) cameraAnimRef.current = requestAnimationFrame(tick);
      else cameraAnimRef.current = null;
    };
    cameraAnimRef.current = requestAnimationFrame(tick);
  }, []);

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
    animateViewTo(x, y, clampedK);
  }, [visible.nodes, size, animateViewTo]);

  // Double-click on a star → smooth fly-to. Picks a comfortable zoom
  // (1.6) unless the user is already deeper, in which case we keep them.
  const handleStarDoubleClick = useCallback((n: Positioned) => {
    const targetK = Math.max(viewRef.current.k, 1.6);
    const targetX = size.w / 2 - n.x * targetK;
    const targetY = size.h / 2 - n.y * targetK;
    animateViewTo(targetX, targetY, targetK, 520);
    setSelectedId(n.id);
  }, [size, animateViewTo]);

  const selected = selectedId ? apiMap.get(selectedId) : null;
  const linkedDocs = useMemo(() => {
    if (!selected || !data) return [];
    if (selected.kind === "doc") return [];
    return (selected.docIds || [])
      .map((id) => apiMap.get(`doc:${id}`))
      .filter((n): n is ApiNode => !!n)
      .slice(0, 12);
  }, [selected, data, apiMap]);

  // Slider helpers
  const sliderPct = useMemo(() => {
    if (!data) return 0;
    const startMs = new Date(data.hubStart + "T00:00:00Z").getTime();
    const endMs = new Date(data.hubEnd + "T00:00:00Z").getTime();
    const curMs = new Date((sliderDate || data.hubEnd) + "T00:00:00Z").getTime();
    const total = Math.max(1, endMs - startMs);
    return Math.max(0, Math.min(1, (curMs - startMs) / total));
  }, [data, sliderDate]);

  const todayPct = useMemo(() => {
    if (!data) return null;
    const startMs = new Date(data.hubStart + "T00:00:00Z").getTime();
    const endMs = new Date(data.hubEnd + "T00:00:00Z").getTime();
    const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
    if (todayMs < startMs || todayMs > endMs) return null;
    const total = Math.max(1, endMs - startMs);
    return (todayMs - startMs) / total;
  }, [data]);

  const cosmosWrap: React.CSSProperties = {
    height: "100vh",
    background: SKY.bg,
    backgroundImage: SKY.bgGradient,
    color: "var(--text-primary)",
    position: "relative",
    overflow: "hidden",
  };

  if (!loaded) {
    return (
      <div data-theme="dark" style={{ ...cosmosWrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GalaxyKeyframes />
        <span className="text-caption font-mono uppercase" style={{ letterSpacing: 1.5, color: "var(--text-muted)" }}>
          Locating galaxy…
        </span>
      </div>
    );
  }
  if (error === "auth") {
    return (
      <div data-theme="dark" style={{ ...cosmosWrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <GalaxyKeyframes />
        <p className="text-body" style={{ color: "var(--text-secondary)" }}>Sign in to see your galaxy.</p>
        <Link
          href="/"
          className="text-caption font-mono"
          style={{ background: "var(--accent)", color: "var(--background)", padding: "8px 16px", borderRadius: 6, textDecoration: "none", fontWeight: 600, letterSpacing: 0.3 }}
        >
          Go to mdfy.app
        </Link>
      </div>
    );
  }
  if (!data || data.nodes.length === 0) {
    return (
      <div data-theme="dark" style={{ ...cosmosWrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <GalaxyKeyframes />
        <p className="text-body" style={{ color: "var(--text-secondary)", maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>
          Your galaxy is empty so far. Capture a few docs and let analysis run — concepts and connections will appear here as stars.
        </p>
        <Link
          href="/"
          className="text-caption font-mono"
          style={{ background: "var(--accent)", color: "var(--background)", padding: "8px 16px", borderRadius: 6, textDecoration: "none", fontWeight: 600, letterSpacing: 0.3 }}
        >
          Back to editor
        </Link>
      </div>
    );
  }

  const searchActive = searchTerm.trim().length > 0;
  const term = searchTerm.trim().toLowerCase();
  // Matched-star ids for the magnetic-pulse overlay
  const matchedNodes = searchActive
    ? visible.nodes.filter((n) => n.api.label.toLowerCase().includes(term))
    : [];

  return (
    <div
      data-theme="dark"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: SKY.bg,
        backgroundImage: SKY.bgGradient,
        color: "var(--text-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GalaxyKeyframes />

      {/* Header */}
      <header
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border-dim)",
          gap: 16,
          flexShrink: 0,
          background: "var(--header-bg)",
          backdropFilter: "blur(12px)",
          zIndex: 3,
        }}
      >
        <Link href="/" className="text-caption" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          ← Back
        </Link>
        <span className="text-caption font-mono uppercase" style={{ color: "var(--text-primary)", letterSpacing: 1.5, fontWeight: 600 }}>
          Galaxy
        </span>
        <span className="text-caption font-mono" style={{ color: "var(--text-faint)", letterSpacing: 0.3 }}>
          {data.counts.nodes} stars / {data.clusters.length} nebulae
        </span>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative", zIndex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            borderRight: "1px solid var(--border-dim)",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            overflowY: "auto",
            flexShrink: 0,
            background: "color-mix(in srgb, var(--background) 70%, transparent 30%)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div>
            <label className="text-caption font-mono uppercase" style={{ color: "var(--text-faint)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="filter by label"
              className="text-body font-mono"
              style={{
                width: "100%",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 10px",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label className="text-caption font-mono uppercase" style={{ color: "var(--text-faint)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>
              Star kinds
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                    className="text-caption"
                    style={{
                      background: active ? "var(--toggle-bg)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-faint)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: 6,
                      padding: "5px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, #fff 0%, ${c} 50%, transparent 100%)`,
                        boxShadow: active ? `0 0 6px ${c}aa` : "none",
                        opacity: active ? 1 : 0.4,
                        flexShrink: 0,
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
              <label className="text-caption font-mono uppercase" style={{ color: "var(--text-faint)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>
                Nebulae
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {data.clusters.slice(0, 8).map((c, idx) => {
                  const colour = NEBULA_PALETTE[idx % NEBULA_PALETTE.length];
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                      <span
                        style={{
                          width: 16,
                          height: 4,
                          borderRadius: 2,
                          background: `linear-gradient(to right, ${colour}, ${colour}33)`,
                          boxShadow: `0 0 6px ${colour}55`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="text-caption"
                        style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={c.label}
                      >
                        {c.label}
                      </span>
                    </div>
                  );
                })}
                {data.clusters.length > 8 && (
                  <span className="text-caption font-mono" style={{ color: "var(--text-faint)", paddingTop: 2 }}>
                    +{data.clusters.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 12, marginTop: "auto" }}>
            <p className="text-caption font-mono" style={{ color: "var(--text-muted)", lineHeight: 1.7, margin: 0, letterSpacing: 0.3 }}>
              <span style={{ color: "var(--text-primary)" }}>{visible.nodes.length}</span>
              {" / "}
              {data.nodes.length} stars
              <br />
              <span style={{ color: "var(--text-primary)" }}>{visible.edges.length}</span>
              {" / "}
              {data.edges.length} threads
            </p>
            {(data.counts.cappedConcepts || data.counts.cappedDocs) && (
              <p className="text-caption" style={{ color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>
                Capped at top 200 concepts / 200 most-recent docs.
              </p>
            )}
            <p className="text-caption font-mono" style={{ color: "var(--text-faint)", marginTop: 10, lineHeight: 1.6, letterSpacing: 0.3 }}>
              drag to pan / scroll to zoom
              <br />
              hover to focus / dbl-click to fly
            </p>
          </div>
        </aside>

        {/* SVG cosmos canvas */}
        <div
          ref={containerRef}
          style={{ flex: 1, minWidth: 0, position: "relative", cursor: dragRef.current ? "grabbing" : "grab" }}
        >
          {/* Floating Fit — top-right of canvas. */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5, display: "flex", gap: 6 }}>
            <GalaxyButton floating onClick={handleRecentre} title="Fit to view">
              <Maximize2 width={12} height={12} />
              <span>Fit</span>
            </GalaxyButton>
          </div>

          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => {
              // Don't deselect when finishing a drag-pan
              if (dragRef.current?.moved) return;
              if (e.target === svgRef.current) setSelectedId(null);
            }}
            style={{ display: "block" }}
          >
            <defs>
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
              <filter id="nebula-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="32" />
              </filter>
              <filter id="thread-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b1" />
                <feMerge>
                  <feMergeNode in="b1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

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
              {nebulae.map((b) => (
                <radialGradient key={`doc-${b.id}`} id={`halo-doc-${b.id}`}>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="20%" stopColor={b.colour} stopOpacity="0.75" />
                  <stop offset="55%" stopColor={b.colour} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={b.colour} stopOpacity="0" />
                </radialGradient>
              ))}
              {nebulae.map((b) => (
                <radialGradient key={`neb-${b.id}`} id={`neb-${b.id}`}>
                  <stop offset="0%" stopColor={b.colour} stopOpacity="0.22" />
                  <stop offset="45%" stopColor={b.colour} stopOpacity="0.07" />
                  <stop offset="100%" stopColor={b.colour} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {/* WORLD — pan + zoom transform */}
            <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
              {/* Nebulae */}
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

              {/* Edges */}
              <g>
                {visible.edges.map((e) => {
                  const a = positions?.get(e.source);
                  const b = positions?.get(e.target);
                  if (!a || !b) return null;
                  const isSelectedEnd = selectedId !== null && (e.source === selectedId || e.target === selectedId);
                  const isHoveredEnd = hoveredId !== null && hoveredId !== selectedId && (e.source === hoveredId || e.target === hoveredId);
                  const isLit = isSelectedEnd || isHoveredEnd;
                  const anyDimmer = selectedId !== null || hoveredId !== null || searchActive;
                  let h = 0;
                  for (let i = 0; i < e.id.length; i++) h = ((h << 5) - h + e.id.charCodeAt(i)) | 0;
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const sign = (h & 1) ? 1 : -1;
                  const bend = Math.min(60, len * 0.18) * sign;
                  const cx = (a.x + b.x) / 2 + (-dy / len) * bend;
                  const cy = (a.y + b.y) / 2 + (dx / len) * bend;
                  const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
                  return (
                    <path
                      key={e.id}
                      d={d}
                      fill="none"
                      stroke={isLit ? SKY.starConcept : "#fafafa"}
                      strokeOpacity={
                        isLit
                          ? 0.65
                          : anyDimmer
                            ? 0.015
                            : e.kind === "concept_concept" ? 0.09 : 0.05
                      }
                      strokeWidth={(isLit ? 0.9 : 0.35) / Math.max(0.5, view.k * 0.7)}
                      strokeLinecap="round"
                      filter={isLit ? "url(#thread-glow)" : undefined}
                    />
                  );
                })}
              </g>

              {/* Ignite flashes — large bright burst over newly-appeared stars during Growth replay. */}
              <g style={{ pointerEvents: "none" }}>
                {Array.from(igniteEntries.entries()).map(([id, expiresAt]) => {
                  const star = visible.nodes.find((n) => n.id === id);
                  if (!star) return null;
                  return (
                    <g key={`ignite-${id}-${expiresAt}`} transform={`translate(${star.x}, ${star.y})`}>
                      <circle
                        r={3}
                        fill="#ffffff"
                        filter="url(#glow-core-strong)"
                        className="galaxy-ignite-burst"
                        style={{ animation: "galaxyIgnite 900ms ease-out forwards" }}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Magnetic pulses — ring overlay for search matches */}
              <g style={{ pointerEvents: "none" }}>
                {searchActive && pulseId > 0 && matchedNodes.map((n) => (
                  <circle
                    key={`pulse-${n.id}-${pulseId}`}
                    cx={n.x}
                    cy={n.y}
                    r={Math.max(8, n.size * 4)}
                    fill="none"
                    stroke={SKY.starConcept}
                    strokeOpacity={0.7}
                    strokeWidth={1.2 / Math.max(0.5, view.k)}
                    className="galaxy-pulse-ring"
                    style={{ animation: "galaxyMagneticPulse 1.4s ease-out 3" }}
                  />
                ))}
              </g>

              {/* Stars */}
              <g>
                {visible.nodes.map((n, idx) => {
                  const matched = !searchActive || n.api.label.toLowerCase().includes(term);
                  const isSelected = n.id === selectedId;
                  const isNeighbour = visible.neighbours.has(n.id);
                  const isHovered = n.id === hoveredId;
                  const isHoverNeighbour = visible.hoverNeighbours.has(n.id);
                  const focusing = selectedId !== null || hoveredId !== null || searchActive;
                  const inFocus = isSelected || isNeighbour || isHovered || isHoverNeighbour || (searchActive && matched);
                  const dimmed = focusing && !inFocus;
                  const haloR = n.size * (isSelected ? 7 : isHovered ? 6 : 4.5);
                  const coreR = n.size * (isSelected ? 1.5 : isHovered ? 1.25 : 1);
                  const haloFill =
                    n.api.kind === "doc" && n.api.bundleId
                      ? `url(#halo-doc-${n.api.bundleId})`
                      : `url(#halo-${n.api.kind})`;
                  const showLabel = isSelected || isNeighbour || isHovered || isHoverNeighbour || (searchActive && matched) || view.k >= 1.4;
                  const floatIdx = idx % 4;
                  const period = 7 + (idx % 7);
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragRef.current?.moved) return;
                        setSelectedId(n.id === selectedId ? null : n.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStarDoubleClick(n);
                      }}
                      onMouseEnter={() => setHoveredId(n.id)}
                      onMouseLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
                      style={{
                        cursor: "pointer",
                        opacity: dimmed ? 0.05 : 1,
                        transition: "opacity 0.3s ease",
                      }}
                    >
                      {/* Hover ripple — only on the hovered star */}
                      {isHovered && (
                        <circle
                          r={haloR}
                          fill="none"
                          stroke={n.colour}
                          strokeWidth={0.8 / Math.max(0.5, view.k)}
                          strokeOpacity={0.6}
                          className="galaxy-hover-ring"
                          style={{ animation: "galaxyHoverRipple 1.4s ease-out infinite", pointerEvents: "none" }}
                        />
                      )}
                      <g
                        className="galaxy-star"
                        style={{
                          animation: `galaxyFloat${floatIdx} ${period}s ease-in-out infinite`,
                          animationDelay: `-${n.twinkleDelay * 1.2}s`,
                        }}
                      >
                        <circle
                          r={haloR}
                          fill={haloFill}
                          style={{
                            animation: `galaxyTwinkle ${5 + (n.twinkleDelay % 4)}s ease-in-out infinite`,
                            animationDelay: `-${n.twinkleDelay}s`,
                          }}
                        />
                        <circle
                          r={coreR}
                          fill="#fafafa"
                          filter={isSelected || isHovered ? "url(#glow-core-strong)" : "url(#glow-core)"}
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
                            fill: "#fafafa",
                            fontFamily: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
                            letterSpacing: 0.3,
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "rgba(9, 9, 11, 0.85)",
                            strokeWidth: 3 / Math.max(0.6, view.k * 0.7),
                            strokeLinejoin: "round",
                            opacity: dimmed ? 0 : 0.9,
                          }}
                        >
                          {n.api.label}
                        </text>
                      )}
                      {/* Designation — only on hover, sits just below the label */}
                      {isHovered && (
                        <text
                          y={haloR + 22}
                          textAnchor="middle"
                          style={{
                            fontSize: 8 / Math.max(0.6, view.k * 0.7),
                            fill: "#a8a29e",
                            fontFamily: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
                            letterSpacing: 0.5,
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "rgba(9, 9, 11, 0.85)",
                            strokeWidth: 2.5 / Math.max(0.6, view.k * 0.7),
                            strokeLinejoin: "round",
                          }}
                        >
                          {starDesignation(n.id)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>

            {/* Shooting stars — viewport-space (NOT inside world g), so
                they cross the visible frame regardless of pan/zoom. */}
            <g style={{ pointerEvents: "none" }}>
              {shooters.map((s) => (
                <line
                  key={s.id}
                  x1={s.fromX}
                  y1={s.fromY}
                  x2={s.toX}
                  y2={s.toY}
                  stroke="#fafafa"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  filter="url(#thread-glow)"
                  style={{
                    strokeDasharray: `70 ${s.totalLen}`,
                    strokeDashoffset: 0,
                    animation: "galaxyShoot 1.2s cubic-bezier(0.4, 0, 0.6, 1) forwards",
                    ['--shoot-len' as keyof React.CSSProperties as string]: `${s.totalLen + 70}px`,
                  } as React.CSSProperties}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        {selected && (
          <aside
            style={{
              width: 320,
              borderLeft: "1px solid var(--border-dim)",
              padding: "18px 18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              overflowY: "auto",
              flexShrink: 0,
              background: "color-mix(in srgb, var(--background) 80%, transparent 20%)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                className="text-caption font-mono uppercase"
                style={{
                  color: colourForKind(selected.kind),
                  letterSpacing: 1,
                  fontWeight: 600,
                  textShadow: `0 0 6px ${colourForKind(selected.kind)}55`,
                }}
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

            <h3 className="text-heading" style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {selected.label}
            </h3>

            {/* Astronomical designation — fake but stable per node id. */}
            <p className="text-caption font-mono" style={{ color: "var(--text-faint)", margin: 0, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {starDesignation(selected.id)}
            </p>

            {selected.description && (
              <p className="text-body" style={{ color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                {selected.description}
              </p>
            )}

            {selected.kind !== "doc" && (selected.occurrence || 0) > 0 && (
              <p className="text-caption" style={{ color: "var(--text-faint)", margin: 0 }}>
                magnitude {selected.occurrence} (in {(selected.docIds || []).length}{" "}
                {(selected.docIds || []).length === 1 ? "doc" : "docs"})
              </p>
            )}

            {linkedDocs.length > 0 && (
              <div>
                <label className="text-caption font-mono uppercase" style={{ color: "var(--text-faint)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>
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
                          className="text-body"
                          style={{
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            display: "block",
                            padding: "5px 0",
                            borderBottom: "1px solid var(--border-dim)",
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
                className="text-body"
                style={{ color: "var(--accent)", textDecoration: "none", marginTop: 2 }}
              >
                Open document →
              </a>
            )}

            {visible.neighbours.size > 0 && (
              <div>
                <label className="text-caption font-mono uppercase" style={{ color: "var(--text-faint)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>
                  Connected
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
                          className="text-caption font-mono"
                          style={{
                            background: "var(--surface)",
                            color: "var(--text-primary)",
                            border: `1px solid ${c}33`,
                            borderRadius: 4,
                            padding: "3px 8px",
                            cursor: "pointer",
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

      {/* Scrubber — [start] [scrubber w/ TODAY mark and floating cursor date] [end] [▶ Growth] */}
      <footer
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          borderTop: "1px solid var(--border-dim)",
          gap: 12,
          flexShrink: 0,
          background: "var(--header-bg)",
          backdropFilter: "blur(12px)",
          zIndex: 3,
        }}
      >
        <span
          className="text-caption font-mono"
          style={{ color: "var(--text-faint)", letterSpacing: 0.3, flexShrink: 0, minWidth: 78 }}
        >
          {data.hubStart}
        </span>

        <div style={{ flex: 1, position: "relative", height: 32, display: "flex", alignItems: "center" }}>
          {/* Cursor date — floats above the thumb, accent-coloured. */}
          <div
            style={{
              position: "absolute",
              left: `calc(${sliderPct * 100}% - 28px)`,
              top: -2,
              padding: "1px 6px",
              fontSize: 10,
              color: "var(--accent)",
              background: "rgba(9, 9, 11, 0.85)",
              border: "1px solid var(--accent-dim)",
              borderRadius: 4,
              fontFamily: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
              letterSpacing: 0.3,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              transition: "left 0.05s linear",
            }}
          >
            {sliderDate || data.hubEnd}
          </div>

          {todayPct !== null && (
            <>
              <div
                title={`Today · ${new Date().toISOString().slice(0, 10)}`}
                style={{
                  position: "absolute",
                  left: `calc(${todayPct * 100}% - 0.5px)`,
                  top: 18,
                  height: 12,
                  width: 1,
                  background: "var(--text-muted)",
                  opacity: 0.5,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `calc(${todayPct * 100}% - 16px)`,
                  bottom: -4,
                  fontSize: 8,
                  letterSpacing: 0.4,
                  color: "var(--text-faint)",
                  fontFamily: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
                  textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                today
              </div>
            </>
          )}

          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(sliderPct * 1000)}
            onChange={(e) => {
              const v = Number(e.target.value) / 1000;
              const startMs = new Date(data.hubStart + "T00:00:00Z").getTime();
              const endMs = new Date(data.hubEnd + "T00:00:00Z").getTime();
              const target = startMs + (endMs - startMs) * v;
              setPlaying(false);
              setSliderDate(new Date(target).toISOString().slice(0, 10));
            }}
            className="galaxy-range"
            style={{ width: "100%", position: "absolute", top: 10, left: 0 }}
          />
        </div>

        <span
          className="text-caption font-mono"
          style={{ color: "var(--text-faint)", letterSpacing: 0.3, flexShrink: 0, minWidth: 78, textAlign: "right" }}
        >
          {data.hubEnd}
        </span>

        <GalaxyButton
          primary
          active={playing}
          onClick={() => {
            if (playing) { setPlaying(false); return; }
            setSliderDate(data.hubStart);
            setPlaying(true);
          }}
          title={playing ? "Pause replay" : "Replay growth from the beginning"}
        >
          {playing ? <Pause width={12} height={12} /> : <Play width={12} height={12} />}
          <span>{playing ? "Pause" : "Growth"}</span>
        </GalaxyButton>
      </footer>
    </div>
  );
}
