import type { ReactNode } from "react";

/**
 * EmptyState — standardized empty/zero state for lists, panels, search
 * results, etc. Replaces the dozen ad-hoc "No items" strings scattered
 * around the codebase.
 *
 * Layout: large icon → heading → 1-line guidance → optional CTA, all
 * vertically centered with generous whitespace.
 */

export interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  /** One-line guidance under the heading. Plain string or ReactNode for inline emphasis. */
  guidance?: ReactNode;
  /** Optional call-to-action — usually a Button */
  cta?: ReactNode;
  /** Compact variant for narrow containers (sidebar sections, drawers) */
  compact?: boolean;
}

export function EmptyState({ icon, heading, guidance, cta, compact = false }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{
        padding: compact ? "var(--space-4) var(--space-3)" : "var(--space-8) var(--space-4)",
        gap: compact ? "var(--space-2)" : "var(--space-3)",
        color: "var(--text-faint)",
      }}
    >
      {icon && (
        <div
          className="flex items-center justify-center"
          style={{
            width: compact ? 32 : 44,
            height: compact ? 32 : 44,
            color: "var(--text-faint)",
            opacity: 0.7,
          }}
        >
          {icon}
        </div>
      )}
      <div className="text-heading" style={{ color: "var(--text-secondary)" }}>{heading}</div>
      {guidance && (
        <div className="text-caption max-w-[320px] leading-relaxed">{guidance}</div>
      )}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
