const statusEl = document.getElementById("status");

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

// Save full page
document.getElementById("save-page").addEventListener("click", async () => {
  setStatus("Extracting content...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Try to get main content, fall back to body
        const article = document.querySelector("article, main, [role='main']");
        const content = article || document.body;
        return {
          html: content.innerHTML,
          title: document.title,
          url: window.location.href,
        };
      },
    });

    const { html, title, url } = result.result;
    await saveToMdfy(html, title, url);
  } catch (err) {
    setStatus("Failed: " + err.message, "error");
  }
});

// Save selection
document.getElementById("save-selection").addEventListener("click", async () => {
  setStatus("Getting selection...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        return {
          html: container.innerHTML,
          title: document.title + " (selection)",
          url: window.location.href,
        };
      },
    });

    if (!result.result) {
      setStatus("No text selected", "error");
      return;
    }

    const { html, title, url } = result.result;
    await saveToMdfy(html, title, url);
  } catch (err) {
    setStatus("Failed: " + err.message, "error");
  }
});

async function saveToMdfy(html, title, sourceUrl) {
  setStatus("Converting to Markdown...");

  // Simple HTML to MD conversion (basic — full conversion happens on mdfy.cc)
  // We send the HTML to mdfy.cc and let it handle the conversion
  const encodedHtml = encodeURIComponent(html);
  const encodedTitle = encodeURIComponent(title || "");

  // Open mdfy.cc with the HTML content
  const mdfyUrl = `https://mdfy.cc/?html=${encodedHtml.slice(0, 10000)}&title=${encodedTitle}&source=${encodeURIComponent(sourceUrl)}`;

  // If content is too large for URL, use the clipboard approach
  if (encodedHtml.length > 10000) {
    // Copy HTML to clipboard and open mdfy.cc
    await navigator.clipboard.writeText(html);
    chrome.tabs.create({ url: "https://mdfy.cc/?from-clipboard=html" });
    setStatus("Copied! Paste in mdfy.cc", "success");
  } else {
    chrome.tabs.create({ url: mdfyUrl });
    setStatus("Opened in mdfy.cc!", "success");
  }
}
