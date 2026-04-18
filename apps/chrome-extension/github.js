/**
 * mdfy.cc Chrome Extension — GitHub Integration
 *
 * Detects .md files on GitHub and adds an "Open in mdfy.cc" button.
 * Fetches raw markdown and opens it in mdfy.cc for beautiful rendering + editing.
 */

(function () {
  "use strict";

  if (document.documentElement.dataset.mdfyGithub) return;
  document.documentElement.dataset.mdfyGithub = "1";

  const MDFY_URL = "https://mdfy.cc";

  function isMarkdownPage() {
    // GitHub .md file view: URL like /owner/repo/blob/branch/path/file.md
    const path = window.location.pathname;
    if (!/\/blob\//.test(path)) return false;
    // Check file extension
    if (!/\.(md|markdown|mdx|mdown|mkd)$/i.test(path)) return false;
    return true;
  }

  function getRawUrl() {
    // Convert /owner/repo/blob/branch/path/file.md
    // to     /owner/repo/raw/branch/path/file.md
    return window.location.pathname.replace("/blob/", "/raw/");
  }

  function getFileName() {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1];
  }

  function createButton() {
    if (document.getElementById("mdfy-github-btn")) return;

    const btn = document.createElement("button");
    btn.id = "mdfy-github-btn";
    btn.className = "mdfy-github-btn";
    btn.innerHTML = '<span class="mdfy-gh-logo"><span class="mdfy-gh-md">md</span><span class="mdfy-gh-fy">fy</span></span><span class="mdfy-gh-label">Open in mdfy.cc</span>';
    btn.title = "Open this Markdown file in mdfy.cc for beautiful rendering and editing";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.classList.add("mdfy-gh-loading");
      btn.querySelector(".mdfy-gh-label").textContent = "Loading...";

      try {
        const rawUrl = getRawUrl();
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error("Failed to fetch: " + res.status);
        const markdown = await res.text();

        if (!markdown.trim()) {
          btn.querySelector(".mdfy-gh-label").textContent = "Empty file";
          setTimeout(() => resetButton(btn), 2000);
          return;
        }

        // Try authenticated upload if user is logged in to mdfy.cc
        try {
          const userId = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "get-user-id" }, (r) => resolve(r?.userId));
          });

          if (userId) {
            const title = getFileName().replace(/\.(md|markdown|mdx|mdown|mkd)$/i, "");
            const uploadRes = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                action: "proxy-fetch",
                url: MDFY_URL + "/api/docs",
                options: {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    markdown,
                    userId,
                    title,
                    editMode: "account",
                    source: "github",
                    isDraft: true,
                  }),
                },
              }, resolve);
            });

            if (uploadRes.ok) {
              let parsed;
              try { parsed = JSON.parse(uploadRes.body); } catch { throw new Error("Invalid response"); }
              const { id, editToken } = parsed;
              const tokenParam = editToken ? "&token=" + encodeURIComponent(editToken) : "";
              window.open(MDFY_URL + "/?doc=" + id + tokenParam, "_blank");
              btn.classList.remove("mdfy-gh-loading");
              btn.classList.add("mdfy-gh-done");
              btn.querySelector(".mdfy-gh-label").textContent = "Opened!";
              setTimeout(() => resetButton(btn), 3000);
              return;
            }
          }
        } catch {
          // Fall through to hash URL
        }

        // Fallback: hash URL (no login needed)
        const compressed = await compressToBase64Url(markdown);
        const url = MDFY_URL + "/#md=" + compressed;

        if (url.length <= 8000) {
          window.open(url, "_blank");
        } else {
          // Too large for URL — copy to clipboard and open empty editor
          try { await navigator.clipboard.writeText(markdown); } catch {}
          window.open(MDFY_URL, "_blank");
        }

        btn.classList.remove("mdfy-gh-loading");
        btn.classList.add("mdfy-gh-done");
        btn.querySelector(".mdfy-gh-label").textContent = "Opened!";
        setTimeout(() => resetButton(btn), 3000);
      } catch (err) {
        console.error("[mdfy] GitHub integration error:", err);
        btn.classList.remove("mdfy-gh-loading");
        btn.classList.add("mdfy-gh-error");
        btn.querySelector(".mdfy-gh-label").textContent = "Failed";
        setTimeout(() => resetButton(btn), 3000);
      }
    });

    // Insert into GitHub's file header actions
    const actionBar = document.querySelector(
      '[class*="react-blob-header-edit-and-raw-actions"], .Box-header .d-flex, [data-testid="raw-button"]?.parentElement, .file-actions'
    );

    if (actionBar) {
      actionBar.prepend(btn);
    } else {
      // Fallback: float in top-right of file content
      const fileContent = document.querySelector('[data-testid="blob-code-content"], .Box-body, #read-only-cursor-text-area')?.closest('.Box, [class*="react-blob"]');
      if (fileContent) {
        fileContent.style.position = "relative";
        btn.style.position = "absolute";
        btn.style.top = "8px";
        btn.style.right = "8px";
        btn.style.zIndex = "10";
        fileContent.prepend(btn);
      }
    }
  }

  function resetButton(btn) {
    btn.classList.remove("mdfy-gh-loading", "mdfy-gh-done", "mdfy-gh-error");
    btn.innerHTML = '<span class="mdfy-gh-logo"><span class="mdfy-gh-md">md</span><span class="mdfy-gh-fy">fy</span></span><span class="mdfy-gh-label">Open in mdfy.cc</span>';
  }

  // Compression (same as content.js)
  async function compressToBase64Url(text) {
    const encoder = new TextEncoder();
    const input = encoder.encode(text);
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    const reader = cs.readable.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    let binary = "";
    for (let i = 0; i < merged.length; i++) binary += String.fromCharCode(merged[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Run on page load and on navigation (GitHub SPA)
  function init() {
    if (isMarkdownPage()) {
      // Delay to let GitHub's React finish rendering
      setTimeout(createButton, 500);
    }
  }

  init();

  // GitHub uses SPA navigation — watch for URL changes
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Remove old button
      const old = document.getElementById("mdfy-github-btn");
      if (old) old.remove();
      // Check new page
      setTimeout(init, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
