/**
 * Regression suite for the share-link importer.
 *
 * Covers both ChatGPT page formats currently observed in production:
 *   - Older `__NEXT_DATA__` JSON blob
 *   - Current React Router 7 turbo-stream payload
 *
 * Plus failure modes (404, 403, malformed payloads, wrong host, etc).
 *
 * Run with: pnpm test:share
 */

import { extractChatGPTShare } from "../src/lib/share-importers/chatgpt";
import { ShareImportError } from "../src/lib/share-importers/types";

let pass = 0, fail = 0;

function assert(cond: unknown, label: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
}

function makeHtml(nextData: unknown): string {
  const json = JSON.stringify(nextData);
  return `<!DOCTYPE html><html><head><title>Test</title></head><body>
<script id="__NEXT_DATA__" type="application/json">${json}</script>
</body></html>`;
}

function mockFetch(impl: (url: string) => Promise<Response> | Response) {
  (globalThis as unknown as { fetch: unknown }).fetch = (async (url: string) => impl(url)) as typeof fetch;
}

function htmlResponse(html: string, status = 200): Response {
  // A minimal Response-shaped object that the extractor's reader path can chew on.
  const encoder = new TextEncoder();
  const bytes = encoder.encode(html);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(stream, { status, statusText: status === 200 ? "OK" : "Error", headers: { "Content-Type": "text/html" } });
}

async function main() {
// ─── Test 1: linear_conversation shape (newer schema) ───
console.log("\n[1] linear_conversation shape");
{
  const nextData = {
    props: {
      pageProps: {
        serverResponse: {
          data: {
            title: "Talking about cats",
            linear_conversation: [
              { id: "m1", author: { role: "user" }, content: { content_type: "text", parts: ["Tell me about cats."] } },
              { id: "m2", author: { role: "assistant" }, content: { content_type: "text", parts: ["Cats are small carnivorous mammals."] } },
              { id: "m3", author: { role: "user" }, content: { content_type: "text", parts: ["What about Maine Coons?"] } },
              { id: "m4", author: { role: "assistant" }, content: { content_type: "text", parts: ["Maine Coons are large, friendly cats."] } },
            ],
          },
        },
      },
    },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-1");
  assert(result.provider === "chatgpt", "provider is chatgpt");
  assert(result.title === "Talking about cats", `title preserved (got "${result.title}")`);
  assert(result.turns === 2, `turns counted (got ${result.turns})`);
  assert(result.markdown.includes("# Talking about cats"), "title heading present");
  assert(result.markdown.includes("## You\n\nTell me about cats."), "first user block formatted");
  assert(result.markdown.includes("## ChatGPT\n\nCats are small carnivorous mammals."), "first assistant block formatted");
  assert(result.markdown.includes("> Captured from https://chatgpt.com/share/abc-1"), "source attribution included");
  // Order preserved
  const a = result.markdown.indexOf("Tell me about cats.");
  const b = result.markdown.indexOf("What about Maine Coons?");
  assert(a < b && a > 0, "messages in original order");
}

// ─── Test 2: mapping-tree shape (older / deeper schema) ───
console.log("\n[2] mapping-tree shape");
{
  const nextData = {
    props: {
      pageProps: {
        serverResponse: {
          data: {
            title: "Pricing strategy",
            current_node: "n4",
            mapping: {
              "root": { id: "root", message: null, parent: null, children: ["n1"] },
              "n1": { id: "n1", message: { author: { role: "user" }, content: { content_type: "text", parts: ["What pricing model should I use?"] } }, parent: "root", children: ["n2"] },
              "n2": { id: "n2", message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["Tiered freemium tends to work well."] } }, parent: "n1", children: ["n3"] },
              "n3": { id: "n3", message: { author: { role: "user" }, content: { content_type: "text", parts: ["What's the conversion rate?"] } }, parent: "n2", children: ["n4"] },
              "n4": { id: "n4", message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["Typical SaaS sees 1-2% on broad funnels, 3-5% on narrow."] } }, parent: "n3", children: [] },
            },
          },
        },
      },
    },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-2");
  assert(result.title === "Pricing strategy", "title from mapping shape");
  assert(result.turns === 2, "two user turns counted");
  // Order: walked from current_node up, then reversed → expect n1 → n4
  const order = ["What pricing model", "Tiered freemium", "conversion rate", "1-2% on broad"]
    .map(s => result.markdown.indexOf(s));
  assert(order.every((p, i) => i === 0 || p > order[i - 1]), "tree walk produces correct order");
}

// ─── Test 3: multimodal parts (image + text) ───
console.log("\n[3] multimodal parts");
{
  const nextData = {
    props: {
      pageProps: {
        serverResponse: {
          data: {
            title: "Photo question",
            linear_conversation: [
              {
                author: { role: "user" },
                content: {
                  content_type: "multimodal_text",
                  parts: [
                    { content_type: "image_asset_pointer", asset_pointer: "file-xyz" },
                    "What kind of dog is this?",
                  ],
                },
              },
              {
                author: { role: "assistant" },
                content: { content_type: "text", parts: ["That looks like a Border Collie."] },
              },
            ],
          },
        },
      },
    },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-3");
  assert(result.markdown.includes("*[image]*"), "image part rendered as placeholder");
  assert(result.markdown.includes("What kind of dog is this?"), "text part preserved");
}

// ─── Test 4: title fallback to first user message ───
console.log("\n[4] title fallback");
{
  const nextData = {
    props: { pageProps: { serverResponse: { data: {
      title: null,
      linear_conversation: [
        { author: { role: "user" }, content: { content_type: "text", parts: ["How do I deploy a Next.js app to Vercel with custom domains and edge runtime?"] } },
        { author: { role: "assistant" }, content: { content_type: "text", parts: ["Push to GitHub, link the repo, set domain in dashboard."] } },
      ],
    } } } },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-4");
  assert(result.title.startsWith("How do I deploy"), `title falls back to user snippet (got "${result.title}")`);
  assert(result.title.length <= 60, `title respects 60-char cap (got ${result.title.length})`);
}

// ─── Test 5: deep-search fallback (unknown wrapper path) ───
console.log("\n[5] deep-search fallback");
{
  const nextData = {
    // Conversation hidden under a non-canonical path
    props: { pageProps: { somethingElse: { wrapper: { conv: {
      title: "Hidden but findable",
      linear_conversation: [
        { author: { role: "user" }, content: { content_type: "text", parts: ["Hello"] } },
        { author: { role: "assistant" }, content: { content_type: "text", parts: ["Hi there"] } },
      ],
    } } } } },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-5");
  assert(result.title === "Hidden but findable", "deep search found the conversation");
  assert(result.turns === 1, "one turn in deep-search payload");
}

// ─── Test 6: empty conversation rejected ───
console.log("\n[6] empty conversation rejected");
{
  const nextData = {
    props: { pageProps: { serverResponse: { data: { title: "Empty", linear_conversation: [] } } } },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://chatgpt.com/share/abc-6"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on empty conversation");
  assert(caught?.userMessage.includes("no readable messages"), "error message clear");
}

// ─── Test 7: missing __NEXT_DATA__ ───
console.log("\n[7] missing __NEXT_DATA__");
{
  mockFetch(() => htmlResponse("<html><body>no script here</body></html>"));
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://chatgpt.com/share/abc-7"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on missing __NEXT_DATA__");
  assert(caught?.userMessage.includes("Couldn't read the conversation"), "user-friendly error");
}

// ─── Test 8: 404 from upstream ───
console.log("\n[8] upstream 404");
{
  mockFetch(() => htmlResponse("Not found", 404));
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://chatgpt.com/share/abc-8"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on 404");
  assert(caught?.status === 404, `status mapped to 404 (got ${caught?.status})`);
  assert(caught?.userMessage.includes("doesn't exist") || caught?.userMessage.includes("deleted"), "404 message");
}

// ─── Test 9: 403 (private share) ───
console.log("\n[9] private share (403)");
{
  mockFetch(() => htmlResponse("Forbidden", 403));
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://chatgpt.com/share/abc-9"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on 403");
  assert(caught?.status === 403, "status mapped to 403");
  assert(caught?.userMessage.includes("private"), "403 mentions private");
}

// ─── Test 10: legacy chat.openai.com domain ───
console.log("\n[10] legacy chat.openai.com domain");
{
  const nextData = {
    props: { pageProps: { serverResponse: { data: {
      title: "Legacy",
      linear_conversation: [
        { author: { role: "user" }, content: { parts: ["Hi"] } },
        { author: { role: "assistant" }, content: { parts: ["Hello"] } },
      ],
    } } } },
  };
  let receivedUrl = "";
  mockFetch((url) => { receivedUrl = url; return htmlResponse(makeHtml(nextData)); });
  const result = await extractChatGPTShare("https://chat.openai.com/share/legacy-1?utm=foo");
  assert(receivedUrl === "https://chatgpt.com/share/legacy-1", `URL canonicalized to chatgpt.com (got ${receivedUrl})`);
  assert(result.sourceUrl === "https://chatgpt.com/share/legacy-1", "result.sourceUrl is canonical");
}

// ─── Test 11: non-share path rejected ───
console.log("\n[11] non-share path rejected");
{
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://chatgpt.com/c/abc-123"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on /c/ path");
  assert(caught?.status === 400, "status 400");
  assert(caught?.userMessage.includes("share link"), "error explains share path required");
}

// ─── Test 12: invalid URL ───
console.log("\n[12] invalid URL");
{
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("not a url at all"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on garbage URL");
  assert(caught?.status === 400, "status 400");
}

// ─── Test 13: wrong host rejected ───
console.log("\n[13] wrong host rejected");
{
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://example.com/share/whatever"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on non-ChatGPT host");
  assert(caught?.userMessage.includes("Not a ChatGPT"), "error mentions ChatGPT");
}

// ─── Test 14: malformed JSON in __NEXT_DATA__ ───
console.log("\n[14] malformed __NEXT_DATA__ JSON");
{
  mockFetch(() => htmlResponse(`<script id="__NEXT_DATA__" type="application/json">{ malformed json</script>`));
  let caught: ShareImportError | null = null;
  try { await extractChatGPTShare("https://chatgpt.com/share/abc-14"); }
  catch (e) { caught = e as ShareImportError; }
  assert(caught !== null, "throws on bad JSON");
  assert(caught?.userMessage.includes("format may have changed") || caught?.userMessage.includes("Couldn't read"), "graceful error");
}

// ─── Test 15: messages with empty content filtered ───
console.log("\n[15] empty-content messages filtered");
{
  const nextData = {
    props: { pageProps: { serverResponse: { data: {
      title: "Mixed",
      linear_conversation: [
        { author: { role: "system" }, content: { parts: ["You are a helpful assistant."] } }, // system filtered
        { author: { role: "user" }, content: { parts: [""] } }, // empty filtered
        { author: { role: "user" }, content: { parts: ["Real question?"] } },
        { author: { role: "assistant" }, content: { parts: ["Real answer."] } },
        { author: { role: "tool" }, content: { parts: ["tool output"] } }, // tool filtered
      ],
    } } } },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-15");
  assert(result.turns === 1, `only real user turn counted (got ${result.turns})`);
  assert(!result.markdown.includes("system"), "system message excluded");
  assert(!result.markdown.includes("tool output"), "tool output excluded");
  assert(result.markdown.includes("Real question?"), "real user message present");
  assert(result.markdown.includes("Real answer."), "real assistant message present");
}

// ─── Test 16: text via top-level `text` instead of `parts` ───
console.log("\n[16] alternate content shape using `text`");
{
  const nextData = {
    props: { pageProps: { serverResponse: { data: {
      title: "Alt shape",
      linear_conversation: [
        { author: { role: "user" }, content: { content_type: "text", text: "Direct text field" } },
        { author: { role: "assistant" }, content: { content_type: "text", text: "Direct response" } },
      ],
    } } } },
  };
  mockFetch(() => htmlResponse(makeHtml(nextData)));
  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-16");
  assert(result.markdown.includes("Direct text field"), "content.text path works");
  assert(result.markdown.includes("Direct response"), "assistant content.text works");
}

}

main().then(async () => {
// ─── Test 17: turbo-stream format (current 2026 production shape) ───
console.log("\n[17] turbo-stream format");
{
  const slots = [
    { _1: 2 },
    "loaderData",
    { _3: 4 },
    "routes/share.$shareId.($action)",
    { _5: 6 },
    "serverResponse",
    { _7: 8 },
    "data",
    { _9: 10, _11: 12 },
    "title",
    "Captured share",
    "linear_conversation",
    [13, 14],
    { _15: 16 },
    { _15: 17 },
    "message",
    { _18: 19, _20: 21 },
    { _18: 22, _20: 23 },
    "author",
    { _24: 25 },
    "content",
    { _26: 27 },
    { _24: 28 },
    { _26: 29 },
    "role",
    "user",
    "parts",
    [30],
    "assistant",
    [31],
    "What's the weather?",
    "72°F and sunny.",
  ];
  const inner = JSON.stringify(slots);
  const jsLiteral = JSON.stringify(inner);
  const html = `<!DOCTYPE html><html><body>
<script>window.__reactRouterContext.streamController.enqueue(${jsLiteral})</script>
</body></html>`;
  mockFetch(() => htmlResponse(html));

  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-17");
  assert(result.title === "Captured share", `title from turbo-stream (got "${result.title}")`);
  assert(result.turns === 1, `1 user turn (got ${result.turns})`);
  assert(result.markdown.includes("What's the weather?"), "user message extracted");
  assert(result.markdown.includes("72°F and sunny."), "assistant message extracted");
  assert(result.markdown.includes("## You"), "user heading rendered");
  assert(result.markdown.includes("## ChatGPT"), "assistant heading rendered");
}

// ─── Test 18: turbo-stream filters hidden system + tool messages ───
console.log("\n[18] turbo-stream filters hidden + tool");
{
  const slots: unknown[] = [
    { _1: 2 },
    "loaderData",
    { _3: 4 },
    "routes/share.$shareId",
    { _5: 6 },
    "serverResponse",
    { _7: 8 },
    "data",
    { _9: 10, _11: 12 },
    "title",
    "Mixed",
    "linear_conversation",
    [13, 14, 15, 16],
    { _17: 18 },
    { _17: 19 },
    { _17: 20 },
    { _17: 21 },
    "message",
    {
      author: { role: "system" },
      content: { parts: ["You are a helpful assistant."] },
      metadata: { is_visually_hidden_from_conversation: true },
    },
    {
      author: { role: "tool", name: "a8km123" },
      content: { parts: ["**Thinking...**\n\nLet me consider..."] },
    },
    { author: { role: "user" }, content: { parts: ["What's 2+2?"] } },
    { author: { role: "assistant" }, content: { parts: ["4."] } },
  ];
  const inner = JSON.stringify(slots);
  const jsLiteral = JSON.stringify(inner);
  const html = `<script>window.__reactRouterContext.streamController.enqueue(${jsLiteral})</script>`;
  mockFetch(() => htmlResponse(html));

  const result = await extractChatGPTShare("https://chatgpt.com/share/abc-18");
  assert(result.turns === 1, `only real user turn counted (got ${result.turns})`);
  assert(!result.markdown.includes("You are a helpful assistant"), "hidden system filtered");
  assert(!result.markdown.includes("Thinking..."), "tool scratchpad filtered");
  assert(result.markdown.includes("What's 2+2?"), "real user msg present");
  assert(result.markdown.includes("4."), "real assistant msg present");
}

// ─── Summary ───
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
}).catch((e) => { console.error(e); process.exit(1); });
