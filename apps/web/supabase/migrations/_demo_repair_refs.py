#!/usr/bin/env python3
"""
Post-renumber repair: rewrite every reference to the OLD demo IDs
that lives outside the {documents, bundles, bundle_documents,
concept_index} tables that migration 038 already touched.

Targets:
  * bundles.graph_data — JSON blobs from the LLM analyser carry
    doc references in `nodes[].id`, `edges[].source/target`,
    `readingOrder[]`, `documentSummaries[key]`, and
    `connections[].doc1/doc2`. Both `doc:demo-...` and bare
    `demo-...` forms appear in the seed.
  * documents.markdown — only 2 docs contain `demo-*` references
    inside their body text (cross-references between docs).

Source of the old→new ID map: parse the comments in the most recent
038_demo_account_renumber.sql.

Run AFTER 038 has been applied:
    python3 apps/web/supabase/migrations/_demo_repair_refs.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

# ─── env ─────────────────────────────────────────────────────────────
ENV_PATH = Path("apps/web/.env.local")
env: dict[str, str] = {}
for line in ENV_PATH.read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SVC_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
DEMO_ID = "4438fefc-9b1a-48b8-a9e6-9b9f1b7c76bd"

# ─── parse old→new map from 038 ──────────────────────────────────────
SQL = Path("apps/web/supabase/migrations/038_demo_account_renumber.sql").read_text()
PAIR_RE = re.compile(r"^-- (demo-[A-Za-z0-9_-]+) → ([A-Za-z0-9_-]+)$", re.MULTILINE)
ID_MAP: dict[str, str] = {old: new for old, new in PAIR_RE.findall(SQL)}
print(f"Loaded {len(ID_MAP)} id pairs from 038 (expected 57)")
assert len(ID_MAP) == 57, f"unexpected pair count {len(ID_MAP)}"

# Order matters: replace longer keys first, otherwise `demo-foo` could
# eat the prefix of `demo-foo-bar`.
SORTED_OLD = sorted(ID_MAP.keys(), key=len, reverse=True)


def rewrite_text(s: str) -> str:
    for old in SORTED_OLD:
        if old in s:
            s = s.replace(old, ID_MAP[old])
    return s


# ─── fetch ───────────────────────────────────────────────────────────
def supa(method: str, path: str, body=None):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1{path}",
        method=method,
        headers={
            "apikey": SVC_KEY,
            "Authorization": f"Bearer {SVC_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


# ─── 1. Bundles: rewrite graph_data ──────────────────────────────────
bundles = supa("GET", f"/bundles?user_id=eq.{DEMO_ID}&select=id,graph_data")
print(f"\nBundles to repair: {len(bundles)}")
fixed = 0
for b in bundles:
    gd = b.get("graph_data")
    if not gd:
        print(f"  {b['id']:12s}  graph_data EMPTY — skipping")
        continue
    before = json.dumps(gd, ensure_ascii=False)
    after_text = rewrite_text(before)
    if before == after_text:
        print(f"  {b['id']:12s}  no demo-* refs — skipping")
        continue
    after_json = json.loads(after_text)
    # PATCH the bundle
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/bundles?id=eq.{b['id']}",
        method="PATCH",
        headers={
            "apikey": SVC_KEY,
            "Authorization": f"Bearer {SVC_KEY}",
            "Content-Type": "application/json",
        },
        data=json.dumps({"graph_data": after_json}).encode(),
    )
    with urllib.request.urlopen(req) as r:
        r.read()
    occurrences = sum(before.count(old) for old in ID_MAP)
    print(f"  {b['id']:12s}  rewrote {occurrences} doc-id occurrences")
    fixed += 1

print(f"\nBundles updated: {fixed}/{len(bundles)}")

# ─── 2. Documents: rewrite markdown that mentions demo-* ─────────────
docs = supa(
    "GET",
    f"/documents?user_id=eq.{DEMO_ID}&select=id,title,markdown",
)
print(f"\nDocs to scan: {len(docs)}")
md_fixed = 0
for d in docs:
    md = d.get("markdown") or ""
    if not any(old in md for old in SORTED_OLD):
        continue
    new_md = rewrite_text(md)
    if new_md == md:
        continue
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/documents?id=eq.{d['id']}",
        method="PATCH",
        headers={
            "apikey": SVC_KEY,
            "Authorization": f"Bearer {SVC_KEY}",
            "Content-Type": "application/json",
        },
        data=json.dumps({"markdown": new_md}).encode(),
    )
    with urllib.request.urlopen(req) as r:
        r.read()
    print(f"  {d['id']:12s}  {d['title'][:60]}")
    md_fixed += 1

print(f"\nDocs updated: {md_fixed}")

# ─── 3. Verify nothing left ──────────────────────────────────────────
print("\nRe-scanning for any residual demo-* references...")
leftovers = 0
for b in supa("GET", f"/bundles?user_id=eq.{DEMO_ID}&select=id,graph_data"):
    gd = b.get("graph_data")
    if gd and any(old in json.dumps(gd) for old in SORTED_OLD):
        print(f"  STILL DIRTY: bundle {b['id']}")
        leftovers += 1
for d in supa("GET", f"/documents?user_id=eq.{DEMO_ID}&select=id,markdown"):
    md = d.get("markdown") or ""
    if any(old in md for old in SORTED_OLD):
        print(f"  STILL DIRTY: doc {d['id']}")
        leftovers += 1
print(f"\nResidual dirty rows: {leftovers}")
sys.exit(0 if leftovers == 0 else 1)
