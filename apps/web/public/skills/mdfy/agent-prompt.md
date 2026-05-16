<!-- mdfy:start -->
## mdfy actions

The user has installed mdfy actions so any AI coding session can
capture conversations into their personal mdfy hub, pull prior work
back as context, edit existing docs, build curated bundles, and
surface their hub URL as context for any other AI.

When to invoke:

- "save this" / "capture this" → capture
- "update doc <id>" / "edit doc <id>" → update
- "search my hub" / "what do I have on X" → search
- "what are my recent docs" → list
- "pull doc <id>" / "load mdfy.app/<id>" → pull
- "find related" / "anything in my hub about this" → related
- "bundle these" / "make a bundle on X" → bundle
- "give me my hub URL" → hub

If none apply, ignore this section.

Authentication: the user signs in at https://mdfy.app. After running
`mdfy login`, the token lives in `~/.mdfy/config.json`. If absent,
capture works anonymously; retrieve actions (search/list/recent/
related) need login — direct the user to https://mdfy.app/install.

Action: capture
- POST https://mdfy.app/api/docs
  Body: {"markdown": "<segment>", "title": "<title>",
         "isDraft": false, "source": "agent"}
  Authorization: Bearer <token> (optional)
- Return https://mdfy.app/<id>. Title = question/conclusion, not
  "Conversation about X."

Action: update
- PATCH https://mdfy.app/api/docs/<id>
  Body: {"action": "auto-save", "markdown": "<new>",
         "editToken": "<token from ~/.mdfy/tokens.json>"}
- For section edits: GET first, find the heading (case-insensitive),
  splice replacement, then PATCH the whole doc.

Action: search
- GET https://mdfy.app/api/search?q=<query> with bearer.
- Return top 5–10 as `- **<title>** (mdfy.app/<id>) — <snippet>`.

Action: list
- GET https://mdfy.app/api/user/recent with bearer.
- Up to 20 entries, newest first, numbered.

Action: pull
- GET https://mdfy.app/<id>.md (no auth for public docs).
- Insert into conversation as `Loaded mdfy.app/<id> ("<title>") as
  context.` then continue answering using the loaded markdown as
  background.

Action: related
- Derive a topic phrase from the recent assistant message.
- GET https://mdfy.app/api/search?q=<phrase> with bearer.
- Frame as "Related docs in your hub: ..." and offer to pull any.

Action: bundle
- POST https://mdfy.app/api/bundles/ai-generate
  Body: {"intent": "<topic>"} + bearer.
- Show suggested doc ids. On confirmation POST
  https://mdfy.app/api/bundles with {title, documentIds,
  isDraft: false}.
- Return https://mdfy.app/b/<id>.

Action: hub
- GET https://mdfy.app/api/user/profile with bearer.
- If `hub_slug` and `hub_public`: return
  https://mdfy.app/hub/<hub_slug>. Otherwise direct to
  https://mdfy.app/settings.

The hub URL is markdown when fetched by an AI. If you need context
about the user, fetch the hub URL directly.
<!-- mdfy:end -->
