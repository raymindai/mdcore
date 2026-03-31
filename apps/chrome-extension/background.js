/**
 * mdfy.cc Chrome Extension — Background Service Worker
 *
 * Handles context menu and message passing.
 */

const MDFY_URL = "https://mdfy.cc";
const MAX_URL_BYTES = 8000;

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

// ─── Context Menu ───

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "mdfy-send-selection",
    title: "Send to mdfy.cc",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "mdfy-send-selection") return;

  const text = info.selectionText;
  if (!text) return;

  const compressed = await compressToBase64Url(text);
  const url = MDFY_URL + "/#md=" + compressed;

  if (url.length <= MAX_URL_BYTES) {
    chrome.tabs.create({ url });
  } else {
    // For large selections, try to get richer content from the content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capture-selection",
      });
      if (response && response.markdown) {
        const compressedMd = await compressToBase64Url(response.markdown);
        const mdUrl = MDFY_URL + "/#md=" + compressedMd;
        if (mdUrl.length <= MAX_URL_BYTES) {
          chrome.tabs.create({ url: mdUrl });
          return;
        }
      }
    } catch {
      // Content script not available — just use plain text
    }

    // Fallback: open mdfy.cc without content
    // The user will need to paste manually
    chrome.tabs.create({ url: MDFY_URL });
  }
});

// ─── Message Handling ───

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open-mdfy") {
    const url = request.url || MDFY_URL;
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
    return true;
  }
});
