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
  if (document.getElementById("mdfy-float-btn")) return;

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

  // ─── HTML to Markdown Conversion (lightweight) ───

  function htmlToMarkdown(el) {
    if (!el) return "";

    // Clone to avoid mutating the page
    const clone = el.cloneNode(true);

    // ── Processing order: structural first, then innermost-to-outermost ──
    // 1. Tables (structural, must be first)
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

    // 2. Code blocks (preserve content, before inline processing)
    clone.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code");
      const text = code ? code.textContent : pre.textContent;
      // Try to detect language from class names
      let lang = "";
      const langClass = (code || pre).className.match(/language-(\w+)|lang-(\w+)/);
      if (langClass) lang = langClass[1] || langClass[2];
      // Also check the pre's lang attribute (comrak style)
      if (!lang && pre.getAttribute("lang")) lang = pre.getAttribute("lang");
      pre.textContent = "\n```" + lang + "\n" + text.trim() + "\n```\n";
    });

    // 3. Inline code
    clone.querySelectorAll("code").forEach((code) => {
      // Skip if already inside a processed pre
      if (code.closest("pre")) return;
      code.textContent = "`" + code.textContent + "`";
    });

    // 4. Images
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "image";
      if (src) {
        const placeholder = document.createTextNode("![" + alt + "](" + src + ")");
        img.replaceWith(placeholder);
      }
    });

    // 5. Links (BEFORE bold/italic to preserve nested formatting)
    clone.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href) {
        // Wrap the link's existing innerHTML so nested bold/italic is preserved
        const before = document.createTextNode("[");
        const after = document.createTextNode("](" + href + ")");
        a.insertBefore(before, a.firstChild);
        a.appendChild(after);
        // Unwrap the <a> element, keeping its children in place
        while (a.firstChild) {
          a.parentNode.insertBefore(a.firstChild, a);
        }
        a.remove();
      }
    });

    // 6. Bold (using innerHTML-aware approach to preserve child markup)
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

    // 7. Italic
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

    // 8. Lists
    clone.querySelectorAll("ol").forEach((ol) => {
      const items = ol.querySelectorAll(":scope > li");
      items.forEach((li, i) => {
        li.textContent = (i + 1) + ". " + li.textContent.trim();
      });
    });
    clone.querySelectorAll("ul").forEach((ul) => {
      const items = ul.querySelectorAll(":scope > li");
      items.forEach((li) => {
        li.textContent = "- " + li.textContent.trim();
      });
    });

    // 9. Headings
    clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      const level = parseInt(h.tagName[1]);
      h.textContent = "#".repeat(level) + " " + h.textContent.trim();
    });

    // 10. Blockquotes
    clone.querySelectorAll("blockquote").forEach((bq) => {
      const lines = bq.textContent.trim().split("\n");
      bq.textContent = lines.map((l) => "> " + l).join("\n");
    });

    // Get text content, clean up whitespace
    let text = clone.innerText || clone.textContent || "";
    // Normalize line breaks
    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
  }

  // ─── Conversation Extraction ───

  function extractChatGPT() {
    const messages = [];

    // ChatGPT uses [data-message-author-role] on message containers
    const msgElements = document.querySelectorAll("[data-message-author-role]");
    if (msgElements.length === 0) {
      // Fallback: try article elements with role markers
      const articles = document.querySelectorAll("article");
      articles.forEach((article) => {
        const isUser = article.querySelector("[data-message-author-role='user']") ||
                       article.closest("[data-message-author-role='user']");
        const role = isUser ? "user" : "assistant";
        const contentEl = article.querySelector(".markdown, .whitespace-pre-wrap") || article;
        messages.push({ role, content: htmlToMarkdown(contentEl) });
      });
      return messages;
    }

    msgElements.forEach((el) => {
      const role = el.getAttribute("data-message-author-role");
      if (role === "user" || role === "assistant") {
        // The markdown content is usually inside .markdown or the element itself
        const contentEl = el.querySelector(".markdown, .whitespace-pre-wrap") || el;
        messages.push({ role, content: htmlToMarkdown(contentEl) });
      }
    });

    return messages;
  }

  function extractClaude() {
    const messages = [];

    // Claude 2025 DOM structure:
    // User messages:     [data-testid="user-message"] with .font-user-message
    // Assistant messages: .font-claude-response containing .standard-markdown
    // Each turn is a sibling div under the scrollable conversation area

    // Find user messages
    const userEls = document.querySelectorAll("[data-testid='user-message']");
    // Find assistant messages
    const assistantEls = document.querySelectorAll(".font-claude-response");

    if (userEls.length === 0 && assistantEls.length === 0) {
      // Fallback: nothing found
      return messages;
    }

    // Collect all messages with their DOM position for ordering
    const allMsgs = [];

    userEls.forEach((el) => {
      const text = htmlToMarkdown(el);
      if (text.length > 2) {
        allMsgs.push({ role: "user", content: text, el });
      }
    });

    assistantEls.forEach((el) => {
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

    allMsgs.forEach((m) => {
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
      // Fetch the image as blob
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) return null;

      // Upload to mdfy.cc
      const formData = new FormData();
      formData.append("file", blob, "image." + (blob.type.split("/")[1] || "png"));

      // Try to get userId from cookie/storage
      const userId = await getUserId();
      if (!userId) return null; // Not logged in, can't upload

      const uploadRes = await fetch(MDFY_URL + "/api/upload", {
        method: "POST",
        headers: { "x-user-id": userId },
        body: formData,
      });

      if (!uploadRes.ok) return null;
      const { url } = await uploadRes.json();
      return url;
    } catch (err) {
      console.warn("[mdfy] Image upload failed:", err);
      return null;
    }
  }

  async function getUserId() {
    // Try to get user info from mdfy.cc cookies via background script
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: "get-user-id" }, (response) => {
          resolve(response?.userId || null);
        });
      } catch (err) {
        console.warn("[mdfy] getUserId failed:", err);
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

    // Filter to uploadable images
    const uploadable = matches.filter((match) => {
      const url = match[2];
      if (url.includes("supabase") || url.includes("mdfy.cc")) return false;
      if (url.startsWith("data:")) return false;
      if (!url.startsWith("http")) return false;
      return true;
    });

    if (uploadable.length === 0) return markdown;

    // Upload all images in parallel
    let completed = 0;
    const total = uploadable.length;
    showToast("Uploading images (0/" + total + ")...", 30000);

    const uploadPromises = uploadable.map(async (match) => {
      const originalUrl = match[2];
      try {
        const permanentUrl = await uploadImageToMdfy(originalUrl);
        completed++;
        showToast("Uploading images (" + completed + "/" + total + ")...", 30000);
        return { originalUrl, permanentUrl };
      } catch (err) {
        console.warn("[mdfy] Failed to upload image:", originalUrl, err);
        completed++;
        showToast("Uploading images (" + completed + "/" + total + ")...", 30000);
        return { originalUrl, permanentUrl: null };
      }
    });

    const results = await Promise.all(uploadPromises);

    // Replace all URLs
    let result = markdown;
    for (const { originalUrl, permanentUrl } of results) {
      if (permanentUrl) {
        result = result.replace(originalUrl, permanentUrl);
      }
    }

    showToast("Images uploaded", 2000);
    return result;
  }

  // ─── Send to mdfy.cc ───

  async function sendToMdfy(markdown) {
    if (!markdown || markdown.trim().length === 0) {
      showToast("No content found to capture");
      return;
    }

    // Upload images to permanent storage before sending
    markdown = await processMarkdownImages(markdown);

    // Try authenticated sharing first (creates a permanent short URL)
    const userId = await getUserId();
    if (userId) {
      try {
        // Extract title from first heading or first line
        const titleMatch = markdown.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : "Captured from " + platformName();

        const res = await fetch(MDFY_URL + "/api/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown, userId, title, editMode: "account" }),
        });

        if (res.ok) {
          const { id } = await res.json();
          const docUrl = MDFY_URL + "/" + id;
          showToast("Published to mdfy.cc/" + id);
          window.open(docUrl, "_blank");
          return;
        }
      } catch (err) {
        console.warn("[mdfy] Authenticated share failed, falling back to hash URL:", err);
      }
    }

    // Fallback: hash-based URL (no account needed)
    const compressed = await compressToBase64Url(markdown);
    const url = MDFY_URL + "/#md=" + compressed;

    // Check if URL is within safe length
    if (url.length <= MAX_URL_BYTES) {
      showToast(userId ? "Opened in mdfy.cc" : "Opened in mdfy.cc (sign in for permanent URL)");
      window.open(url, "_blank");
    } else {
      // Content too large for URL — copy to clipboard
      try {
        await navigator.clipboard.writeText(markdown);
        showToast("Content copied to clipboard. Opening mdfy.cc — paste it there.");
      } catch (err) {
        console.warn("[mdfy] Clipboard write failed, using fallback:", err);
        // Fallback copy
        const textarea = document.createElement("textarea");
        textarea.value = markdown;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast("Content copied to clipboard. Opening mdfy.cc — paste it there.");
      }
      window.open(MDFY_URL, "_blank");
    }
  }

  // ─── Floating Button ───

  function createFloatingButton() {
    const btn = document.createElement("button");
    btn.id = "mdfy-float-btn";
    btn.innerHTML = '<span class="mdfy-btn-logo"><span class="mdfy-logo-md">md</span><span class="mdfy-logo-fy">fy</span></span><span class="mdfy-btn-label">Capture</span>';
    btn.title = "Capture this AI conversation and publish on mdfy.cc";
    document.body.appendChild(btn);

    btn.addEventListener("click", async () => {
      btn.classList.add("mdfy-loading");
      try {
        const messages = extractConversation();
        const markdown = formatConversation(messages);
        await sendToMdfy(markdown);
      } catch (err) {
        showToast("Failed to capture: " + err.message);
      } finally {
        btn.classList.remove("mdfy-loading");
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

  function addMiniButtons() {
    const selector = getAssistantMessageSelector();
    if (!selector) return;

    const messages = document.querySelectorAll(selector);
    messages.forEach((msg) => {
      // Skip if already has a mini button
      if (msg.querySelector(".mdfy-mini-btn")) return;

      // Ensure the message container has position relative for the button
      const computedPos = window.getComputedStyle(msg).position;
      if (computedPos === "static") {
        msg.style.position = "relative";
      }

      const miniBtn = document.createElement("button");
      miniBtn.className = "mdfy-mini-btn";
      miniBtn.innerHTML = '<span class="mdfy-mini-md">md</span><span class="mdfy-mini-fy">fy</span><span class="mdfy-mini-label">this</span>';
      miniBtn.title = "Send this message to mdfy.cc";

      miniBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        miniBtn.classList.add("mdfy-loading");
        try {
          const text = extractSingleMessage(msg);
          const markdown = "> Single response from " + platformName() + "\n\n" + text;
          await sendToMdfy(markdown);
        } catch (err) {
          showToast("Failed to capture: " + err.message);
        } finally {
          miniBtn.classList.remove("mdfy-loading");
        }
      });

      msg.appendChild(miniBtn);
    });
  }

  // ─── Listen for messages from popup/background ───

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture-conversation") {
      const messages = extractConversation();
      const markdown = formatConversation(messages);
      sendResponse({ markdown, platform });
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

  // ─── Initialize ───

  createFloatingButton();
  addMiniButtons();

  // Re-run mini button injection when new messages appear (MutationObserver)
  const observer = new MutationObserver(() => {
    addMiniButtons();
  });

  // Observe the main content area for changes
  const observeTarget = document.querySelector("main, [role='main'], #__next, #app") || document.body;
  observer.observe(observeTarget, {
    childList: true,
    subtree: true,
  });
})();
