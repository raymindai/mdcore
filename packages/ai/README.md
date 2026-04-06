# @mdcore/ai

AI provider abstraction for mdfy.cc -- supports Gemini, OpenAI, and Anthropic with built-in text-to-markdown and diagram conversion.

## Install

```bash
npm install @mdcore/ai
```

## Usage

### Call any AI provider

```ts
import { callAI } from "@mdcore/ai";

const result = await callAI("Summarize this text...", {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
});
```

### Convert raw text to structured Markdown

```ts
import { mdfyText } from "@mdcore/ai";

const markdown = await mdfyText(rawText, {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
}, "document.pdf");
```

### Convert ASCII/Mermaid to HTML diagram

```ts
import { asciiRender } from "@mdcore/ai";

const html = await asciiRender("graph LR; A-->B-->C", {
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
});
```

### Detect and format AI conversations

```ts
import { isAiConversation, parseConversation, formatConversation } from "@mdcore/ai";

if (isAiConversation(text)) {
  const messages = parseConversation(text);
  const markdown = formatConversation(messages);
}
```

### Use a specific provider directly

```ts
import { callGemini, callOpenAI, callAnthropic } from "@mdcore/ai";

const text = await callGemini("Hello", {
  provider: "gemini",
  apiKey: "...",
  model: "gemini-3.1-flash-lite-preview", // optional override
});
```

## Supported Providers

| Provider | Default Model | API |
|----------|--------------|-----|
| `gemini` | `gemini-3.1-flash-lite-preview` | Google Generative AI |
| `openai` | `gpt-5.4-mini` | OpenAI Chat Completions |
| `anthropic` | `claude-haiku-4-5` | Anthropic Messages |

## License

MIT
