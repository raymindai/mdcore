// Content script for ChatGPT and Claude pages
// Adds a "Save to mdfy.cc" button to AI conversation interfaces

(function () {
  // Create floating button
  const btn = document.createElement("button");
  btn.id = "mdfy-save-btn";
  btn.innerHTML = `<span style="color:#fb923c;font-weight:800">md</span><span style="font-weight:800">fy</span>`;
  btn.title = "Save to mdfy.cc";
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    // Extract conversation content
    let content = "";

    // ChatGPT
    const chatgptMessages = document.querySelectorAll("[data-message-author-role]");
    if (chatgptMessages.length > 0) {
      chatgptMessages.forEach((msg) => {
        const role = msg.getAttribute("data-message-author-role");
        const text = msg.querySelector(".markdown")?.innerHTML || msg.textContent;
        const label = role === "user" ? "**You:**" : "**Assistant:**";
        content += `${label}\n\n${text}\n\n---\n\n`;
      });
    }

    // Claude
    const claudeMessages = document.querySelectorAll("[data-testid='chat-message-text']");
    if (claudeMessages.length > 0) {
      claudeMessages.forEach((msg) => {
        content += msg.innerHTML + "\n\n---\n\n";
      });
    }

    // Fallback: get main content
    if (!content) {
      const main = document.querySelector("main, article, [role='main']");
      content = (main || document.body).innerHTML;
    }

    // Send to mdfy.cc
    const encoded = encodeURIComponent(content.slice(0, 50000));
    window.open(`https://mdfy.cc/?html=${encoded}`, "_blank");
  });
})();
