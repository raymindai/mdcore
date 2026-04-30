/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { GraphData, GraphNode } from "@/lib/graph-extract";

interface KnowledgeGraphProps {
  graphData: GraphData;
  documents: Array<{ id: string; title: string | null }>;
  onNodeClick?: (nodeId: string, nodeType: string, documentId?: string) => void;
  height?: number | string;
  className?: string;
}

// ─── Colors ───

const COLORS = {
  dark: {
    background: "#09090b",
    documentNode: "#fb923c",
    conceptNode: "#60a5fa",
    tagNode: "#a78bfa",
    entityNode: "#4ade80",
    edge: "rgba(251, 146, 60, 0.15)",
    edgeHover: "#fb923c",
    label: "#fafafa",
    labelDim: "#71717a",
    particleColor: "#fb923c",
  },
  light: {
    background: "#faf9f7",
    documentNode: "#ea580c",
    conceptNode: "#2563eb",
    tagNode: "#7c3aed",
    entityNode: "#16a34a",
    edge: "rgba(234, 88, 12, 0.12)",
    edgeHover: "#ea580c",
    label: "#18181b",
    labelDim: "#a1a1aa",
    particleColor: "#ea580c",
  },
};

function getNodeColor(node: GraphNode, theme: "dark" | "light"): string {
  if (node.color) return node.color;
  const c = COLORS[theme];
  switch (node.type) {
    case "document": return c.documentNode;
    case "concept": return c.conceptNode;
    case "tag": return c.tagNode;
    case "entity": return c.entityNode;
    default: return c.conceptNode;
  }
}

export default function KnowledgeGraph({
  graphData,
  documents,
  onNodeClick,
  height = "100%",
  className = "",
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState<2 | 3>(3);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detect theme
  useEffect(() => {
    const detect = () => {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t === "light" ? "light" : "dark");
    };
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Build the graph data for 3d-force-graph (with stable references)
  const buildGraphData = useCallback(() => {
    const nodes = graphData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      documentId: n.documentId,
      weight: n.weight,
      color: n.color,
      // Store cluster color if node belongs to a cluster
      clusterColor: graphData.clusters.find(c => c.nodeIds.includes(n.id))?.color,
    }));
    const links = graphData.edges.map(e => ({
      source: e.source,
      target: e.target,
      label: e.label,
      weight: e.weight,
      type: e.type,
    }));
    return { nodes, links };
  }, [graphData]);

  // Initialize 3d-force-graph
  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    let destroyed = false;

    (async () => {
      // Dynamic imports for SSR safety
      const ForceGraph3DModule = await import("3d-force-graph");
      const ForceGraph3D = ForceGraph3DModule.default;
      const THREE = await import("three");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");

      if (destroyed || !containerRef.current) return;

      const container = containerRef.current;
      const c = COLORS[theme];
      const data = buildGraphData();

      // Create graph instance
      const graph = (ForceGraph3D as any)()(container)
        .graphData(data)
        .backgroundColor(c.background)
        .numDimensions(dimensions)
        .nodeLabel("")
        .nodeVal((node: any) => node.weight * 2)
        .nodeColor((node: any) => getNodeColor(node as GraphNode, theme))
        .nodeOpacity(0.9)
        .nodeResolution(16)
        .linkColor(() => c.edge)
        .linkWidth((link: any) => Math.max(0.3, link.weight * 0.4))
        .linkOpacity(0.6)
        .linkDirectionalParticles((link: any) => link.type === "references" ? 4 : 2)
        .linkDirectionalParticleWidth(1.5)
        .linkDirectionalParticleSpeed(0.005)
        .linkDirectionalParticleColor(() => c.particleColor)
        .cooldownTime(3000)
        .onNodeClick((node: any) => {
          if (onNodeClick) {
            onNodeClick(node.id, node.type, node.documentId);
          }
          // Fly-to animation
          const distance = 80;
          const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
          graph.cameraPosition(
            { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
            node,
            1500
          );
        })
        .onNodeHover((node: any) => {
          container.style.cursor = node ? "pointer" : "default";
          setHoveredNode(node ? node.id : null);
        });

      // Glow texture cache (shared across nodes)
      type CanvasTex = InstanceType<typeof THREE.CanvasTexture>;
      const glowTextures = new Map<string, CanvasTex>();
      function getGlowTexture(color: string): CanvasTex {
        if (glowTextures.has(color)) return glowTextures.get(color)!;
        const cvs = document.createElement("canvas");
        cvs.width = 128;
        cvs.height = 128;
        const gtx = cvs.getContext("2d")!;
        const gradient = gtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.2, color + "80");
        gradient.addColorStop(0.5, color + "20");
        gradient.addColorStop(1, "transparent");
        gtx.fillStyle = gradient;
        gtx.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(cvs);
        glowTextures.set(color, tex);
        return tex;
      }

      // Custom node rendering with glow
      graph.nodeThreeObject((node: any) => {
        const color = getNodeColor(node as GraphNode, theme);
        const size = node.type === "document" ? node.weight * 1.5 : node.weight;

        // Main sphere
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          emissive: color,
          emissiveIntensity: 0.4,
        });
        const sphere = new THREE.Mesh(geometry, material);

        // Glow sprite (halo around node)
        const spriteMaterial = new THREE.SpriteMaterial({
          map: getGlowTexture(color),
          transparent: true,
          opacity: node.type === "document" ? 0.5 : 0.25,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(size * 5, size * 5, 1);
        sphere.add(sprite);

        // Text label (above node)
        if (node.type === "document" || node.weight > 3) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          const label = node.label.length > 20 ? node.label.slice(0, 18) + "..." : node.label;
          const fontSize = node.type === "document" ? 28 : 22;
          canvas.width = 512;
          canvas.height = 64;
          ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = theme === "dark" ? "#fafafa" : "#18181b";
          ctx.textAlign = "center";
          ctx.fillText(label, 256, 40);

          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          const labelMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
          const labelSprite = new THREE.Sprite(labelMat);
          labelSprite.scale.set(size * 8, size * 1.2, 1);
          labelSprite.position.set(0, size * 2.5, 0);
          sphere.add(labelSprite);
        }

        return sphere;
      });

      // Bloom post-processing
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        1.5,  // strength
        0.4,  // radius
        0.85  // threshold
      );
      graph.postProcessingComposition().addPass(bloomPass);

      // Warm up — start zoomed out then zoom in
      graph.cameraPosition({ x: 0, y: 0, z: 300 });
      setTimeout(() => {
        if (!destroyed) graph.zoomToFit(1500, 50);
      }, 500);

      graphRef.current = graph;
      setIsLoading(false);

      // Handle resize
      const onResize = () => {
        if (!destroyed && container) {
          graph.width(container.clientWidth);
          graph.height(container.clientHeight);
        }
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    })();

    return () => {
      destroyed = true;
      if (graphRef.current) {
        graphRef.current._destructor();
        graphRef.current = null;
      }
    };
  }, [graphData, theme, buildGraphData, onNodeClick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle 2D/3D toggle
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.numDimensions(dimensions);
      setTimeout(() => {
        graphRef.current?.zoomToFit(1000, 50);
      }, 500);
    }
  }, [dimensions]);

  // Highlight connected nodes on hover
  useEffect(() => {
    if (!graphRef.current) return;
    const graph = graphRef.current;
    if (hoveredNode) {
      const connectedNodes = new Set<string>();
      connectedNodes.add(hoveredNode);
      graphData.edges.forEach(e => {
        if (e.source === hoveredNode) connectedNodes.add(e.target);
        if (e.target === hoveredNode) connectedNodes.add(e.source);
      });
      graph.nodeOpacity((node: any) => connectedNodes.has(node.id) ? 1 : 0.15);
      graph.linkOpacity((link: any) => {
        const src = typeof link.source === "object" ? link.source.id : link.source;
        const tgt = typeof link.target === "object" ? link.target.id : link.target;
        return src === hoveredNode || tgt === hoveredNode ? 0.8 : 0.05;
      });
    } else {
      graph.nodeOpacity(0.9);
      graph.linkOpacity(0.6);
    }
  }, [hoveredNode, graphData.edges]);

  return (
    <div className={`relative ${className}`} style={{ height, minHeight: 300 }}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "var(--background)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Building knowledge graph...</span>
          </div>
        </div>
      )}

      {/* Graph container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute top-3 right-3 flex gap-1.5 z-20">
        {/* 2D/3D toggle */}
        <button
          onClick={() => setDimensions(d => d === 3 ? 2 : 3)}
          className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
          style={{
            background: "var(--surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(8px)",
          }}
          title={dimensions === 3 ? "Switch to 2D" : "Switch to 3D"}
        >
          {dimensions === 3 ? "3D" : "2D"}
        </button>

        {/* Zoom to fit */}
        <button
          onClick={() => graphRef.current?.zoomToFit(1000, 50)}
          className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
          style={{
            background: "var(--surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(8px)",
          }}
          title="Zoom to fit"
        >
          Fit
        </button>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 z-20">
        <span className="text-[10px] px-2 py-1 rounded" style={{
          background: "rgba(0,0,0,0.5)",
          color: "var(--text-muted)",
          backdropFilter: "blur(8px)",
        }}>
          {graphData.nodes.filter(n => n.type === "document").length} documents
          {" · "}
          {graphData.nodes.filter(n => n.type !== "document").length} concepts
          {" · "}
          {graphData.edges.length} connections
        </span>
      </div>
    </div>
  );
}

