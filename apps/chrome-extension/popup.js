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

  const compressed = await compressToBase64Url(markdown);
  const url = MDFY_URL + "/#md=" + compressed;

  if (url.length <= MAX_URL_BYTES) {
    chrome.tabs.create({ url });
    setStatus("Opened in mdfy.cc", "success");
  } else {
    // Copy to clipboard and open
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Popup may not have clipboard access — try via background
      // Fallback: just open mdfy.cc
    }
    chrome.tabs.create({ url: MDFY_URL });
    setStatus("Content copied — paste into mdfy.cc", "success");
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

    if (platform) {
      platformDot.classList.remove("inactive");
      platformDot.classList.add("active");
      platformNameEl.classList.add("active");
      platformNameEl.textContent = PLATFORM_NAMES[platform] + " detected";
      btnCapture.disabled = false;
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

function showNotOnAiPage() {
  platformDot.classList.remove("active");
  platformDot.classList.add("inactive");
  platformNameEl.classList.remove("active");
  platformNameEl.textContent = "Not on an AI chat page";
  btnCapture.disabled = true;
}

// ─── Actions ───

btnCapture.addEventListener("click", async () => {
  setStatus("Capturing...");
  btnCapture.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "capture-conversation",
    });

    if (response && response.markdown) {
      await openInMdfy(response.markdown);
    } else {
      setStatus("No conversation found", "error");
    }
  } catch (err) {
    // Content script might not be loaded — try injecting
    setStatus("Retrying...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      // Wait briefly for script to initialize
      await new Promise((r) => setTimeout(r, 200));
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capture-conversation",
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

    // Try sending to content script first
    let markdown = null;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capture-selection",
      });
      markdown = response?.markdown;
    } catch {
      // Content script not available — use scripting API
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

// ─── Init ───

detectPlatform();
