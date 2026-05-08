# v6 progress log

Per-week record of what shipped against the 12-week single-ship plan
(target: end of August 2026 public launch). Each week file lists the
commits, verified scenarios, and any deferred work.

## Index

| Week | Title | Commit(s) | Status |
|------|-------|-----------|--------|
| W1 | ChatGPT share-link import API | `aeb9c2f1` | shipped |
| W2 | Bookmarklet for cross-AI capture | `31e4f3a8` | shipped |
| W3 | Anonymous-first capture, claim flow, hub schema, demo CTA | `22dd6d4e`, `1598c2a1`, `e4113c90`, `075e413f` | shipped |
| W4 | Auto-synthesis with diff/accept (exceed move 1) | `31f17041` | shipped |
| W5 | Hub log.md, Lint 1.0, PDF ingest (exceed move 2) | n/a | next |
| W6 | Proactive bundle suggestion (exceed move 3) + internal beta start | n/a | pending |
| W7 | Shared bundles MVP, confidence tags | n/a | pending |
| W8 | `/mdfy` slash for Claude Code, suggested queries | n/a | pending |
| W9 | `/mdfy` for Cursor, hub-level graph view | n/a | pending |
| W10 | `/mdfy` for Codex+Aider, time-traveling hub, two-door landing | n/a | pending |
| W11 | Permission-aware AI fetching, shared bundles discoverable | n/a | pending |
| W12 | Social hub feed, cross-reference graph, public launch | n/a | pending |

## Conventions

- All work happens on `v6` branch and stays on `staging.mdfy.app`. Production `mdfy.app` stays on v1 until W12 single-ship.
- Supabase is shared between staging and production, so schema migrations apply to both at write time.
- Per-week files name the verified scenarios, not what's *intended* to work. If a path isn't verified, it's not in the file.
- Tests live under `apps/web/scripts/`; run any with `pnpm --filter web test:<name>`.

## Reference

- Strategy memo: `~/.claude/projects/-Users-hyunsangcho-Desktop-Projects-mdcore/memory/mdfy_wiki_layer_2026_05.md`
- Earlier launch artifacts: `docs/launch/`
