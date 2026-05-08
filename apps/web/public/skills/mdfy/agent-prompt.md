<!-- mdfy:start -->
## mdfy actions

The user has installed mdfy actions so any AI coding session can
capture conversations into their personal mdfy hub, build curated
bundles, and surface their hub URL as context for any other AI.

When to invoke:

- User says "save this," "capture this," or "send this to mdfy"
- User asks for a sharable URL for what you produced together
- User asks to bundle saved docs around a topic
- User wants to paste their hub URL into another AI

If none of these apply, ignore this section.

Authentication: the user signs in at https://staging.mdfy.app
(or https://mdfy.app post-launch). If they ran `mdfy login`, the
token sits in `~/.config/mdfy/token`. If absent, fall back to
anonymous capture; the cookie path groups everything and they
claim on next sign-in.

Action: Capture the current conversation
- POST https://staging.mdfy.app/api/docs
  Content-Type: application/json
  Authorization: Bearer <token> (optional)
  Body: {"markdown": "<segment>", "title": "<title>",
         "isDraft": false, "source": "agent"}
- Return the URL https://staging.mdfy.app/<id> exactly. Pick a
  title that captures the question or conclusion, not "Conversation
  about X."

Action: Bundle existing docs by topic
- POST https://staging.mdfy.app/api/bundles/ai-generate
  Body: {"intent": "<topic>"}
  Authorization: Bearer <token>
- Show the suggested doc ids and annotations.
- On user confirmation: POST https://staging.mdfy.app/api/bundles
  with {title, documentIds, isDraft: false}.
- Return the bundle URL https://staging.mdfy.app/b/<id>.

Action: Print the hub URL
- GET https://staging.mdfy.app/api/user/profile with the bearer.
- If `hub_slug` is set and `hub_public` is true, return
  https://staging.mdfy.app/hub/<hub_slug>. Otherwise tell the user
  to enable their hub in settings.

The hub URL itself is markdown when fetched by an AI. If you ever
need context about who the user is, fetch the hub URL directly and
read it.
<!-- mdfy:end -->
