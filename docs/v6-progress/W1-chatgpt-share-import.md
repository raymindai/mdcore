# W1: ChatGPT share-link import API

**Commit.** `aeb9c2f1`. *W1: ChatGPT share-link import API*

## What shipped

`POST /api/import/share` accepts a ChatGPT share URL
(`chatgpt.com/share/<id>` or legacy `chat.openai.com/share/<id>`) and
returns the conversation as clean markdown. The client persists via
`/api/docs` so the existing auth paths (anonymous-id, JWT,
`x-user-email`) keep working.

## How it works

Two server-render formats are observed in production. The extractor
tries each in order and falls back to deep-search for any object that
has `mapping` or `linear_conversation`.

1. **`__NEXT_DATA__` JSON blob.** Older Next.js Pages Router shape.
2. **React Router 7 turbo-stream payload.** Current 2026 format. The
   conversation lives in
   `window.__reactRouterContext.streamController.enqueue("[...]")` as a
   graph-encoded slot array. Object keys are encoded as `_<keyIndex>`
   and integer values are references to other slots. The deserializer
   walks the graph cycle-safely.

System / tool / `is_visually_hidden_from_conversation` messages are
filtered so the captured doc reads as a real human-AI exchange.

## Files

| Path | Role |
|------|------|
| `apps/web/src/lib/share-importers/types.ts` | `ShareProvider`, `ShareImportResult`, `ShareImportError` |
| `apps/web/src/lib/share-importers/chatgpt.ts` | ChatGPT extractor (both schemas) |
| `apps/web/src/lib/share-importers/index.ts` | Provider router (Claude/Gemini placeholder until W2) |
| `apps/web/src/app/api/import/share/route.ts` | POST endpoint with rate limit |
| `apps/web/scripts/test-share-importer.ts` | Regression suite |

## Verified scenarios

`pnpm --filter web test:share` runs 56 assertions across 18 cases. All
pass.

- Both schema shapes (`linear_conversation` and `mapping`-tree)
- Multimodal content rendered as `*[image]*` placeholders
- Title fallback to first user message snippet
- Deep-search fallback for unknown wrapper paths
- Empty conversation rejected with friendly error
- Missing `__NEXT_DATA__` and missing turbo-stream both handled
- Upstream 404 → user-facing 404 ("doesn't exist or has been deleted")
- Upstream 403 → "private share"
- Domain canonicalization (`chat.openai.com/share/...` → `chatgpt.com/share/...`)
- Non-share path rejected
- Wrong host rejected
- Garbage URL rejected
- Malformed `__NEXT_DATA__` JSON handled gracefully
- System / tool / hidden messages filtered
- Alternate `content.text` shape (vs `content.parts`)
- Turbo-stream synthetic fixture matching production shape

## Live verification

Real public ChatGPT share fetched end-to-end:
`https://chatgpt.com/share/696ac45b-70d8-8003-9ca4-320151e0816e` →
title "281", 1 user turn, 5479 chars of clean markdown including
preserved KaTeX math notation and the assistant's full response.

## Deferred to W2

Claude and Gemini share-link import. Server-side fetch is blocked for
Claude (Cloudflare 403) and Gemini's conversation arrives via XHR
post-auth, so neither is reachable from a serverless function.
Bookmarklet path (W2) covers them by running in the user's browser.
