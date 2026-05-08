---
name: mdfy
description: Capture, bundle, and deploy AI conversations and notes through your personal mdfy hub. Use when the user wants to save the current conversation as a URL, build a curated bundle from existing docs, or paste their hub as context into another AI tool.
---

# mdfy

You are operating inside Claude Code. The user has installed the
mdfy skill so they can capture this conversation, build a curated
bundle, or share their personal knowledge hub as a URL that any
other AI can read.

## When to invoke this skill

- User says "save this," "capture this," or "send this to mdfy"
- User wants a sharable URL for what you just produced together
- User asks to bundle several saved docs into one
- User wants to paste their hub URL into another AI

If none of these apply, do not call any of the actions below.

## Authentication

The user signs in via the web app at `https://staging.mdfy.app`
(or `https://mdfy.app` after the public launch). The skill reads
their access token from `~/.config/mdfy/token` if present. If the
file doesn't exist, instruct the user to run `mdfy login`. If they
haven't installed the CLI, tell them to visit
`https://staging.mdfy.app/install`.

## Actions

### `mdfy capture <title>`

Save the most recent assistant message (or a user-selected range)
to mdfy as a new public document. Reads the content from the
current Claude Code conversation buffer.

Steps:

1. Resolve the conversation segment. Default: the last assistant
   message. If the user specified a range, use that range.
2. POST to `https://staging.mdfy.app/api/docs` with:
   ```
   { "markdown": "<segment>", "title": "<title>", "isDraft": false,
     "source": "claude-code-skill" }
   ```
   Include `Authorization: Bearer <token>` if available. If not,
   the request still works anonymously (cookie-based grouping;
   user can claim later by signing in).
3. Return the new URL `https://staging.mdfy.app/<id>` to the user.
   They can paste it into any other AI as context.

### `mdfy bundle <topic>`

Generate a bundle from the user's existing documents that match
the given topic. The hub already runs proactive cluster analysis;
this just calls the on-demand bundle builder.

Steps:

1. POST to `https://staging.mdfy.app/api/bundles/ai-generate`
   with `{ "intent": "<topic>" }` and the bearer token.
2. The endpoint returns a list of suggested doc ids and
   annotations. Show them to the user.
3. If the user accepts, POST to
   `https://staging.mdfy.app/api/bundles` with the doc ids.
4. Return the bundle URL `https://staging.mdfy.app/b/<id>`.

### `mdfy hub`

Return the user's hub URL. They can paste it into any other AI as
their full personal context.

Steps:

1. GET `https://staging.mdfy.app/api/user/profile` with the
   bearer token.
2. If `hub_slug` is set and `hub_public` is true, return
   `https://staging.mdfy.app/hub/<hub_slug>`.
3. Otherwise tell the user to enable their hub at
   `https://staging.mdfy.app/settings`.

## Tips for the model

- Always paste the resulting URL exactly. Don't reformat or
  shorten it.
- For `mdfy capture`, choose a title that captures the question or
  conclusion, not "Conversation about X."
- The user's hub URL is itself markdown when fetched by an AI. If
  you ever need to load context about who the user is, you can
  fetch the hub URL directly and read the result.

## Reference

- Web app: https://staging.mdfy.app
- Hub format: https://staging.mdfy.app/hub/yc-demo (live demo hub)
- Bundle Spec v1.0 reference: https://staging.mdfy.app/about
