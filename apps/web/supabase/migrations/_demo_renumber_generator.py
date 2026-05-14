#!/usr/bin/env python3
"""
Generates 038_demo_account_renumber.sql.template.

The 036 + 037 seeds used semantic IDs like `demo-bundle-launch-strategy`
and `demo-vault-runway-numbers` — which then surface as the doc / bundle
URL (`mdfy.app/b/demo-bundle-launch-strategy`). Real production rows
have opaque nanoid-style IDs (`ycs01TmA` etc) and the demo should
mirror that or it reads as obviously-fake.

This migration:
  * Generates a fresh 8-char nanoid for every demo doc + bundle
  * For each, copies the row with the new id, repoints
    bundle_documents FK, rewrites concept_index.doc_ids JSONB, then
    deletes the old row (document_versions / document_chunks CASCADE
    away on the old rows — that's fine; the demo has no versions and
    chunks will rebuild on the next semantic-search pass)
  * Bundles keep their freshly-computed graph_data because we copy
    the row instead of re-seeding

Run from the repo root:
    python3 apps/web/supabase/migrations/_demo_renumber_generator.py \
      > apps/web/supabase/migrations/038_demo_account_renumber.sql.template
"""

from __future__ import annotations

import secrets

ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"


def gen_id(n: int = 8) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


# Every doc id seeded in 036 + 037
DOC_IDS = [
    # 036
    "demo-ai-memory-chat",
    "demo-decision-graph-url",
    "demo-formatting-tour",
    "demo-strategy-moat",
    "demo-cursor-rules",
    "demo-karpathy-llm-wiki",
    # 037 — conversations
    "demo-conv-claude-rust-perf",
    "demo-conv-gpt5-token-budget",
    "demo-conv-gemini-image-prompt",
    "demo-conv-claude-onboarding",
    # 037 — decisions
    "demo-dec-postgres-vs-pinecone",
    "demo-dec-rust-wasm-engine",
    "demo-dec-haiku-reranker",
    "demo-dec-bundle-graph-inline",
    "demo-dec-no-wikilinks",
    # 037 — research
    "demo-res-graph-rag-microsoft",
    "demo-res-mem0-vs-letta",
    "demo-res-llms-txt-adoption",
    "demo-res-karpathy-llm-wiki-expanded",
    "demo-res-context-engineering",
    # 037 — strategy
    "demo-strat-cross-ai-thesis",
    "demo-strat-pricing-model",
    "demo-strat-launch-day",
    "demo-strat-gtm-3-channels",
    "demo-strat-anti-pattern",
    # 037 — formatting
    "demo-fmt-math-showcase",
    "demo-fmt-mermaid-zoo",
    "demo-fmt-tables-showcase",
    # 037 — integrate
    "demo-int-claude-code",
    "demo-int-codex-agents-md",
    "demo-int-mcp-server",
    # 037 — vault
    "demo-vault-runway-numbers",
    "demo-vault-hiring-bar",
    "demo-vault-investor-list",
    "demo-vault-pricing-experiments",
    "demo-vault-roadmap-draft",
    "demo-vault-personal-journal",
    # 037 — root
    "demo-root-readme",
    "demo-root-show-hn-plan",
    "demo-root-meeting-notes-yc",
    "demo-root-personal-stack",
    "demo-root-mistakes-i-made",
    "demo-root-feature-ideas",
    "demo-root-readme-for-claude",
    "demo-root-glossary",
    "demo-root-rfc-permissions",
    "demo-root-rfc-bundle-digest",
    "demo-root-rfc-recall-api",
    "demo-root-onboarding-script",
    "demo-root-claude-prompt-pack",
]

BUNDLE_IDS = [
    # 036
    "demo-bundle-memory",
    "demo-bundle-engineering",
    # 037
    "demo-bundle-research-frontier",
    "demo-bundle-launch-strategy",
    "demo-bundle-engineering-decisions",
    "demo-bundle-private-financials",
    "demo-bundle-integrate-tour",
]

assert len(DOC_IDS) == 50
assert len(BUNDLE_IDS) == 7

# Deterministic-ish IDs by salting the hash, but since this is one-shot
# seed maintenance, true randoms are fine.
doc_map = {old: gen_id() for old in DOC_IDS}
bundle_map = {old: gen_id() for old in BUNDLE_IDS}

# Doc columns we copy. Omit `id` (we supply the new one) and the
# fields whose maintenance can rebuild after delete (embedding,
# semantic_chunks, fts — all derived).
DOC_COPY_COLS = [
    "user_id", "markdown", "title", "edit_token", "created_at",
    "updated_at", "view_count", "is_draft", "edit_mode", "folder_id",
    "allowed_emails", "allowed_editors", "source", "sort_order",
    "intent",
]

BUNDLE_COPY_COLS = [
    "user_id", "title", "description", "edit_token", "created_at",
    "updated_at", "view_count", "is_draft", "edit_mode", "folder_id",
    "allowed_emails", "allowed_editors", "intent", "graph_data",
    "graph_generated_at", "layout",
]

DOC_COLS_SQL = ", ".join(DOC_COPY_COLS)
BUNDLE_COLS_SQL = ", ".join(BUNDLE_COPY_COLS)

print("""-- 038: Renumber demo account doc + bundle IDs.
--
-- Replaces the semantic IDs seeded in 036 + 037 with opaque
-- 8-char nanoid-style IDs so demo URLs read like real production
-- ones. Preserves rows (graph_data on bundles stays in place).
--
-- Strategy per row:
--   1. INSERT a copy with the new id (carrying every column we care
--      about — graph_data on bundles, markdown on docs, etc.)
--   2. UPDATE bundle_documents FK to point at the new id
--   3. UPDATE concept_index.doc_ids JSONB to rewrite each occurrence
--   4. DELETE the old row (its bundle_documents links are already
--      moved, so the CASCADE has nothing to cascade through)
--
-- Idempotency: not idempotent — re-running this template would
-- generate fresh new IDs and try to copy already-renumbered rows
-- (which would fail at the INSERT step, the new ids don't match
-- the old ids any more). Generate once, apply once.
--
-- Generated by _demo_renumber_generator.py.

BEGIN;
""")

# Documents.
#
# The partial unique index documents_owner_strict_dup_lock (migration
# 029) blocks a same-user/same-title/same-markdown second row from
# co-existing — even momentarily inside one transaction. The index is
# partial on `WHERE deleted_at IS NULL`, so soft-deleting the old row
# first removes it from the index, lets the INSERT succeed, then the
# hard DELETE cleans up.
print("-- ─── Documents ──────────────────────────────────────────────")
for old, new in doc_map.items():
    print(f"""
-- {old} → {new}
UPDATE documents SET deleted_at = now() WHERE id = '{old}';
INSERT INTO documents (id, {DOC_COLS_SQL})
SELECT '{new}', {DOC_COLS_SQL} FROM documents WHERE id = '{old}';
UPDATE bundle_documents SET document_id = '{new}' WHERE document_id = '{old}';
UPDATE concept_index
   SET doc_ids = array_replace(doc_ids, '{old}', '{new}')
 WHERE '{old}' = ANY(doc_ids);
DELETE FROM documents WHERE id = '{old}';""")

# Bundles
print()
print("-- ─── Bundles ────────────────────────────────────────────────")
for old, new in bundle_map.items():
    print(f"""
-- {old} → {new}
INSERT INTO bundles (id, {BUNDLE_COLS_SQL})
SELECT '{new}', {BUNDLE_COLS_SQL} FROM bundles WHERE id = '{old}';
UPDATE bundle_documents SET bundle_id = '{new}' WHERE bundle_id = '{old}';
DELETE FROM bundles WHERE id = '{old}';""")

print()
print("COMMIT;")
print()
print("-- Post-apply verification:")
print("--   SELECT id, title FROM documents WHERE user_id = '<DEMO_USER_ID>' LIMIT 5;")
print("--     (every id should look like 'aB3_xY9z', NOT 'demo-...')")
print("--   SELECT id, title FROM bundles   WHERE user_id = '<DEMO_USER_ID>';")
