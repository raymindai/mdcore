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

export type CuratorSettings = Record<CuratorOptionId, boolean>;

export function defaultCuratorSettings(): CuratorSettings {
  const out = {} as CuratorSettings;
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
