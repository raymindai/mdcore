"use client";

/**
 * Canonical mdfy.app logo component.
 * Renders inline SVG so CSS variables are respected for theming.
 * Source of truth: assets/brand/
 *
 * Colors (dark):  md=#fb923c  fy=#fafafa  .app=#737373
 * Colors (light): md=#ea580c  fy=#09090b  .app=#a1a1aa
 */
export default function MdfyLogo({
  size = 22,
  variant = "mdfy.app",
}: {
  size?: number;
  variant?: "mdfy.app" | "mdcore.ai";
}) {
  const weight = 800;
  const letterSpacing = "-0.02em";
  const suffix = variant === "mdcore.ai" ? ".ai" : ".app";
  const middle = variant === "mdcore.ai" ? "core" : "fy";

  return (
    <span
      style={{ fontSize: size, fontWeight: weight, letterSpacing, whiteSpace: "nowrap" }}
      aria-label={variant}
    >
      <span style={{ color: "var(--accent)" }}>md</span>
      <span style={{ color: "var(--text-primary)" }}>{middle}</span>
      <span style={{ color: "var(--text-faint)" }}>{suffix}</span>
    </span>
  );
}
