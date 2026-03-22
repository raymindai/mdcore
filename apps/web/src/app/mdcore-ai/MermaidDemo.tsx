"use client";

import { useEffect, useRef, useState } from "react";

const MERMAID_CODE = `graph LR
  A[API Request] --> B{Cached?}
  B -->|Yes| C([Edge CDN])
  B -->|No| D[Rust Engine]
  D --> E[Parse AST]
  E --> F[Render HTML]
  F --> C`;

export default function MermaidDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#18181b",
            primaryColor: "rgba(251,146,60,0.15)",
            primaryBorderColor: "#fb923c",
            primaryTextColor: "#fb923c",
            secondaryColor: "rgba(74,222,128,0.12)",
            secondaryBorderColor: "#4ade80",
            secondaryTextColor: "#4ade80",
            tertiaryColor: "rgba(196,181,253,0.12)",
            tertiaryBorderColor: "#c4b5fd",
            tertiaryTextColor: "#c4b5fd",
            lineColor: "#52525b",
            textColor: "#a1a1aa",
            mainBkg: "rgba(251,146,60,0.12)",
            nodeBorder: "#fb923c",
            nodeTextColor: "#fafafa",
            edgeLabelBackground: "#18181b",
            clusterBkg: "#18181b",
            fontSize: "13px",
          },
          flowchart: {
            htmlLabels: true,
            curve: "basis",
            padding: 12,
          },
        });
        if (cancelled || !ref.current) return;
        const { svg } = await mermaid.render("mermaid-demo", MERMAID_CODE);
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setReady(true);
      } catch {
        // mermaid may not be available
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 180,
        opacity: ready ? 1 : 0.3,
        transition: "opacity 0.3s",
      }}
    />
  );
}
