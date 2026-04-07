import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Feature pill colors — keyed by feature name
const FEATURE_COLORS: Record<string, string> = {
  GFM: "#fb923c",
  KaTeX: "#c4b5fd",
  Mermaid: "#f472b6",
  Code: "#4ade80",
  Tables: "#60a5fa",
  Images: "#f59e0b",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTitle = searchParams.get("title") || "";
  const featuresParam = searchParams.get("features") || "GFM,KaTeX,Mermaid,Code,Tables";

  const hasTitle = rawTitle && rawTitle !== "Shared Document";
  const displayTitle = hasTitle
    ? rawTitle.length > 40
      ? rawTitle.slice(0, 37) + "..."
      : rawTitle
    : "";

  // Parse and validate features (max 5, only known names)
  const featurePills = featuresParam
    .split(",")
    .map((f) => f.trim())
    .filter((f) => FEATURE_COLORS[f])
    .slice(0, 5)
    .map((f) => ({ t: f, c: FEATURE_COLORS[f] }));

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #0c0c0f 0%, #09090b 50%, #0a0a0e 100%)",
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-180px",
            left: "-80px",
            width: "550px",
            height: "550px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 55%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-220px",
            right: "-60px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(196,181,253,0.06) 0%, transparent 55%)",
            display: "flex",
          }}
        />

        {/* Floating document card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "1040px",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "linear-gradient(180deg, rgba(24,24,27,0.95) 0%, rgba(15,15,18,0.98) 100%)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          {/* Card header — window chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 32px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#ef4444", display: "flex" }} />
              <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#eab308", display: "flex" }} />
              <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#22c55e", display: "flex" }} />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 0",
                borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                width: "480px",
              }}
            >
              <span style={{ color: "#71717a", fontSize: "15px", fontWeight: 500 }}>
                mdfy.cc{hasTitle ? `/${rawTitle.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, "-")}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", width: "62px" }} />
          </div>

          {/* Card body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: hasTitle ? "40px 56px 44px" : "48px 56px 52px",
              gap: hasTitle ? "24px" : "28px",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ color: "#fb923c", fontSize: hasTitle ? "44px" : "80px", fontWeight: 800, letterSpacing: "-1px" }}>md</span>
              <span style={{ color: "#fafafa", fontSize: hasTitle ? "44px" : "80px", fontWeight: 800, letterSpacing: "-1px" }}>fy</span>
              <span style={{ color: "#3f3f46", fontSize: hasTitle ? "44px" : "80px", fontWeight: 800, letterSpacing: "-1px" }}>.cc</span>
            </div>

            {hasTitle ? (
              <div
                style={{
                  fontSize: displayTitle.length > 25 ? "44px" : "52px",
                  fontWeight: 700,
                  color: "#e4e4e7",
                  lineHeight: 1.15,
                  letterSpacing: "-1.5px",
                }}
              >
                {displayTitle}
              </div>
            ) : (
              <div style={{ fontSize: "32px", color: "#3f3f46", lineHeight: 1.4, letterSpacing: "-0.3px" }}>
                Paste Markdown. See it beautiful.
              </div>
            )}

            {/* Feature pills — dynamic based on doc content */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              {featurePills.map((p) => (
                <div
                  key={p.t}
                  style={{
                    display: "flex",
                    padding: "7px 18px",
                    borderRadius: "20px",
                    border: `1px solid ${p.c}22`,
                    backgroundColor: `${p.c}0a`,
                  }}
                >
                  <span style={{ fontSize: "16px", color: p.c, fontWeight: 600 }}>{p.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: powered by */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "#3f3f46", fontSize: "17px" }}>published with</span>
          <span style={{ color: "#52525b", fontSize: "17px", fontWeight: 700 }}>mdfy.cc</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
