// Curator options — user-configurable list of auto-management
// signals that mdfy runs against the user's hub. Each option owns
// one rule; the user toggles which ones surface in Needs Review.
//
// Storage: localStorage in v1 (key `mdfy-curator-settings`). v2 can
// promote this to a profiles.curator_settings JSONB column for
// cross-device sync; the shape here is already JSON-serializable so
// the migration is just "read from profile when present, fall back
// to localStorage."
//
// Why a config layer at all: the founder wants curator signals to be
// opt-in per user. A power user may want every signal on; a casual
// user may only want orphan + duplicate. Hard-wiring all eight on by
// default produces noise; hard-wiring all off produces no value. The
// toggle list lets each user dial it.

export type CuratorOptionId =
  | "orphan"
  | "duplicate"
  | "stale"
  | "title-mismatch"
  | "citation-rot"
  | "rollup"
  | "merge"
  | "auto-archive";

export interface CuratorOption {
  id: CuratorOptionId;
  label: string;
  description: string;
  /** True when the rule is wired into the lint backend today. False
   *  when the toggle exists but the signal isn't running yet — UI
   *  shows "Coming soon" and disables the toggle. */
  shipped: boolean;
  /** Default state for a new user. We default-enable the two signals
   *  that actually ship (orphan, duplicate) and leave the rest off
   *  until they land — so a brand-new account starts useful but quiet. */
  defaultEnabled: boolean;
}

export const CURATOR_OPTIONS: CuratorOption[] = [
  {
    id: "orphan",
    label: "Orphan docs",
    description: "Docs that aren't in any bundle, aren't linked from another doc, and don't share concepts with anything else. Resolve re-runs concept extraction.",
    shipped: true,
    defaultEnabled: true,
  },
  {
    id: "duplicate",
    label: "Likely duplicates",
    description: "Two docs whose embeddings are close enough that you probably meant to merge or supersede one. Resolve moves the older copy to Trash.",
    shipped: true,
    defaultEnabled: true,
  },
  {
    id: "stale",
    label: "Stale claims",
    description: "Docs older than 90 days that are still heavily referenced — flagged so you can re-read and confirm they're still true.",
    shipped: false,
    defaultEnabled: false,
  },
  {
    id: "title-mismatch",
    label: "Title / body mismatch",
    description: "Title doesn't mention the doc's central concept. Common after AI capture picked a generic header.",
    shipped: false,
    defaultEnabled: false,
  },
  {
    id: "citation-rot",
    label: "Citation rot",
    description: "External links in your docs that return 4xx/5xx. Surfaced so you can replace or remove.",
    shipped: false,
    defaultEnabled: false,
  },
  {
    id: "rollup",
    label: "Roll-up suggestions",
    description: "When 10+ docs share a concept, mdfy suggests synthesising them into a single summary doc you can compile.",
    shipped: false,
    defaultEnabled: false,
  },
  {
    id: "merge",
    label: "Merge suggestions",
    description: "Two docs covering the same topic from different angles. Surfaced so you can decide whether to merge them.",
    shipped: false,
    defaultEnabled: false,
  },
  {
    id: "auto-archive",
    label: "Auto-archive",
    description: "Docs untouched for 90+ days that no other doc references move to an Archive folder automatically. Always restorable.",
    shipped: false,
    defaultEnabled: false,
  },
];

const STORAGE_KEY = "mdfy-curator-settings";

// Auto-management trigger — when the system attempts to act on the
// findings the curator surfaces. The per-signal toggles still govern
// WHICH signals run; this governs WHEN auto-resolution fires.
//
//   manual    — surface only. User clicks Resolve / Resolve All to act.
//   on-open   — every time the Hub overlay opens, auto-resolve safe
//               signals (orphan refresh-concepts), notify on destructive
//               ones (duplicate soft-delete still asks).
//   interval  — every 30 minutes while the app is in the foreground.
export type AutoTrigger = "manual" | "on-open" | "interval";

// CuratorSettings was a flat Record<id, boolean>. It now needs to
// carry the per-signal toggles AND two orchestration knobs (master
// auto-enabled + trigger). The shape is split out so consumers
// keep the same `.orphan` / `.duplicate` access pattern they had
// before — the eight signal booleans live at the top level and the
// orchestration fields sit alongside them.
export interface CuratorSettings extends Record<CuratorOptionId, boolean> {
  /** Master switch. When true, enabled signals auto-resolve on
   *  the configured trigger. When false, findings only surface;
   *  user resolves manually. Default off so a new account doesn't
   *  silently mutate docs. */
  autoEnabled: boolean;
  /** When auto-resolution fires. Ignored when autoEnabled is false. */
  autoTrigger: AutoTrigger;
}

export function defaultCuratorSettings(): CuratorSettings {
  const out = {
    autoEnabled: false,
    autoTrigger: "on-open" as AutoTrigger,
  } as CuratorSettings;
  for (const opt of CURATOR_OPTIONS) out[opt.id] = opt.defaultEnabled;
  return out;
}

export function loadCuratorSettings(): CuratorSettings {
  if (typeof window === "undefined") return defaultCuratorSettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCuratorSettings();
    const parsed = JSON.parse(raw) as Partial<CuratorSettings>;
    const merged = defaultCuratorSettings();
    for (const opt of CURATOR_OPTIONS) {
      if (typeof parsed[opt.id] === "boolean") merged[opt.id] = parsed[opt.id]!;
    }
    if (typeof parsed.autoEnabled === "boolean") merged.autoEnabled = parsed.autoEnabled;
    if (parsed.autoTrigger === "manual" || parsed.autoTrigger === "on-open" || parsed.autoTrigger === "interval") {
      merged.autoTrigger = parsed.autoTrigger;
    }
    return merged;
  } catch {
    return defaultCuratorSettings();
  }
}

export function saveCuratorSettings(settings: CuratorSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota / disabled storage */
  }
}
