-- Bundle intent: a one-line statement of the question / purpose this bundle
-- exists to answer. Used as the North Star for AI analysis (decompose,
-- bundle graph) and to weight/filter Discoveries. Optional — bundles
-- without an intent fall back to whole-bundle analysis as before.

ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS intent TEXT;
