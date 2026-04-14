/**
 * mdfy.cc Chrome Extension — Popup Script
 */

const MDFY_URL = "https://mdfy.cc";
const MAX_URL_BYTES = 8000;

const statusEl = document.getElementById("status");
const platformDot = document.getElementById("platform-dot");
const platformNameEl = document.getElementById("platform-name");
const btnCapture = document.getElementById("btn-capture");
const btnSelection = document.getElementById("btn-selection");
const rangeSelector = document.getElementById("range-selector");

// Range: radio buttons instead of select
function getRangeValue() {
  const checked = document.querySelector('input[name="range"]:checked');
  return checked ? parseInt(checked.value) : 0;
}
// Compatibility shim so existing code using rangeSelect.value still works
const rangeSelect = { get value() { return String(getRangeValue()); } };

// ─── Compression (same as content.js / share.ts) ───

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
  } catch {
    return btoa(unescape(encodeURIComponent(text)));
  }
}

// ─── Proxy Fetch & Auth (via background service worker) ───

function proxyFetch(url, options = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "proxy-fetch", url, options },
      (r) => resolve(r || { ok: false, error: "no response" })
    );
  });
}

function getUserId() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "get-user-id" }, (response) => {
      resolve(response?.userId || null);
    });
  });
}

// ─── Status ───

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = "status " + type;
}

// ─── Send to mdfy.cc ───

async function openInMdfy(markdown) {
  if (!markdown || markdown.trim().length === 0) {
    setStatus("No content found", "error");
    return;
  }

  // Try authenticated sharing first
  const userId = await getUserId();
  if (userId) {
    try {
      const titleMatch = markdown.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : "Captured content";

      const res = await proxyFetch(MDFY_URL + "/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, userId, title, editMode: "account", source: "chrome" }),
      });

      if (res.ok) {
        const { id, editToken } = JSON.parse(res.body);
        const tokenParam = editToken ? "&token=" + encodeURIComponent(editToken) : "";
        chrome.tabs.create({ url: MDFY_URL + "/?doc=" + id + tokenParam });
        setStatus("Published to mdfy.cc", "success");
        return;
      }
    } catch (err) {
      console.warn("[mdfy] Authenticated share failed, falling back to hash URL:", err);
    }
  }

  // Fallback: hash-based URL
  const compressed = await compressToBase64Url(markdown);
  const url = MDFY_URL + "/#md=" + compressed;

  if (url.length <= MAX_URL_BYTES) {
    chrome.tabs.create({ url });
    setStatus("Opened in mdfy.cc", "success");
  } else {
    let copied = false;
    try {
      await navigator.clipboard.writeText(markdown);
      copied = true;
    } catch { }
    chrome.tabs.create({ url: MDFY_URL });
    if (copied) {
      setStatus("Content copied — paste into mdfy.cc", "success");
    } else {
      setStatus("Content too large for URL. Please copy manually.", "error");
    }
  }
}

// ─── Platform Detection ───

const PLATFORM_NAMES = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

async function detectPlatform() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showNotOnAiPage();
      return null;
    }

    const url = tab.url;
    let platform = null;

    if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) {
      platform = "chatgpt";
    } else if (url.includes("claude.ai")) {
      platform = "claude";
    } else if (url.includes("gemini.google.com")) {
      platform = "gemini";
    }

    // Check if on mdfy.cc
    if (url.includes("mdfy.cc")) {
      showOnMdfy();
      return null;
    }

    if (platform) {
      platformDot.classList.remove("inactive");
      platformDot.classList.add("active");
      platformNameEl.classList.add("active");
      platformNameEl.textContent = PLATFORM_NAMES[platform] + " detected";
      btnCapture.disabled = false;
      rangeSelector.style.display = "flex";
      return { tab, platform };
    } else {
      showNotOnAiPage();
      return null;
    }
  } catch {
    showNotOnAiPage();
    return null;
  }
}

function showOnMdfy() {
  if (platformDot) {
    platformDot.classList.remove("inactive");
    platformDot.classList.add("active");
    platformDot.style.background = "#fb923c";
  }
  if (platformNameEl) {
    platformNameEl.classList.add("active");
    platformNameEl.textContent = "mdfy.cc";
  }
  btnCapture.disabled = true;
  const labelEl = btnCapture.querySelector(".label");
  if (labelEl) labelEl.innerHTML = 'You\'re on mdfy.cc<span class="desc">Create and edit documents directly here</span>';
  rangeSelector.style.display = "none";
}

function showNotOnAiPage() {
  platformDot.classList.remove("active");
  platformDot.classList.add("inactive");
  platformDot.style.background = "#60a5fa";
  platformNameEl.classList.add("active");
  platformNameEl.textContent = "Any webpage";
  document.getElementById("platform-hint").textContent = "Capture this page as Markdown";
  btnCapture.disabled = false;
  const labelEl = btnCapture.querySelector(".label");
  if (labelEl) labelEl.innerHTML = 'Capture This Page<span class="desc">Page content → clean Markdown document</span>';
  btnCapture.dataset.mode = "page";
  rangeSelector.style.display = "none";
}

// ─── Actions ───

btnCapture.addEventListener("click", async () => {
  const isPageMode = btnCapture.dataset.mode === "page";
  const lastN = parseInt(rangeSelect.value) || 0;
  setStatus("Capturing...");
  btnCapture.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (isPageMode) {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const title = document.title;
          const url = window.location.href;
          const main = document.querySelector("main, article, [role='main'], .content, .post-content, .entry-content") || document.body;
          const clone = main.cloneNode(true);
          clone.querySelectorAll("nav, footer, header, aside, script, style, noscript, iframe, .sidebar, .nav, .menu, .ad, [role='navigation'], [role='banner']").forEach(el => el.remove());

          clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => { h.textContent = "\n" + "#".repeat(parseInt(h.tagName[1])) + " " + h.textContent.trim() + "\n"; });
          clone.querySelectorAll("pre").forEach(pre => { const code = pre.querySelector("code"); const text = code ? code.textContent : pre.textContent; let lang = ""; const lc = (code || pre).className.match(/language-(\w+)|lang-(\w+)/); if (lc) lang = lc[1] || lc[2]; pre.textContent = "\n```" + lang + "\n" + text.trim() + "\n```\n"; });
          clone.querySelectorAll("code").forEach(c => { if (!c.closest("pre")) c.textContent = "`" + c.textContent + "`"; });
          clone.querySelectorAll("strong, b").forEach(el => { el.textContent = "**" + el.textContent + "**"; });
          clone.querySelectorAll("em, i").forEach(el => { el.textContent = "*" + el.textContent + "*"; });
          clone.querySelectorAll("a").forEach(a => { let href = a.getAttribute("href"); const t = a.textContent; if (href && t) { try { href = new URL(href, document.baseURI).href; } catch { /* keep original */ } a.textContent = "[" + t + "](" + href + ")"; } });
          clone.querySelectorAll("ul > li").forEach(li => { li.textContent = "- " + li.textContent.trim(); });
          clone.querySelectorAll("ol > li").forEach((li, i) => { li.textContent = (i + 1) + ". " + li.textContent.trim(); });
          clone.querySelectorAll("table").forEach(table => { let m = "\n"; table.querySelectorAll("tr").forEach((row, ri) => { const cells = Array.from(row.querySelectorAll("th, td")).map(c => c.textContent.trim()); m += "| " + cells.join(" | ") + " |\n"; if (ri === 0) m += "| " + cells.map(() => "---").join(" | ") + " |\n"; }); table.textContent = m; });
          clone.querySelectorAll("blockquote").forEach(bq => { bq.textContent = bq.textContent.trim().split("\n").map(l => "> " + l).join("\n"); });

          let md = "# " + title + "\n\n> Source: " + url + "\n\n---\n\n";
          let text = (clone.innerText || clone.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
          return md + text;
        },
      });
      if (result?.result) {
        await openInMdfy(result.result);
      } else {
        setStatus("No content found", "error");
      }
    } else {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capture-conversation",
        lastN,
      });

      if (response && response.markdown) {
        await openInMdfy(response.markdown);
      } else {
        setStatus("No conversation found", "error");
      }
    }
  } catch (err) {
    setStatus("Retrying...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await new Promise((r) => setTimeout(r, 200));
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capture-conversation",
        lastN,
      });
      if (response && response.markdown) {
        await openInMdfy(response.markdown);
      } else {
        setStatus("No conversation found", "error");
      }
    } catch (retryErr) {
      setStatus("Failed: " + retryErr.message, "error");
    }
  } finally {
    btnCapture.disabled = false;
  }
});

btnSelection.addEventListener("click", async () => {
  setStatus("Getting selection...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let markdown = null;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capture-selection",
      });
      markdown = response?.markdown;
    } catch {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return null;
          return selection.toString();
        },
      });
      markdown = result?.result;
    }

    if (!markdown) {
      setStatus("No text selected", "error");
      return;
    }

    await openInMdfy(markdown);
  } catch (err) {
    setStatus("Failed: " + err.message, "error");
  }
});

// ─── Range label sync (radio buttons) ───

document.querySelectorAll('input[name="range"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const val = parseInt(radio.value);
    const labelEl = btnCapture.querySelector(".label");
    const descEl = labelEl.querySelector(".desc");
    // Remove old text, keep .desc span
    const newText = val === 0 ? "Capture Full Conversation" : "Capture Last " + val + " Exchanges";
    const newDesc = val === 0 ? "All messages → Markdown document" : "Recent " + val + " Q&A pairs → Markdown document";
    labelEl.innerHTML = newText + '<span class="desc">' + newDesc + '</span>';
  });
});

// ─── Init ───

detectPlatform();
