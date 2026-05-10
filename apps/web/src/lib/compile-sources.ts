// Compiled docs can now track MULTIPLE source bundles. The historical
// shape was a single `{ bundleId, docIds, intent }`; the new shape is
// `{ sources: [{ bundleId, docIds, intent, compiledAt }, ...] }`,
// where the LAST element is the current synthesis source.
//
// All read paths go through `readCompileSources` so old rows look
// identical to new ones at the call site. All write paths go through
// `appendCompileSource` so new compilations append instead of
// overwriting — preserving the bundle history that the founder wants
// surfaced in the compiled-doc banner.

export interface CompileSource {
  bundleId: string;
  docIds: string[];
  intent: string | null;
  compiledAt?: string | null;
}

export interface NewCompileFromShape {
  sources: CompileSource[];
}

interface LegacyCompileFromShape {
  bundleId?: string;
  docIds?: string[];
  intent?: string | null;
}

type RawCompileFrom = NewCompileFromShape | LegacyCompileFromShape | null | undefined;

/**
 * Returns the doc's compile history as a normalized array. Empty
 * array when the doc has no source bundle (or compile_from is null).
 *
 * The newest source is the LAST element, so callers can use
 * `sources[sources.length - 1]` to get the "current source" and
 * iterate forward when rendering the full history in chronological
 * order.
 */
export function readCompileSources(
  compileFrom: RawCompileFrom,
  fallbackCompiledAt?: string | null,
): CompileSource[] {
  if (!compileFrom || typeof compileFrom !== "object") return [];
  // New shape — array already.
  if ("sources" in compileFrom && Array.isArray((compileFrom as NewCompileFromShape).sources)) {
    return (compileFrom as NewCompileFromShape).sources
      .filter((s) => s && typeof s === "object" && typeof s.bundleId === "string")
      .map((s) => ({
        bundleId: s.bundleId,
        docIds: Array.isArray(s.docIds) ? s.docIds : [],
        intent: s.intent ?? null,
        compiledAt: s.compiledAt ?? null,
      }));
  }
  // Legacy shape — promote to a single-element array.
  const legacy = compileFrom as LegacyCompileFromShape;
  if (typeof legacy.bundleId !== "string") return [];
  return [{
    bundleId: legacy.bundleId,
    docIds: Array.isArray(legacy.docIds) ? legacy.docIds : [],
    intent: legacy.intent ?? null,
    compiledAt: fallbackCompiledAt ?? null,
  }];
}

/**
 * Append a new source onto the doc's compile history, dedupe-merging
 * by bundleId so re-compiling from the SAME bundle just refreshes
 * that entry's metadata instead of growing the array unbounded.
 *
 * Returns the new shape ready to write to compile_from.
 */
export function appendCompileSource(
  existing: RawCompileFrom,
  next: CompileSource,
  fallbackCompiledAt?: string | null,
): NewCompileFromShape {
  const prior = readCompileSources(existing, fallbackCompiledAt);
  const filtered = prior.filter((s) => s.bundleId !== next.bundleId);
  return { sources: [...filtered, next] };
}

/** Convenience: the "current" source the synthesizer last ran on. */
export function currentCompileSource(
  compileFrom: RawCompileFrom,
  fallbackCompiledAt?: string | null,
): CompileSource | null {
  const sources = readCompileSources(compileFrom, fallbackCompiledAt);
  return sources.length === 0 ? null : sources[sources.length - 1];
}
