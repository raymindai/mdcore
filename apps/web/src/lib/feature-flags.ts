/**
 * Compile-time feature flags.
 *
 * Single-flip switches for v6 launch. Code paths gated by these flags
 * stay in the bundle (so flipping back is just a constant change), but
 * the UI is hidden by default. Flip to `true` to surface them locally
 * for testing or to re-enable post-launch.
 */
export const FEATURES = {
  /**
   * Thinking-surface features layered on top of Bundle:
   *   - Document decomposition into semantic_chunks
   *   - Discoveries panel (tensions / questions / insights / threads /
   *     gaps / cross-doc connections)
   *   - Cross-doc Concepts index in the sidebar
   *   - Concept overlays + decompose actions in BundleCanvas
   *
   * Hidden for v6 launch: the brief is "Bundle = manual or AI-generated
   * themed collection of documents," and the thinking surface adds
   * cognitive load that dilutes the Capture / Bundle / Deploy story
   * for first-time visitors. Power users can re-enable post-launch
   * via env override or this constant.
   */
  THINKING_SURFACE: false,
} as const;
