-- Hub-level ontology: concept_index + concept_relations.
--
-- Per-bundle aiGraph already extracts concepts/entities/tags into a
-- bundle's `graph_data` JSON. That works inside one bundle but doesn't
-- give a queryable view across the user's whole hub. To enable
-- "chat with my hub as an ontology" we need the same nodes + edges in
-- a relational shape so retrieval can:
--   - Look up concepts by label / fuzzy match / embedding
--   - Walk neighbor relations (1-2 hops)
--   - Bridge to source chunks via evidence arrays
--
-- The builder is incremental: when a bundle Analyze runs, we read its
-- graph_data and UPSERT into these tables keyed on (user_id,
-- normalized_label). Idempotent — re-running merges into the existing
-- row instead of duplicating.
--
-- Soft-delete cascade: when a doc is trashed we already nuke its
-- bundle_documents + chunks; concept_index rows that have ONLY this
-- doc as evidence get garbage-collected by the next Analyze run.

CREATE TABLE IF NOT EXISTS concept_index (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Display label (case + spacing preserved as the AI extracted it).
  label TEXT NOT NULL,
  -- Normalized form for dedup: lowercase, collapsed whitespace,
  -- punctuation stripped. Two AI runs labeling the same concept as
  -- "AI Memory" vs "ai memory" map to the same row via this column.
  normalized_label TEXT NOT NULL,
  -- "concept" | "entity" | "tag" — same vocabulary the canvas uses.
  concept_type TEXT NOT NULL DEFAULT 'concept',
  -- Aggregate weight (sum of bundle-extracted weights) — used for
  -- ranking when surfacing top concepts in chat context.
  weight REAL NOT NULL DEFAULT 1.0,
  -- Optional one-line description from the AI extraction.
  description TEXT,
  -- Where this concept appears. Arrays for cheap reads; the API layer
  -- can JOIN against documents/bundles when fuller context is needed.
  doc_ids TEXT[] NOT NULL DEFAULT '{}',
  bundle_ids TEXT[] NOT NULL DEFAULT '{}',
  -- How many distinct chunks/sentences mention this concept across
  -- the user's docs. Higher = more central to their knowledge.
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  -- Vector embedding of (label + description). Lets the chat retrieval
  -- expand a free-form query like "what's the deal with memory across
  -- docs" to the relevant concept nodes via cosine similarity.
  embedding vector(1536),
  embedding_source_hash TEXT,
  embedding_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_label)
);

CREATE INDEX IF NOT EXISTS idx_concept_index_user
  ON concept_index (user_id);

CREATE INDEX IF NOT EXISTS idx_concept_index_user_weight
  ON concept_index (user_id, weight DESC);

-- HNSW for vector search — only over rows that have an embedding.
CREATE INDEX IF NOT EXISTS idx_concept_index_embedding_hnsw
  ON concept_index
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE TABLE IF NOT EXISTS concept_relations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_concept_id BIGINT NOT NULL REFERENCES concept_index(id) ON DELETE CASCADE,
  target_concept_id BIGINT NOT NULL REFERENCES concept_index(id) ON DELETE CASCADE,
  -- Free-text label like "extends" / "contradicts" / "depends_on" —
  -- whatever the AI put on the edge in the source aiGraph.
  relation_label TEXT NOT NULL DEFAULT 'related',
  weight REAL NOT NULL DEFAULT 1.0,
  -- Which docs / chunks support this relation. Lets the chat layer
  -- show "X relates to Y because [chunk citation]".
  evidence_doc_ids TEXT[] NOT NULL DEFAULT '{}',
  evidence_chunk_ids BIGINT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_concept_id, target_concept_id, relation_label)
);

CREATE INDEX IF NOT EXISTS idx_concept_relations_user
  ON concept_relations (user_id);

CREATE INDEX IF NOT EXISTS idx_concept_relations_source
  ON concept_relations (source_concept_id);

CREATE INDEX IF NOT EXISTS idx_concept_relations_target
  ON concept_relations (target_concept_id);
