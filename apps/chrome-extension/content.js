/**
 * mdfy.cc Chrome Extension — Content Script
 *
 * Injected into ChatGPT, Claude, and Gemini pages.
 * Adds a floating "mdfy" button and per-message mini buttons.
 * Extracts conversation content as Markdown and sends to mdfy.cc.
 */

(function () {
  "use strict";

  // Prevent double-injection
  if (document.getElementById("mdfy-float-container")) return;

  const MDFY_URL = "https://mdfy.cc";
  const MAX_URL_BYTES = 8000; // ~8KB limit for URL hash

  // ─── Platform Detection ───

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) return "chatgpt";
    if (host.includes("claude.ai")) return "claude";
    if (host.includes("gemini.google.com")) return "gemini";
    return null;
  }

  const platform = detectPlatform();
  if (!platform) return;

  // ─── Compression (matches mdfy.cc's share.ts) ───

  function arrayBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  async function compressToBase64Url(text) {
    try {
      const stream = new Blob([text])
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
      const compressed = await new Response(stream).arrayBuffer();
      return arrayBufferToBase64Url(compressed);
    } catch (err) {
      console.warn("[mdfy] Compression failed, using plain base64:", err);
      // Fallback: plain base64
      return btoa(unescape(encodeURIComponent(text)));
    }
  }

  // ─── Proxy Fetch (via background to bypass CORS) ───

  function proxyFetch(url, options = {}) {
    if (!chrome.runtime?.id) return Promise.resolve({ ok: false, error: "extension context invalidated" });
    return new Promise((resolve) => {
      const serializableOptions = { ...options };
      if (options.body instanceof FormData) {
        resolve({ ok: false, error: "FormData not supported via proxy" });
        return;
      }
      try {
        chrome.runtime.sendMessage(
          { action: "proxy-fetch", url, options: serializableOptions },
          (r) => {
            if (chrome.runtime.lastError) { resolve({ ok: false, error: chrome.runtime.lastError.message }); return; }
            resolve(r || { ok: false, error: "no response" });
          }
        );
      } catch {
        resolve({ ok: false, error: "extension context invalidated" });
      }
    });
  }

  // ─── Toast Notification ───

  function showToast(message, duration = 3000) {
    const existing = document.getElementById("mdfy-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "mdfy-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("mdfy-toast-visible");
    });

    setTimeout(() => {
      toast.classList.remove("mdfy-toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ─── SVG to Data URL ───

  function svgToDataUrl(svgEl) {
    try {
      // Serialize SVG to string
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      // Encode as data URL
      const encoded = encodeURIComponent(svgStr)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      return "data:image/svg+xml," + encoded;
    } catch {
      return null;
    }
  }

  // ─── HTML to Markdown Conversion (lightweight) ───

  function htmlToMarkdown(el) {
    if (!el) return "";

    // Clone to avoid mutating the page
    const clone = el.cloneNode(true);

    // ── Step 0a: Preserve mermaid source from hidden elements before removal ──
    const mermaidSources = new Map();
    clone.querySelectorAll("pre, code").forEach((el) => {
      const text = el.textContent || "";
      const cls = el.className || "";
      const trimmed = text.trim();
      const isMermaid = /language-mermaid|lang-mermaid/i.test(cls) ||
        /^mermaid\s*$/im.test(trimmed.split("\n")[0]) ||
        /^(graph |flowchart |sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie |gitGraph|journey|mindmap|timeline)/m.test(trimmed);
      if (isMermaid && trimmed.length > 5) {
        // Strip "Mermaid" header line if present (ChatGPT adds language label as first line)
        let source = trimmed;
        if (/^mermaid\s*$/im.test(source.split("\n")[0])) {
          source = source.split("\n").slice(1).join("\n").trim();
        }
        // Store source keyed by ancestor containers (walk up for iframe matching)
        let container = el.closest("div") || el.parentElement;
        for (let i = 0; i < 5 && container; i++) {
          mermaidSources.set(container, source);
          container = container.parentElement;
        }
      }
    });

    // ── Step 0b: Remove injected UI and non-content elements ──
    clone.querySelectorAll(
      ".mdfy-mini-btn, .mdfy-float-btn, #mdfy-float-btn, [class*='mdfy'], " +
      "button[class*='copy'], button[class*='Copy'], button[class*='group/status'], " +
      "[class*='view-transition'], style, script, noscript, " +
      "[class*='skill'], [class*='toolbar'], " +
      "[class*='show_widget'], " +
      "button[aria-expanded], " +
      "[aria-hidden='true'], .sr-only"
    ).forEach((el) => el.remove());

    // ── Step 1a: Iframes → mermaid code blocks or artifact placeholders ──
    clone.querySelectorAll("iframe").forEach((iframe) => {
      // Check if this iframe is near a stored mermaid source
      let mermaidSource = null;
      let container = iframe.closest("div") || iframe.parentElement;
      for (let i = 0; i < 5 && container; i++) {
        if (mermaidSources.has(container)) {
          mermaidSource = mermaidSources.get(container);
          break;
        }
        container = container.parentElement;
      }

      if (mermaidSource) {
        iframe.textContent = "\n```mermaid\n" + mermaidSource + "\n```\n";
        return;
      }

      // Claude artifact iframes
      const src = iframe.getAttribute("src") || "";
      if (src.includes("claudemcpcontent.com") || src.includes("artifact")) {
        const cont = iframe.closest("div");
        const heading = cont?.querySelector("h1, h2, h3, [class*='title']");
        const title = heading?.textContent?.trim() || iframe.getAttribute("title") || "";
        const label = title ? "📊 *" + title + "*" : "📊 *Interactive diagram*";
        iframe.textContent = "\n\n" + label + "\n*(Download the diagram from the original conversation and paste it here)*\n\n";
      }
    });

    // ── Step 1b: SVG diagrams → inline image or mermaid code ──
    clone.querySelectorAll("svg").forEach((svg) => {
      // Skip tiny icons (< 50px)
      const w = parseInt(svg.getAttribute("width") || svg.style.width || "0");
      const h = parseInt(svg.getAttribute("height") || svg.style.height || "0");
      const viewBox = svg.getAttribute("viewBox");
      const isLarge = w > 50 || h > 50 || (viewBox && !svg.closest("button"));

      if (!isLarge) {
        svg.remove();
        return;
      }

      // Detect mermaid SVG by multiple signals
      const svgId = svg.getAttribute("id") || "";
      const ariaRole = svg.getAttribute("aria-roledescription") || "";
      const svgClass = svg.className?.baseVal || svg.getAttribute("class") || "";
      const isMermaidSvg = /mermaid/i.test(svgId) || /mermaid/i.test(svgClass) ||
        /flowchart|sequence|class|state|er|gantt|pie|git|journey|mindmap|timeline/i.test(ariaRole);

      // Check for mermaid source: data attribute, nearby stored source, or nearby code block
      let mermaidSource = svg.getAttribute("data-mermaid-source") ||
        svg.closest("[data-mermaid-source]")?.getAttribute("data-mermaid-source") || "";

      if (!mermaidSource && isMermaidSvg) {
        // Look for preserved mermaid source from Step 0a
        const container = svg.closest("div");
        for (let el = container; el && !mermaidSource; el = el.parentElement) {
          if (mermaidSources.has(el)) {
            mermaidSource = mermaidSources.get(el);
          }
        }
        // Also check sibling/nearby pre elements
        if (!mermaidSource) {
          const parent = svg.parentElement;
          const nearbyPre = parent?.querySelector("pre") || parent?.parentElement?.querySelector("pre");
          if (nearbyPre) {
            const preText = nearbyPre.textContent?.trim() || "";
            if (/^(graph |flowchart |sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie |gitGraph|journey|mindmap|timeline)/m.test(preText)) {
              mermaidSource = preText;
            }
          }
        }
      }

      if (mermaidSource) {
        svg.textContent = "\n```mermaid\n" + mermaidSource + "\n```\n";
        return;
      }

      // Fallback: convert SVG to data URL image
      const dataUrl = svgToDataUrl(svg);
      if (dataUrl) {
        const alt = svg.getAttribute("aria-label") || svg.getAttribute("title") || "diagram";
        svg.textContent = "\n![" + alt + "](" + dataUrl + ")\n";
      } else {
        svg.remove();
      }
    });

    // ── Step 2: KaTeX rendered math → LaTeX source ──
    // Process display math FIRST (outermost), then inline — prevents duplication
    clone.querySelectorAll(".katex-display").forEach((el) => {
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
      const tex = annotation?.textContent?.trim() ||
                  el.getAttribute("aria-label") || "";
      if (tex) {
        // Normalize display math: collapse internal whitespace to single spaces
        el.textContent = "\n$$\n" + tex.replace(/\s+/g, " ") + "\n$$\n";
      }
    });

    // Inline math: .katex elements still in DOM (not destroyed by display processing)
    clone.querySelectorAll(".katex").forEach((el) => {
      if (!clone.contains(el)) return;
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
      const tex = annotation?.textContent?.trim() ||
                  el.getAttribute("aria-label") || "";
      if (tex) {
        // Inline math: collapse ALL whitespace to single space (LaTeX ignores whitespace in math)
        el.textContent = "$" + tex.replace(/\s+/g, " ") + "$";
      }
    });

    // Clean up remaining MathML that would produce garbage text
    clone.querySelectorAll("math, .katex-mathml, [class*='katex-mathml']").forEach((el) => {
      if (clone.contains(el)) el.remove();
    });

    // Also handle MathJax or other renderers
    clone.querySelectorAll("[data-math-style], .MathJax, .MathJax_Display").forEach((mathEl) => {
      const src = mathEl.getAttribute("data-math-src") || mathEl.getAttribute("aria-label") || "";
      if (src) {
        const isDisplay = mathEl.getAttribute("data-math-style") === "display" ||
                          mathEl.classList.contains("MathJax_Display");
        const cleanSrc = isDisplay ? src : src.replace(/\s*\n\s*/g, " ");
        mathEl.textContent = isDisplay ? "\n$$\n" + cleanSrc + "\n$$\n" : "$" + cleanSrc + "$";
      }
    });

    // ── Step 3: Tables ──
    clone.querySelectorAll("table").forEach((table) => {
      let md = "\n";
      const rows = table.querySelectorAll("tr");
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll("th, td");
        const cellTexts = Array.from(cells).map((c) => c.textContent.trim());
        md += "| " + cellTexts.join(" | ") + " |\n";
        if (rowIndex === 0) {
          md += "| " + cellTexts.map(() => "---").join(" | ") + " |\n";
        }
      });
      table.textContent = md;
    });

    // ── Step 4: Code blocks ──
    const knownLangs = /^(mermaid|rust|python|javascript|typescript|js|ts|go|golang|java|c\+\+|cpp|c#|csharp|c|ruby|swift|kotlin|bash|sh|shell|zsh|sql|html|css|scss|json|yaml|yml|xml|toml|dockerfile|makefile|r|php|perl|scala|haskell|lua|dart|graphql|proto|protobuf|text|plaintext|markdown|md|diff|assembly|asm|powershell|objective-c|elixir|erlang|clojure|groovy|matlab|latex|tex|vim|ini|nginx|apache|csv|tsx|jsx)$/i;
    clone.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code");
      const target = code || pre;
      // Replace <br> with \n — some sites use <br> for line breaks in code
      target.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      let text = target.textContent;
      let lang = "";
      // Try class-based detection
      const langClass = (code || pre).className.match(/language-(\w+)|lang-(\w+)/);
      if (langClass) lang = langClass[1] || langClass[2];
      // Check pre's lang attribute
      if (!lang && pre.getAttribute("lang")) lang = pre.getAttribute("lang");
      // ChatGPT/Claude: check previous sibling header for language name
      if (!lang) {
        const header = pre.previousElementSibling;
        if (header && header.textContent.trim().length < 30) {
          const headerText = header.textContent.trim().toLowerCase();
          if (knownLangs.test(headerText)) {
            lang = headerText;
            header.remove();
          }
        }
      }
      // ChatGPT: language name prepended to code without separator
      // e.g., "Mermaidflowchart LR", "Bashemcc add.c", "JavaScriptconst wasm"
      if (!lang) {
        const textLower = text.toLowerCase();
        // Try longest names first to avoid partial matches (e.g., "js" matching before "json")
        const langPrefixes = ["objective-c","javascript","typescript","powershell","dockerfile","protobuf","plaintext","assembly","markdown","graphql","makefile","mermaid","csharp","python","kotlin","haskell","elixir","erlang","clojure","groovy","matlab","golang","apache","latex","swift","scala","shell","nginx","ruby","rust","java","bash","html","scss","css","json","yaml","toml","diff","dart","perl","php","lua","vim","ini","csv","tsx","jsx","sql","cpp","asm","yml","zsh","tex","md","go","js","ts","sh"];
        for (const lp of langPrefixes) {
          if (textLower.startsWith(lp) && text.length > lp.length) {
            lang = lp;
            text = text.slice(lp.length);
            break;
          }
        }
        // Single-char languages (c, r) — only match if first line is just the letter
        if (!lang) {
          const firstLine = text.split("\n")[0].trim().toLowerCase();
          if ((firstLine === "c" || firstLine === "r") && text.split("\n").length > 1) {
            lang = firstLine;
            text = text.split("\n").slice(1).join("\n");
          }
        }
      }
      // Skip empty code blocks (e.g., ChatGPT rendered mermaid with no source in DOM)
      if (!text.trim()) {
        pre.textContent = "";
        return;
      }
      pre.textContent = "\n```" + lang + "\n" + text.trim() + "\n```\n";
    });

    // ── Step 5: Inline code ──
    clone.querySelectorAll("code").forEach((code) => {
      if (code.closest("pre")) return;
      code.textContent = "`" + code.textContent + "`";
    });

    // ── Step 6: Images ──
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "image";
      if (src) {
        const placeholder = document.createTextNode("![" + alt + "](" + src + ")");
        img.replaceWith(placeholder);
      }
    });

    // ── Step 7: Links ──
    clone.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href) {
        const before = document.createTextNode("[");
        const after = document.createTextNode("](" + href + ")");
        a.insertBefore(before, a.firstChild);
        a.appendChild(after);
        while (a.firstChild) {
          a.parentNode.insertBefore(a.firstChild, a);
        }
        a.remove();
      }
    });

    // ── Step 8: Bold ──
    clone.querySelectorAll("strong, b").forEach((el) => {
      const before = document.createTextNode("**");
      const after = document.createTextNode("**");
      el.insertBefore(before, el.firstChild);
      el.appendChild(after);
      while (el.firstChild) {
        el.parentNode.insertBefore(el.firstChild, el);
      }
      el.remove();
    });

    // ── Step 9: Italic ──
    clone.querySelectorAll("em, i").forEach((el) => {
      const before = document.createTextNode("*");
      const after = document.createTextNode("*");
      el.insertBefore(before, el.firstChild);
      el.appendChild(after);
      while (el.firstChild) {
        el.parentNode.insertBefore(el.firstChild, el);
      }
      el.remove();
    });

    // ── Step 10: Lists ──
    // Collapse internal newlines from DOM whitespace text nodes to keep list items single-line
    clone.querySelectorAll("ol").forEach((ol) => {
      const items = ol.querySelectorAll(":scope > li");
      items.forEach((li, i) => {
        li.textContent = (i + 1) + ". " + li.textContent.replace(/\n\s*/g, " ").trim();
      });
    });
    clone.querySelectorAll("ul").forEach((ul) => {
      const items = ul.querySelectorAll(":scope > li");
      items.forEach((li) => {
        li.textContent = "- " + li.textContent.replace(/\n\s*/g, " ").trim();
      });
    });

    // ── Step 11: Headings (ensure newlines around headings) ──
    clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      const level = parseInt(h.tagName[1]);
      h.textContent = "\n\n" + "#".repeat(level) + " " + h.textContent.trim() + "\n\n";
    });

    // ── Step 12: Blockquotes ──
    clone.querySelectorAll("blockquote").forEach((bq) => {
      const lines = bq.textContent.trim().split("\n");
      bq.textContent = lines.map((l) => "> " + l).join("\n");
    });

    // ── Step 13: Horizontal rules ──
    clone.querySelectorAll("hr").forEach((hr) => {
      hr.textContent = "\n---\n";
    });

    // Extract text with CSS-independent newlines for block elements
    const blockTags = new Set(["P", "DIV", "UL", "OL", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "PRE", "TABLE", "TR", "SECTION", "ARTICLE"]);
    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (node.tagName === "BR") return "\n";
      const isBlock = blockTags.has(node.tagName);
      let result = isBlock ? "\n" : "";
      for (const child of node.childNodes) result += extractText(child);
      if (isBlock) result += "\n";
      return result;
    }

    let text = extractText(clone);

    // Remove Claude UI artifacts that slip through
    text = text.replace(/V?visualize\s*V?visualize\s*/gi, "");
    text = text.replace(/show_widget\s*/gi, "");
    text = text.replace(/Reading\s+\w+\s+design\s+skill\s*/gi, "");

    // Fix inline math spanning multiple lines: $...$ must be single-line
    text = text.replace(/\$([^$]+?)\$/g, (match, inner) => {
      if (inner.includes("\n")) {
        return "$" + inner.replace(/\s*\n\s*/g, " ").trim() + "$";
      }
      return match;
    });

    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
  }

  // ─── Conversation Extraction ───

  function extractChatGPT() {
    const messages = [];

    // Strategy 1: data-message-author-role (current ChatGPT)
    const msgElements = document.querySelectorAll("[data-message-author-role]");
    if (msgElements.length > 0) {
      msgElements.forEach((el) => {
        const role = el.getAttribute("data-message-author-role");
        if (role === "user" || role === "assistant") {
          const contentEl = el.querySelector(".markdown, .whitespace-pre-wrap, [data-message-id]") || el;
          const text = htmlToMarkdown(contentEl);
          if (text.length > 2) messages.push({ role, content: text });
        }
      });
      if (messages.length > 0) return messages;
    }

    // Strategy 2: article elements with author markers
    const articles = document.querySelectorAll("article[data-testid^='conversation-turn']");
    if (articles.length > 0) {
      articles.forEach((article) => {
        const userMarker = article.querySelector("[data-message-author-role='user']");
        const assistantMarker = article.querySelector("[data-message-author-role='assistant']");
        const role = userMarker ? "user" : assistantMarker ? "assistant" : null;
        if (!role) return;
        const contentEl = article.querySelector(".markdown, .whitespace-pre-wrap") || article;
        const text = htmlToMarkdown(contentEl);
        if (text.length > 2) messages.push({ role, content: text });
      });
      if (messages.length > 0) return messages;
    }

    // Strategy 3: legacy div.group with conversation-turn class
    const turns = document.querySelectorAll("div[class*='conversation-turn'], div.group\\/conversation-turn");
    turns.forEach((turn, i) => {
      const text = htmlToMarkdown(turn);
      if (text.length > 2) {
        // Heuristic: alternating user/assistant
        messages.push({ role: i % 2 === 0 ? "user" : "assistant", content: text });
      }
    });

    return messages;
  }

  function extractClaude() {
    const messages = [];

    // Claude DOM structure changes frequently. Try multiple selector strategies.
    // Each strategy returns {userEls, assistantEls} or null.
    const strategies = [
      // Strategy 1: 2025 DOM (data-testid + font-claude-response)
      () => {
        const userEls = document.querySelectorAll("[data-testid='user-message']");
        const assistantEls = document.querySelectorAll(".font-claude-response");
        return userEls.length || assistantEls.length ? { userEls, assistantEls } : null;
      },
      // Strategy 2: font-user-message + font-claude-message
      () => {
        const userEls = document.querySelectorAll(".font-user-message");
        const assistantEls = document.querySelectorAll(".font-claude-message, .font-claude-response");
        return userEls.length || assistantEls.length ? { userEls, assistantEls } : null;
      },
      // Strategy 3: data-test-render-count turns
      () => {
        const userEls = document.querySelectorAll("[data-test-render-count] [data-testid*='user'], .user-turn");
        const assistantEls = document.querySelectorAll("[data-test-render-count] .standard-markdown, .assistant-turn");
        return userEls.length || assistantEls.length ? { userEls, assistantEls } : null;
      },
      // Strategy 4: structural fallback — alternating divs in main scroll container
      () => {
        const main = document.querySelector("main") || document.querySelector("[role='main']");
        if (!main) return null;
        const turns = main.querySelectorAll("div.group, div[class*='turn'], article");
        if (turns.length === 0) return null;
        // Heuristic: user turns tend to be shorter and contain no code blocks
        const userEls = [];
        const assistantEls = [];
        turns.forEach((t, i) => {
          const hasCode = t.querySelector("pre, code");
          // Alternate: even = user, odd = assistant (rough heuristic)
          if (i % 2 === 0 && !hasCode) userEls.push(t);
          else assistantEls.push(t);
        });
        return userEls.length || assistantEls.length ? { userEls, assistantEls } : null;
      },
    ];

    let result = null;
    for (const strategy of strategies) {
      try {
        result = strategy();
        if (result) break;
      } catch { /* try next */ }
    }

    if (!result) return messages;
    const { userEls, assistantEls } = result;

    // Collect all messages with their DOM position for ordering
    const allMsgs = [];

    userEls.forEach((el) => {
      const text = htmlToMarkdown(el);
      if (text.length > 2) {
        allMsgs.push({ role: "user", content: text, el });
      }
    });

    assistantEls.forEach((el) => {
      // Use el directly — Step 0 in htmlToMarkdown removes UI chrome.
      // This preserves captured diagram images that are outside .markdown.
      const text = htmlToMarkdown(el);
      if (text.length > 2) {
        allMsgs.push({ role: "assistant", content: text, el });
      }
    });

    // Sort by DOM order
    allMsgs.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    // Deduplicate (some strategies may double-count nested elements)
    const seen = new Set();
    allMsgs.forEach((m) => {
      const key = m.role + ":" + m.content.slice(0, 100);
      if (seen.has(key)) return;
      seen.add(key);
      messages.push({ role: m.role, content: m.content });
    });

    return messages;
  }

  function extractGemini() {
    const messages = [];

    // Gemini uses various selectors
    // Try message containers with data-message-id
    const msgContainers = document.querySelectorAll(
      "[data-message-id], .message-content, .conversation-message, model-response, user-query"
    );

    if (msgContainers.length > 0) {
      msgContainers.forEach((container) => {
        const tagName = container.tagName?.toLowerCase();
        const isUser = tagName === "user-query" ||
                       container.classList.contains("user-message") ||
                       container.querySelector(".query-text, .user-text") !== null ||
                       container.getAttribute("data-message-author") === "user";

        // For model responses, look for the formatted content
        const contentEl = container.querySelector(
          ".markdown-main-panel, .response-content, .model-response-text, .message-text"
        ) || container;

        const text = htmlToMarkdown(contentEl);
        if (text.length > 2) {
          messages.push({
            role: isUser ? "user" : "assistant",
            content: text,
          });
        }
      });
      return messages;
    }

    // Fallback: try to find response containers
    const responses = document.querySelectorAll(
      ".response-container, .model-response, [class*='response']"
    );
    const queries = document.querySelectorAll(
      ".query-container, .user-query, [class*='query']"
    );

    // Interleave if counts match
    const maxLen = Math.max(responses.length, queries.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < queries.length) {
        const text = htmlToMarkdown(queries[i]);
        if (text) messages.push({ role: "user", content: text });
      }
      if (i < responses.length) {
        const text = htmlToMarkdown(responses[i]);
        if (text) messages.push({ role: "assistant", content: text });
      }
    }

    return messages;
  }

  /**
   * Pre-process Claude artifact iframes: fetch SVG content via background
   * and replace iframes with inline SVG data URL images in the DOM.
   * Must be called BEFORE extractConversation/htmlToMarkdown.
   */
  /**
   * Pre-process artifact iframes: screenshot visible iframes and replace
   * with inline images. Uses chrome.tabs.captureVisibleTab + canvas crop.
   */
  async function preProcessArtifactIframes() {
    const iframes = document.querySelectorAll(".font-claude-response iframe");
    if (iframes.length === 0) return;

    // Diagrams are captured and uploaded regardless of login status
    // (anonymous uploads are rate-limited server-side)

    // Collect all artifact iframes
    const targets = [];
    for (const iframe of iframes) {
      const src = iframe.getAttribute("src") || "";
      if (!src.includes("claudemcpcontent.com") && !src.includes("artifact")) continue;
      if (iframe.getBoundingClientRect().width > 50) {
        targets.push(iframe);
      }
    }

    if (targets.length === 0) return;

    const dpr = window.devicePixelRatio || 1;

    for (let ti = 0; ti < targets.length; ti++) {
      const iframe = targets[ti];
      try {
        // Scroll iframe into view
        iframe.scrollIntoView({ behavior: "instant", block: "center" });
        // Wait for scroll + render
        await new Promise((r) => setTimeout(r, 300));

        const rect = iframe.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) continue;

        // Take screenshot
        const screenshotDataUrl = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "capture-tab" }, (r) => resolve(r?.dataUrl || null));
        });
        if (!screenshotDataUrl) continue;

        const screenshotImg = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = screenshotDataUrl;
        });
        if (!screenshotImg) continue;

        // Crop iframe area
        const canvas = document.createElement("canvas");
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          screenshotImg,
          rect.left * dpr, rect.top * dpr,
          rect.width * dpr, rect.height * dpr,
          0, 0,
          rect.width * dpr, rect.height * dpr
        );
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.7);

        // Upload
        const uploadUrl = await uploadImageToMdfy(croppedDataUrl);
        if (uploadUrl) {
          console.log("[mdfy] diagram uploaded:", uploadUrl);
          const img = document.createElement("img");
          img.src = uploadUrl;
          img.alt = "diagram";
          img.style.maxWidth = "100%";
          iframe.replaceWith(img);
        }
      } catch (err) {
        console.error("[mdfy] diagram capture failed:", err);
      }
    }
  }

  function extractConversation() {
    switch (platform) {
      case "chatgpt": return extractChatGPT();
      case "claude": return extractClaude();
      case "gemini": return extractGemini();
      default: return [];
    }
  }

  function extractSingleMessage(messageEl) {
    return htmlToMarkdown(messageEl);
  }

  // ─── Format as Markdown ───

  function platformName() {
    switch (platform) {
      case "chatgpt": return "ChatGPT";
      case "claude": return "Claude";
      case "gemini": return "Gemini";
      default: return "AI";
    }
  }

  function formatConversation(messages) {
    if (messages.length === 0) return "";

    // Try to get conversation title
    let title = "";
    if (platform === "chatgpt") {
      const titleEl = document.querySelector("h1, [class*='title'], title");
      title = titleEl?.textContent?.trim() || "";
    } else if (platform === "claude") {
      const titleEl = document.querySelector("[data-testid='chat-title'], h1, title");
      title = titleEl?.textContent?.trim() || "";
    } else if (platform === "gemini") {
      title = document.title?.replace(/ - Google.*$/, "").trim() || "";
    }

    // Clean up title
    if (title && (title.includes("ChatGPT") || title.includes("Claude") || title.includes("Gemini"))) {
      // Use it only if it looks like a real conversation title
      if (title.length > 50) title = "";
    }

    let md = "";
    if (title) {
      md += "# " + title + "\n\n";
    }
    md += "> Captured from " + platformName() + " on " + new Date().toLocaleDateString() + "\n\n---\n\n";

    messages.forEach((msg) => {
      const roleLabel = msg.role === "user" ? "User" : platformName();
      md += "## " + roleLabel + "\n\n";
      md += msg.content + "\n\n---\n\n";
    });

    // Remove trailing separator
    md = md.replace(/\n---\n\n$/, "\n");

    return md;
  }

  // ─── Image Upload ───

  async function uploadImageToMdfy(imageUrl) {
    try {
      const userId = await getUserId();

      // Upload via background service worker (bypasses CORS)
      // Works with or without userId (anonymous uploads are rate-limited server-side)
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: "upload-image", dataUrl: imageUrl, userId: userId || undefined },
          (r) => resolve(r || { error: "no response" })
        );
      });

      if (response.url) return response.url;
      console.warn("[mdfy] Image upload failed:", response.error);
      return null;
    } catch (err) {
      console.warn("[mdfy] Image upload failed:", err);
      return null;
    }
  }

  async function getUserId() {
    if (!chrome.runtime?.id) return null; // extension context invalidated
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: "get-user-id" }, (response) => {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(response?.userId || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  async function processMarkdownImages(markdown) {
    // Find all image references: ![alt](url)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = [...markdown.matchAll(imgRegex)];

    if (matches.length === 0) return markdown;

    // If logged in, upload images to mdfy.cc permanent storage
    const userId = await getUserId();
    if (!userId) return markdown; // Keep original URLs as-is

    // Filter to uploadable images (include data: URLs from captured diagrams)
    const uploadable = matches.filter((match) => {
      const url = match[2];
      if (url.includes("supabase") || url.includes("mdfy.cc")) return false;
      if (url.startsWith("data:")) return true; // captured diagram screenshots
      if (!url.startsWith("http")) return false;
      return true;
    });

    if (uploadable.length === 0) return markdown;

    // Upload all images in parallel
    const uploadPromises = uploadable.map(async (match) => {
      const originalUrl = match[2];
      try {
        const permanentUrl = await uploadImageToMdfy(originalUrl);
        return { originalUrl, permanentUrl };
      } catch (err) {
        console.warn("[mdfy] Failed to upload image:", originalUrl, err);
        return { originalUrl, permanentUrl: null };
      }
    });

    const results = await Promise.all(uploadPromises);

    let result = markdown;
    for (const { originalUrl, permanentUrl } of results) {
      if (permanentUrl) {
        result = result.replace(originalUrl, permanentUrl);
      }
    }

    return result;
  }

  // ─── Send to mdfy.cc ───

  async function sendToMdfy(markdown) {
    if (!markdown || markdown.trim().length === 0) {
      throw new Error("No content found");
    }

    // Upload images to permanent storage before sending
    markdown = await processMarkdownImages(markdown);

    // Try authenticated sharing first (creates a permanent short URL)
    const userId = await getUserId();
    if (userId) {
      try {
        const titleMatch = markdown.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : "Captured from " + platformName();

        const res = await proxyFetch(MDFY_URL + "/api/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown, userId, title, editMode: "account" }),
        });

        if (res.ok) {
          const { id } = JSON.parse(res.body);
          window.open(MDFY_URL + "/?doc=" + id, "mdfy_" + Date.now());
          return;
        }
      } catch (err) {
        console.warn("[mdfy] Authenticated share failed, falling back to hash URL:", err);
      }
    }

    // Fallback: hash-based URL (no account needed)
    const compressed = await compressToBase64Url(markdown);
    const url = MDFY_URL + "/#md=" + compressed;

    if (url.length <= MAX_URL_BYTES) {
      window.open(url, "mdfy_" + Date.now());
    } else {
      try {
        await navigator.clipboard.writeText(markdown);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = markdown;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      window.open(MDFY_URL, "mdfy_" + Date.now());
    }
  }

  // ─── Floating Button ───

  function createFloatingButton() {
    const container = document.createElement("div");
    container.id = "mdfy-float-container";

    const btn = document.createElement("button");
    btn.id = "mdfy-float-btn";
    btn.innerHTML = '<span class="mdfy-btn-logo"><span class="mdfy-logo-md">md</span><span class="mdfy-logo-fy">fy</span></span><span class="mdfy-btn-label">All</span>';
    btn.title = "Capture entire conversation and publish on mdfy.cc";

    const toggle = document.createElement("button");
    toggle.id = "mdfy-float-toggle";
    toggle.innerHTML = "&#9662;";
    toggle.title = "Choose range";

    const menu = document.createElement("div");
    menu.id = "mdfy-float-menu";
    menu.innerHTML = [
      '<div class="mdfy-menu-item" data-range="0"><span class="mdfy-menu-accent">All</span> messages</div>',
      '<div class="mdfy-menu-item" data-range="3">Last <span class="mdfy-menu-accent">3</span> exchanges</div>',
      '<div class="mdfy-menu-item" data-range="5">Last <span class="mdfy-menu-accent">5</span> exchanges</div>',
      '<div class="mdfy-menu-item" data-range="10">Last <span class="mdfy-menu-accent">10</span> exchanges</div>',
    ].join("");

    container.appendChild(btn);
    container.appendChild(toggle);
    container.appendChild(menu);
    document.body.appendChild(container);

    const setFloatStatus = (status, state) => {
      const logo = '<span class="mdfy-btn-logo"><span class="mdfy-logo-md">md</span><span class="mdfy-logo-fy">fy</span></span>';
      const stateClass = state === "done" ? " mdfy-btn-status-done" : state === "error" ? " mdfy-btn-status-error" : "";
      btn.innerHTML = logo + '<span class="mdfy-btn-label' + stateClass + '">' + status + '</span>';
    };
    const resetFloat = () => {
      btn.innerHTML = '<span class="mdfy-btn-logo"><span class="mdfy-logo-md">md</span><span class="mdfy-logo-fy">fy</span></span><span class="mdfy-btn-label">All</span>';
    };

    async function captureAndSend(lastN) {
      menu.classList.remove("mdfy-menu-visible");
      container.classList.remove("mdfy-done", "mdfy-error");
      container.classList.add("mdfy-loading");
      setFloatStatus("Capturing...");
      try {
        await preProcessArtifactIframes();
        setFloatStatus("Converting...");
        let messages = extractConversation();
        if (lastN > 0) messages = messages.slice(-(lastN * 2));
        const markdown = formatConversation(messages);
        setFloatStatus("Publishing...");
        await sendToMdfy(markdown);
        container.classList.remove("mdfy-loading");
        container.classList.add("mdfy-done");
        setFloatStatus("Published ✓", "done");
        setTimeout(() => { container.classList.remove("mdfy-done"); resetFloat(); }, 3000);
      } catch (err) {
        console.error("[mdfy] capture failed:", err);
        container.classList.remove("mdfy-loading");
        container.classList.add("mdfy-error");
        setFloatStatus("Failed", "error");
        setTimeout(() => { container.classList.remove("mdfy-error"); resetFloat(); }, 3000);
      }
    }

    btn.addEventListener("click", () => captureAndSend(0));

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("mdfy-menu-visible");
    });

    menu.querySelectorAll(".mdfy-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        captureAndSend(parseInt(item.dataset.range));
      });
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        menu.classList.remove("mdfy-menu-visible");
      }
    });
  }

  // ─── Per-Message Mini Buttons ───

  function getAssistantMessageSelector() {
    switch (platform) {
      case "chatgpt":
        return "[data-message-author-role='assistant']";
      case "claude":
        return ".font-claude-response";
      case "gemini":
        return "model-response:not(user-query), .model-response:not(.user-query):not(.user-message), [data-message-author='model']";
      default:
        return null;
    }
  }

  function getUserMessageSelector() {
    switch (platform) {
      case "chatgpt":
        return "[data-message-author-role='user']";
      case "claude":
        return "[data-testid='user-message'], .font-user-message";
      case "gemini":
        return "user-query, .user-query, [data-message-author='user']";
      default:
        return null;
    }
  }

  function findQAPair(messageEl, role) {
    const userSelector = getUserMessageSelector();
    const assistantSelector = getAssistantMessageSelector();
    if (!userSelector || !assistantSelector) return { userEl: null, assistantEl: null };

    const allUsers = [...document.querySelectorAll(userSelector)];
    const allAssistants = [...document.querySelectorAll(assistantSelector)];

    if (role === "assistant") {
      let nearestUser = null;
      for (const userEl of allUsers) {
        const pos = userEl.compareDocumentPosition(messageEl);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
          nearestUser = userEl;
        }
      }
      return { userEl: nearestUser, assistantEl: messageEl };
    } else {
      let nearestAssistant = null;
      for (const aEl of allAssistants) {
        const pos = messageEl.compareDocumentPosition(aEl);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
          nearestAssistant = aEl;
          break;
        }
      }
      return { userEl: messageEl, assistantEl: nearestAssistant };
    }
  }

  function formatQAPair(userEl, assistantEl) {
    const pName = platformName();
    const date = new Date().toLocaleDateString();
    const userText = userEl ? htmlToMarkdown(userEl) : "";
    const assistantText = assistantEl ? htmlToMarkdown(assistantEl) : "";

    const firstLine = userText.split("\n")[0].replace(/^#+\s*/, "").trim();
    const title = firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;

    let md = "";
    if (title) md += "# " + title + "\n\n";
    md += "> Captured from " + pName + " on " + date + "\n\n---\n\n";
    if (userText) md += "## User\n\n" + userText + "\n\n---\n\n";
    if (assistantText) md += "## " + pName + "\n\n" + assistantText + "\n";
    return md;
  }

  function addMiniButtons() {
    const assistantSelector = getAssistantMessageSelector();
    const userSelector = getUserMessageSelector();

    function attachMiniButton(msg, role) {
      if (msg.querySelector(".mdfy-mini-btn")) return;

      const computedPos = window.getComputedStyle(msg).position;
      if (computedPos === "static") msg.style.position = "relative";

      const miniBtn = document.createElement("button");
      miniBtn.className = "mdfy-mini-btn";
      miniBtn.innerHTML = '<span class="mdfy-mini-logo"><span class="mdfy-mini-md">md</span><span class="mdfy-mini-fy">fy</span></span><span class="mdfy-mini-label">this</span>';
      miniBtn.title = "Send this Q&A to mdfy.cc";

      const resetMini = () => {
        miniBtn.innerHTML = '<span class="mdfy-mini-logo"><span class="mdfy-mini-md">md</span><span class="mdfy-mini-fy">fy</span></span><span class="mdfy-mini-label">this</span>';
      };
      const setMiniStatus = (status, state) => {
        const logo = '<span class="mdfy-mini-logo"><span class="mdfy-mini-md">md</span><span class="mdfy-mini-fy">fy</span></span>';
        const stateClass = state === "done" ? " mdfy-mini-status-done" : state === "error" ? " mdfy-mini-status-error" : "";
        miniBtn.innerHTML = logo + '<span class="mdfy-mini-status' + stateClass + '">' + status + '</span>';
      };

      miniBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        miniBtn.classList.remove("mdfy-done", "mdfy-error");
        miniBtn.classList.add("mdfy-loading");
        setMiniStatus("Capturing...");
        try {
          await preProcessArtifactIframes();
          setMiniStatus("Converting...");
          const { userEl, assistantEl } = findQAPair(msg, role);
          const markdown = formatQAPair(userEl, assistantEl);
          setMiniStatus("Publishing...");
          await sendToMdfy(markdown);
          miniBtn.classList.remove("mdfy-loading");
          miniBtn.classList.add("mdfy-done");
          setMiniStatus("Published ✓", "done");
          setTimeout(() => { miniBtn.classList.remove("mdfy-done"); resetMini(); }, 3000);
        } catch (err) {
          console.error("[mdfy] capture failed:", err);
          miniBtn.classList.remove("mdfy-loading");
          miniBtn.classList.add("mdfy-error");
          setMiniStatus("Failed", "error");
          setTimeout(() => { miniBtn.classList.remove("mdfy-error"); resetMini(); }, 3000);
        }
      });

      msg.insertBefore(miniBtn, msg.firstChild);
    }

    if (assistantSelector) {
      document.querySelectorAll(assistantSelector).forEach((msg) => attachMiniButton(msg, "assistant"));
    }
  }

  // ─── Listen for messages from popup/background ───

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture-conversation") {
      const lastN = request.lastN || 0;
      preProcessArtifactIframes().then(() => {
        let messages = extractConversation();
        if (lastN > 0) messages = messages.slice(-(lastN * 2));
        const markdown = formatConversation(messages);
        sendResponse({ markdown, platform });
      });
      return true;
    }

    if (request.action === "get-platform") {
      sendResponse({ platform });
      return true;
    }

    if (request.action === "capture-selection") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        const markdown = htmlToMarkdown(container);
        sendResponse({ markdown });
      } else {
        sendResponse({ markdown: null });
      }
      return true;
    }

    if (request.action === "capture-page") {
      // On AI pages: extract conversation
      // On other pages: return null (background.js will handle it)
      if (platform) {
        const messages = extractConversation();
        const markdown = formatConversation(messages);
        sendResponse({ markdown });
      } else {
        sendResponse({ markdown: null });
      }
      return true;
    }
  });

  // ─── Platform Layout ───

  const layoutConfig = {
    chatgpt: { headerH: 56, inputH: 100 },
    claude: { headerH: 8, inputH: 150 },
    gemini: { headerH: 8, inputH: 160 },
  };
  const layout = layoutConfig[platform] || { headerH: 48, inputH: 100 };
  document.documentElement.style.setProperty("--mdfy-header-h", layout.headerH + "px");
  document.documentElement.style.setProperty("--mdfy-input-h", layout.inputH + "px");

  // Align mdfy All to the right edge of the message content area
  function measureContentRight() {
    const msgSelectors = {
      chatgpt: "[data-message-author-role='assistant']",
      claude: ".font-claude-response",
      gemini: "model-response, .model-response",
    };
    const msg = document.querySelector(msgSelectors[platform] || "main");
    if (msg) {
      const right = window.innerWidth - msg.getBoundingClientRect().right;
      document.documentElement.style.setProperty("--mdfy-content-right", Math.max(8, right) + "px");
    }
  }
  measureContentRight();
  window.addEventListener("resize", measureContentRight);

  // ─── Initialize ───

  createFloatingButton();
  addMiniButtons();

  // Re-run mini button injection when new messages appear (MutationObserver)
  const observer = new MutationObserver(() => {
    addMiniButtons();
    measureContentRight();
  });

  // Observe the main content area for changes
  const observeTarget = document.querySelector("main, [role='main'], #__next, #app") || document.body;
  observer.observe(observeTarget, {
    childList: true,
    subtree: true,
  });
})();
