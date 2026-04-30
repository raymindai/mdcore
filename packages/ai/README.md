# @mdcore/ai

AI provider abstraction for [mdfy.app](https://mdfy.app) -- supports Google Gemini, OpenAI, and Anthropic with built-in text-to-markdown conversion, ASCII diagram rendering, and AI conversation detection.

**BYOK (Bring Your Own Key)** -- this package makes raw HTTP calls to each provider's API. No SDKs required. You supply the API key.

## Install

```bash
npm install @mdcore/ai
```

## Quick Start

```ts
import { mdfyText } from "@mdcore/ai";

// Convert raw text into structured Markdown using AI
const markdown = await mdfyText(rawText, {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
});
```

## Supported Providers

| Provider | Default Model | API Endpoint | How to Get a Key |
|----------|--------------|-------------|------------------|
| `gemini` | `gemini-3.1-flash-lite-preview` | Google Generative AI | [ai.google.dev](https://ai.google.dev/) |
| `openai` | `gpt-5.4-mini` | OpenAI Chat Completions | [platform.openai.com](https://platform.openai.com/) |
| `anthropic` | `claude-haiku-4-5` | Anthropic Messages | [console.anthropic.com](https://console.anthropic.com/) |

## Configuration

Every AI function takes an `AIConfig` object:

```ts
interface AIConfig {
  /** Which provider to use */
  provider: "gemini" | "openai" | "anthropic";
  /** API key for the provider */
  apiKey: string;
  /** Override the default model (optional) */
  model?: string;
  /** Override temperature (default: 0.1) */
  temperature?: number;
  /** Override max output tokens (default: 8192) */
  maxTokens?: number;
}
```

### Default Configuration

```ts
import { DEFAULT_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "@mdcore/ai";

// DEFAULT_MODELS = {
//   gemini: "gemini-3.1-flash-lite-preview",
//   openai: "gpt-5.4-mini",
//   anthropic: "claude-haiku-4-5",
// }
// DEFAULT_TEMPERATURE = 0.1
// DEFAULT_MAX_TOKENS = 8192
```

## API Reference

### callAI(prompt, config)

Call any AI provider based on `config.provider`. This is the universal entry point.

```ts
import { callAI } from "@mdcore/ai";

const result = await callAI("Summarize this text in 3 bullet points: ...", {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
});

console.log(result); // "- Point one\n- Point two\n- Point three"
```

**Returns:** `string` -- the generated text response.

### callGemini(prompt, config)

Call Google Gemini directly.

```ts
import { callGemini } from "@mdcore/ai";

const text = await callGemini("Explain quantum computing", {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
  model: "gemini-2.0-flash",  // optional override
});
```

### callOpenAI(prompt, config)

Call OpenAI Chat Completions directly.

```ts
import { callOpenAI } from "@mdcore/ai";

const text = await callOpenAI("Write a haiku about code", {
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o",  // optional override
  temperature: 0.7,  // more creative
});
```

### callAnthropic(prompt, config)

Call Anthropic Messages API directly.

```ts
import { callAnthropic } from "@mdcore/ai";

const text = await callAnthropic("Explain monads simply", {
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: "claude-sonnet-4-5",  // optional override
});
```

### mdfyText(text, config, filename?)

Convert raw/unformatted text into well-structured Markdown using AI. This is the core "mdfy" feature -- takes messy text (PDF extraction, pasted email, raw text file) and reconstructs proper Markdown structure.

```ts
import { mdfyText } from "@mdcore/ai";

// From a PDF extraction
const markdown = await mdfyText(rawPdfText, {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
}, "report.pdf");

// From clipboard paste
const markdown2 = await mdfyText(clipboardText, {
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Raw text to convert (truncated to 30,000 chars internally) |
| `config` | `AIConfig` | AI provider configuration |
| `filename` | `string?` | Optional source filename (helps AI understand context) |

**Returns:** `string` -- structured Markdown.

The AI will:
- Detect headings from context and apply `#`, `##`, `###`
- Format bullet/numbered lists
- Create Markdown tables
- Wrap code in fenced code blocks with language hints
- Apply bold/italic emphasis
- Preserve all original content (no summarization)
- Preserve the original language for non-English text

### asciiToMermaid(ascii, config)

Convert ASCII art or box-drawing diagrams into Mermaid code. The returned Mermaid code is then rendered by mermaid.js through the standard pipeline.

```ts
import { asciiToMermaid } from "@mdcore/ai";

const mermaidCode = await asciiToMermaid(`
  +--------+     +--------+
  | Client | --> | Server |
  +--------+     +--------+
`, {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
});
// Returns: "graph LR\n    Client --> Server"
```

**Returns:** `string` -- valid Mermaid code (graph TD, sequenceDiagram, etc.)

How it works:
- AI extracts relationships from ASCII art and outputs Mermaid syntax
- Optionally accepts a canvas image (base64) for vision-based spatial analysis
- Optionally accepts document context for better label understanding
- Mermaid.js handles the rendering (deterministic, themed)

### isAiConversation(text)

Detect if text looks like an AI conversation (ChatGPT, Claude, Gemini output format).

```ts
import { isAiConversation } from "@mdcore/ai";

isAiConversation("User: Hello\nAssistant: Hi there!");  // true
isAiConversation("Just some normal text");                // false
```

Detects patterns:
- `User:` / `Assistant:` prefixes
- `Human:` / `AI:` prefixes
- `You said:` / `ChatGPT said:` prefixes
- `Question:` / `Answer:` prefixes

### parseConversation(text)

Parse raw AI conversation text into structured messages.

```ts
import { parseConversation } from "@mdcore/ai";

const messages = parseConversation("User: What is Rust?\nAssistant: Rust is a systems programming language...");

// [
//   { role: "user", content: "What is Rust?" },
//   { role: "assistant", content: "Rust is a systems programming language..." },
// ]
```

**Returns:** `ConversationMessage[]`

```ts
interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
```

### formatConversation(messages)

Format parsed conversation messages into clean Markdown with horizontal rules separating turns.

```ts
import { parseConversation, formatConversation } from "@mdcore/ai";

const messages = parseConversation(rawText);
const markdown = formatConversation(messages);

// **You**
//
// What is Rust?
//
// ---
//
// **Assistant**
//
// Rust is a systems programming language...
```

## Provider Setup

### Google Gemini

1. Go to [ai.google.dev](https://ai.google.dev/) and create an API key
2. Set the environment variable:

```bash
export GEMINI_API_KEY=AIzaSy...
```

```ts
const config = {
  provider: "gemini" as const,
  apiKey: process.env.GEMINI_API_KEY!,
};
```

Gemini is the default provider used by mdfy.app. It offers the best cost/speed ratio for text-to-markdown tasks.

### OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and create an API key
2. Set the environment variable:

```bash
export OPENAI_API_KEY=sk-...
```

```ts
const config = {
  provider: "openai" as const,
  apiKey: process.env.OPENAI_API_KEY!,
};
```

### Anthropic

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and create an API key
2. Set the environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

```ts
const config = {
  provider: "anthropic" as const,
  apiKey: process.env.ANTHROPIC_API_KEY!,
};
```

## BYOK (Bring Your Own Key)

This package does not include or bundle any AI SDK. Each provider function makes a single `fetch` call to the provider's REST API:

| Provider | Endpoint |
|----------|----------|
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1/messages` |

Benefits:
- Zero AI SDK dependencies (no `@google/generative-ai`, no `openai`, no `@anthropic-ai/sdk`)
- Works in any runtime with `fetch` (Node.js 18+, Deno, Bun, Cloudflare Workers)
- Full control over which provider and model to use
- Keys never leave your environment

## Server-Side vs Client-Side

This package should be used **server-side only** in production to protect API keys.

```ts
// GOOD: Next.js API route
// app/api/mdfy/route.ts
import { mdfyText } from "@mdcore/ai";

export async function POST(req: Request) {
  const { text } = await req.json();
  const markdown = await mdfyText(text, {
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY!, // server-side only
  });
  return Response.json({ markdown });
}
```

```ts
// BAD: Client-side (exposes your API key!)
// Don't do this in browser code.
```

For client-side usage (e.g., a CLI tool or Electron app where the user provides their own key), BYOK is acceptable:

```ts
// User provides their own key in settings
const markdown = await mdfyText(text, {
  provider: userSettings.provider,
  apiKey: userSettings.apiKey,
});
```

## Cost Considerations

All AI functions make a single API call per invocation. Approximate cost per `mdfyText` call (based on typical input of ~5,000 tokens + ~2,000 token output):

| Provider | Model | Approximate Cost |
|----------|-------|-----------------|
| Gemini | gemini-3.1-flash-lite-preview | ~$0.0005 |
| OpenAI | gpt-5.4-mini | ~$0.002 |
| Anthropic | claude-haiku-4-5 | ~$0.001 |

`mdfyText` truncates input to 30,000 characters to stay within token limits.

## Error Handling

Provider functions throw standard `Error` with descriptive messages:

```ts
try {
  await callAI("Hello", {
    provider: "gemini",
    apiKey: "invalid-key",
  });
} catch (err) {
  // Error: Gemini API error (400): { "error": { "message": "API key not valid." } }
  console.error(err.message);
}
```

Error format: `{Provider} API error ({status}): {first 200 chars of response}`

## Types Reference

```ts
import type {
  AIProvider,           // "gemini" | "openai" | "anthropic"
  AIConfig,             // { provider, apiKey, model?, temperature?, maxTokens? }
  AIResult,             // { text, provider, model }
  ConversationMessage,  // { role, content }
} from "@mdcore/ai";
```

## Requirements

- Node.js 18+ (or any runtime with global `fetch`)
- No external dependencies
- API key for at least one provider

## License

MIT
