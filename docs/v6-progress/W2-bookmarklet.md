# W2: bookmarklet for cross-AI capture

**Commit.** `31e4f3a8`. *W2: bookmarklet for cross-AI capture
(ChatGPT/Claude/Gemini)*

## Why a bookmarklet

W1 covers ChatGPT shares server-side. The other two providers can't
be reached the same way:

- **Claude** is behind Cloudflare and returns 403 to non-browser
  fetches even with a realistic UA.
- **Gemini** loads the conversation via XHR after auth; the initial
  HTML has no message data.

A bookmarklet runs in the user's already-authenticated browser session,
so it sees the rendered DOM and bypasses both problems. Same hub URL
on the other side, same `/api/docs` ingest path.

## Files

| Path | Role |
|------|------|
| `apps/web/public/bookmarklet.js` | Hosted full extractor (~13 KB) |
| `apps/web/src/app/bookmarklet/page.tsx` | Drag-to-install landing page |
| `apps/web/src/app/bookmarklet/InstallButton.tsx` | Client-side button (React 19 blocks `javascript:` URLs by default; ref-based fix lives here) |
| `apps/web/src/lib/share-importers/index.ts` | Updated Claude/Gemini errors point users to the bookmarklet |
| `apps/web/scripts/test-bookmarklet.ts` | Regression suite |

## Bookmarklet behavior

1. Detects provider from `location.hostname`.
2. Walks the visible DOM:
   - **ChatGPT**: `[data-message-author-role="user|assistant"]` with `.markdown` / `.whitespace-pre-wrap` containers.
   - **Claude**: `[data-testid="user-message"]` and `.font-claude-message` / `.font-claude-response` (with innermost-only dedup).
   - **Gemini**: `<user-query>` and `<model-response>` Angular tags, with class-based fallback.
3. Compact HTML→markdown converter (no Turndown, keeps the script under 20 KB) handles paragraphs, headings, lists, code, tables, blockquotes, inline emphasis, links, images.
4. POSTs `{markdown, title, source: "bookmarklet-<provider>"}` to `/api/docs`.
5. Opens the new doc URL in a tab.

A small overlay shows progress and the resulting URL. Re-entrancy guard
prevents duplicate runs on a double-click.

## Verified scenarios

`pnpm --filter web test:bookmarklet` runs 30 assertions across 6 cases.
Uses `linkedom` to provide a synthetic DOM and a mocked `fetch`.

- ChatGPT page extraction (title cleanup, 2-user/1-assistant order, bold, code blocks)
- Claude page extraction (italic, ordered list)
- Gemini page extraction (`user-query` / `model-response`)
- Empty page does not POST
- Unsupported host does not POST
- Re-entrancy guard prevents duplicate runs

## Install page

`/bookmarklet` on staging serves a landing with three steps: open
bookmarks bar, drag the orange button up, click it on any AI chat.
The `href` is set on the underlying anchor via a ref because React 19
blocks `javascript:` URLs in JSX by default.

## Deferred

- Mobile native app. Bookmarklet works on mobile Safari, so this is
  pushed to post-W12.
- Updating existing Chrome extension to share the same compact
  extractor. The extension still has its own logic; reconciliation is
  a post-launch refactor.
