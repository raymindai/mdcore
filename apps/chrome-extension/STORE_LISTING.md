# Web Store Listing — mdfy.app

## Extension Name

mdfy.app — Publish AI Output

## Short Description (132 chars max)

One-click capture from ChatGPT, Claude, and Gemini. Publish as a beautiful, shareable document on mdfy.app.

## Detailed Description (16,000 chars max)

mdfy.app turns AI conversations into shareable documents — instantly.

Working with ChatGPT, Claude, or Gemini? One click captures the conversation, formats it as a clean document, and gives you a permanent URL you can share with anyone.

WHAT IT DOES

– Capture full conversations from ChatGPT, Claude, and Gemini
– Capture individual messages with per-message “mdfy this” buttons
– Capture selected text from any webpage
– Open GitHub .md files directly in mdfy.app for beautiful rendering
– Publish instantly and get a shareable URL (mdfy.app/d/…)

HOW IT WORKS

1. Chat with any AI assistant as usual
2. Click the mdfy button (floating or per-message)
3. Your conversation is published as a formatted document
4. Share the URL — no login required

SUPPORTED PLATFORMS

– ChatGPT (chatgpt.com)
– Claude (claude.ai)
– Gemini (gemini.google.com)
– GitHub (any .md file)

KEY FEATURES

Conversation Capture

- Full conversation with proper User/Assistant formatting
- Range selection: capture last 3, 5, or 10 exchanges
- Per-message mini buttons on hover
- Floating “mdfy All” button with quick access

Smart Formatting

- Code blocks with syntax highlighting preserved
- Mathematical equations (KaTeX/MathJax) preserved
- Mermaid diagrams preserved as source code
- Tables, lists, and all Markdown formatting intact

Publishing Options

- Permanent short URL (mdfy.app/d/…)
- No account required for basic publishing
- Logged-in users get documents saved to their account
- Hash-based fallback for offline/anonymous sharing

GitHub Integration

- “Open in mdfy.app” button on any .md file
- Beautiful rendering with code highlighting, math, and diagrams
- Works on repository file views

PRIVACY

- No data is collected or stored by the extension itself
- Documents are published to mdfy.app servers only when you click publish
- No tracking, no analytics in the extension
- Open source: github.com/raymindai/mdcore

PERMISSIONS EXPLAINED

- activeTab: Access the current tab to extract content
- tabs: Detect which AI platform you’re on
- contextMenus: Right-click “Publish selection to mdfy.app”
- storage: Save your preferences (floating button visibility)
- scripting: Inject capture functionality into AI pages
- cookies: Check mdfy.app login status for authenticated publishing

---

mdfy.app — The fastest way from AI output to shared document.

## Category

Productivity

## Language

English

## Single Purpose Description (required by Chrome policy)

This extension from ChatGPT, Claude, and Gemini, and publishes it as a formatted document on mdfy.app.

---

## Store Assets Needed

### Icon

- 128x128 PNG (already at icons/icon128.png)

### Screenshots (1280x800 or 640x400, min 1, max 5)

Screenshot 1 — “Capture from ChatGPT”
Show: ChatGPT page with floating mdfy button visible, conversation in background.
Caption: One-click capture from ChatGPT

Screenshot 2 — “Capture from Claude”
Show: Claude.ai page with per-message mini buttons visible on hover.
Caption: Per-message capture from Claude

Screenshot 3 — “Published Document”
Show: mdfy.app/d/… page with a beautifully rendered document (code blocks, headings, etc).
Caption: Beautiful, shareable documents

Screenshot 4 — “GitHub Integration”
Show: GitHub .md file page with “Open in mdfy.app” button visible.
Caption: Open GitHub Markdown in mdfy.app

Screenshot 5 — “Extension Popup”
Show: The popup UI with platform detection indicator and capture options.
Caption: Smart platform detection

### Promotional Images (optional)

- Small tile: 440x280
- Marquee: 1400x560

---

## Privacy Practices (Chrome Web Store Developer Dashboard)

### Single Purpose

Captures AI conversation content and publishes it as formatted documents on mdfy.app.

### Permission Justifications

activeTab: Required to read conversation content from the current AI chat page (ChatGPT, Claude, Gemini) when the user clicks the capture button.

tabs: Required to detect which AI platform the user is currently on, to show the correct platform indicator in the popup and apply platform-specific extraction logic.

contextMenus: Required to add a right-click menu option “Publish selection to mdfy.app” for capturing selected text on any page.

storage: Required to persist user preferences such as floating button visibility setting across browser sessions.

scripting: Required to inject the content capture script into AI platform pages to enable conversation extraction.

cookies: Required to check if the user is logged into mdfy.app, enabling authenticated publishing that saves documents to their account.

host_permissions (<all_urls>): Required for the context menu “Publish selection” feature to work on any webpage, and for the background service worker to make API calls to mdfy.app on behalf of the content script (CORS bypass).

### Data Usage Disclosure

- Personally identifiable information: No
- Health information: No
- Financial information: No
- Authentication information: No (cookies are read-only, not collected)
- Personal communications: No
- Location: No
- Web history: No
- User activity: No
- Website content: Yes — conversation content is sent to mdfy.app servers only when the user explicitly clicks publish

### Data Sale

We do not sell user data.

### Data Use Purposes

- Conversation content is sent to mdfy.app solely to create a shareable document at the user’s explicit request.
