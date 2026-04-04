/* =========================================================
   mdfy Desktop — Renderer Logic
   WYSIWYG editing, markdown rendering, file management
   ========================================================= */

(function () {
  "use strict";

  // ─── DOM References ───

  const content = document.getElementById("content");
  const emptyState = document.getElementById("empty-state");
  const sourceView = document.getElementById("source-view");
  const sourceEditor = document.getElementById("source-editor");
  const editorWrapper = document.getElementById("editor-wrapper");
  const toolbar = document.getElementById("toolbar");
  const titlebarFilename = document.getElementById("titlebar-filename");
  const titlebarModified = document.getElementById("titlebar-modified");
  const statusText = document.getElementById("status-text");
  const flavorBadge = document.getElementById("flavor-badge");
  const wordCountEl = document.getElementById("word-count");
  const charCountEl = document.getElementById("char-count");
  const dragOverlay = document.getElementById("drag-overlay");
  const btnShare = document.getElementById("btn-share");
  const btnSourceToggle = document.getElementById("btn-source-toggle");
  const emptyNew = document.getElementById("empty-new");
  const emptyOpen = document.getElementById("empty-open");

  // ─── State ───

  let currentMarkdown = "";
  let currentFilePath = null;
  let isModified = false;
  let isSourceView = false;
  let editDebounceTimer = null;
  let autoSaveTimer = null;
  let sourceDebounceTimer = null;
  let isUpdatingContent = false;
  let tableContextMenu = null;

  // ─── Initialize ───

  async function init() {
    // Detect theme
    const theme = await window.mdfy.getTheme();
    setTheme(theme);

    // Initialize Mermaid
    if (typeof mermaid !== "undefined") {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === "dark" ? "dark" : "default",
      });
    }

    // Show empty state
    showEmptyState();
  }

  init();

  // ─── Theme ───

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    // Toggle highlight.js themes
    const hljsDark = document.getElementById("hljs-theme-dark");
    const hljsLight = document.getElementById("hljs-theme-light");
    if (theme === "light") {
      if (hljsDark) hljsDark.disabled = true;
      if (hljsLight) hljsLight.disabled = false;
    } else {
      if (hljsDark) hljsDark.disabled = false;
      if (hljsLight) hljsLight.disabled = true;
    }

    // Reinitialize mermaid with correct theme
    if (typeof mermaid !== "undefined") {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === "dark" ? "dark" : "default",
      });
    }
  }

  window.mdfy.onThemeChanged((theme) => {
    setTheme(theme);
    // Re-render if we have content
    if (currentMarkdown) {
      renderMarkdown(currentMarkdown);
    }
  });

  // ─── View States ───

  function showEmptyState() {
    emptyState.style.display = "flex";
    content.style.display = "none";
    sourceView.style.display = "none";
    toolbar.style.display = "none";
  }

  function showEditor() {
    emptyState.style.display = "none";
    toolbar.style.display = "flex";

    if (isSourceView) {
      content.style.display = "none";
      sourceView.style.display = "flex";
    } else {
      content.style.display = "block";
      sourceView.style.display = "none";
    }
  }

  // ─── Markdown Rendering ───

  function renderMarkdown(markdown) {
    if (!markdown && markdown !== "") return;

    isUpdatingContent = true;

    // Configure marked
    if (typeof marked !== "undefined") {
      marked.setOptions({
        gfm: true,
        breaks: false,
        pedantic: false,
      });
    }

    try {
      let html = "";
      if (typeof marked !== "undefined") {
        html = marked.parse(markdown);
      } else {
        html = escapeHtml(markdown);
      }

      content.innerHTML = html;
      postProcess();
    } catch (err) {
      content.innerHTML = '<p style="color: #ef4444">Render error: ' + escapeHtml(err.message) + "</p>";
    }

    isUpdatingContent = false;
  }

  function postProcess() {
    // Syntax highlighting
    content.querySelectorAll("pre code").forEach((block) => {
      if (typeof hljs !== "undefined") {
        hljs.highlightElement(block);
      }
    });

    // Add copy buttons to code blocks
    content.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "code-copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const code = pre.querySelector("code");
        const text = code ? code.textContent : pre.textContent;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        });
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });

    // KaTeX math rendering
    content.querySelectorAll("[data-math-style]").forEach((el) => {
      if (typeof katex !== "undefined") {
        try {
          katex.render(el.textContent || "", el, {
            displayMode: el.getAttribute("data-math-style") === "display",
            throwOnError: false,
          });
        } catch (e) {
          // Silently ignore math errors
        }
      }
    });

    // Mermaid diagrams
    postProcessMermaid();
  }

  function postProcessMermaid() {
    if (typeof mermaid === "undefined") return;

    // Find mermaid code blocks
    content
      .querySelectorAll(
        'pre code.language-mermaid, pre[lang="mermaid"] code'
      )
      .forEach((el) => {
        const container = document.createElement("div");
        container.className = "mermaid";
        const originalCode = el.textContent || "";
        container.setAttribute("data-original-code", originalCode);
        container.textContent = originalCode;
        const pre = el.closest("pre");
        if (pre) pre.replaceWith(container);
      });

    mermaid.run().catch(() => {
      // Mermaid rendering failed silently
    });
  }

  // ─── HTML to Markdown ───

  function htmlToMarkdown(root) {
    let result = "";
    const children = root.childNodes;

    for (let i = 0; i < children.length; i++) {
      result += nodeToMarkdown(children[i], 0);
    }

    // Clean up excessive blank lines
    result = result.replace(/\n{3,}/g, "\n\n");
    return result.trim() + "\n";
  }

  function nodeToMarkdown(node, depth) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = node.tagName.toLowerCase();
    const innerText = node.textContent || "";

    switch (tag) {
      case "h1":
        return "# " + innerText.trim() + "\n\n";
      case "h2":
        return "## " + innerText.trim() + "\n\n";
      case "h3":
        return "### " + innerText.trim() + "\n\n";
      case "h4":
        return "#### " + innerText.trim() + "\n\n";
      case "h5":
        return "##### " + innerText.trim() + "\n\n";
      case "h6":
        return "###### " + innerText.trim() + "\n\n";

      case "p":
        return inlineChildrenToMd(node) + "\n\n";

      case "br":
        return "\n";

      case "strong":
      case "b":
        return "**" + inlineChildrenToMd(node) + "**";

      case "em":
      case "i":
        return "*" + inlineChildrenToMd(node) + "*";

      case "del":
      case "s":
        return "~~" + inlineChildrenToMd(node) + "~~";

      case "code":
        if (
          node.parentElement &&
          node.parentElement.tagName.toLowerCase() === "pre"
        ) {
          return innerText;
        }
        return "`" + innerText.replace(/`/g, "\\`") + "`";

      case "pre": {
        const lang = node.getAttribute("lang") || "";
        // Also check class for language
        const codeEl = node.querySelector("code");
        let codeLang = lang;
        if (!codeLang && codeEl) {
          const cls = codeEl.className || "";
          const match = cls.match(/language-(\w+)/);
          if (match) codeLang = match[1];
        }
        const codeText = codeEl ? codeEl.textContent : innerText;
        return "```" + codeLang + "\n" + codeText + "\n```\n\n";
      }

      case "a": {
        const href = node.getAttribute("href") || "";
        const linkText = inlineChildrenToMd(node);
        return "[" + linkText + "](" + href + ")";
      }

      case "img": {
        const src = node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "";
        return "![" + alt + "](" + src + ")\n\n";
      }

      case "blockquote": {
        const childMd = blockChildrenToMd(node);
        return (
          childMd
            .split("\n")
            .map((line) => "> " + line)
            .join("\n") + "\n\n"
        );
      }

      case "ul":
        return listToMarkdown(node, "ul", depth) + "\n";

      case "ol":
        return listToMarkdown(node, "ol", depth) + "\n";

      case "li":
        return inlineChildrenToMd(node);

      case "hr":
        return "---\n\n";

      case "table":
        return tableToMarkdown(node) + "\n\n";

      case "input":
        if (node.type === "checkbox") {
          return node.checked ? "[x] " : "[ ] ";
        }
        return "";

      case "details": {
        const summary = node.querySelector("summary");
        const summaryText = summary
          ? summary.textContent.trim()
          : "Details";
        let childMd = "";
        for (let c = 0; c < node.childNodes.length; c++) {
          if (node.childNodes[c] !== summary) {
            childMd += nodeToMarkdown(node.childNodes[c], depth);
          }
        }
        return (
          "<details>\n<summary>" +
          summaryText +
          "</summary>\n\n" +
          childMd.trim() +
          "\n</details>\n\n"
        );
      }

      case "div":
      case "section":
      case "article":
      case "main":
      case "aside":
      case "header":
      case "footer":
      case "nav": {
        let childResult = "";
        for (let j = 0; j < node.childNodes.length; j++) {
          childResult += nodeToMarkdown(node.childNodes[j], depth);
        }
        return childResult;
      }

      case "span":
        return inlineChildrenToMd(node);

      default:
        return innerText;
    }
  }

  function inlineChildrenToMd(node) {
    let result = "";
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent || "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        result += nodeToMarkdown(child, 0);
      }
    }
    return result;
  }

  function blockChildrenToMd(node) {
    let result = "";
    for (let i = 0; i < node.childNodes.length; i++) {
      result += nodeToMarkdown(node.childNodes[i], 0);
    }
    return result.trim();
  }

  function listToMarkdown(listNode, type, depth) {
    let result = "";
    const items = listNode.children;
    const indent = "  ".repeat(depth);

    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      if (li.tagName.toLowerCase() !== "li") continue;

      let prefix;
      if (type === "ol") {
        prefix = i + 1 + ". ";
      } else {
        const checkbox = li.querySelector("input[type='checkbox']");
        if (checkbox) {
          prefix = checkbox.checked ? "- [x] " : "- [ ] ";
        } else {
          prefix = "- ";
        }
      }

      let textContent = "";
      let nestedList = "";

      for (let j = 0; j < li.childNodes.length; j++) {
        const child = li.childNodes[j];
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = child.tagName.toLowerCase();
          if (childTag === "ul" || childTag === "ol") {
            nestedList += listToMarkdown(child, childTag, depth + 1);
          } else if (childTag === "input" && child.type === "checkbox") {
            // Skip, handled by prefix
          } else {
            textContent += nodeToMarkdown(child, depth);
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          textContent += child.textContent || "";
        }
      }

      result += indent + prefix + textContent.trim() + "\n";
      if (nestedList) {
        result += nestedList;
      }
    }

    return result;
  }

  function tableToMarkdown(tableNode) {
    const rows = tableNode.querySelectorAll("tr");
    if (rows.length === 0) return "";

    let result = "";
    let colCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("th, td");
      if (i === 0) colCount = cells.length;

      let row = "|";
      for (let j = 0; j < cells.length; j++) {
        row += " " + (cells[j].textContent || "").trim() + " |";
      }
      result += row + "\n";

      if (i === 0) {
        let sep = "|";
        for (let k = 0; k < colCount; k++) {
          sep += " --- |";
        }
        result += sep + "\n";
      }
    }

    return result;
  }

  // ─── Flavor Detection ───

  function detectFlavor(markdown) {
    if (!markdown) return "GFM";

    const hasWikilinks = /\[\[[^\]]+\]\]/.test(markdown);
    const hasCallouts = /^>\s*\[!(\w+)\]/m.test(markdown);
    if (hasWikilinks || hasCallouts) return "Obsidian";

    const hasJSX = /<[A-Z]\w+/.test(markdown);
    const hasImport = /^import\s+/m.test(markdown);
    if (hasJSX && hasImport) return "MDX";

    const hasTable = /\|.*\|.*\n\|[\s-:|]+\|/.test(markdown);
    const hasTaskList = /^(\s*)- \[[ x]\]/m.test(markdown);
    const hasStrikethrough = /~~[^~]+~~/.test(markdown);
    if (hasTable || hasTaskList || hasStrikethrough) return "GFM";

    return "GFM";
  }

  // ─── Word/Char Count ───

  function updateCounts(markdown) {
    const text = markdown || "";
    const chars = text.length;
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    wordCountEl.textContent = words + " word" + (words !== 1 ? "s" : "");
    charCountEl.textContent = chars + " char" + (chars !== 1 ? "s" : "");
  }

  // ─── Status Updates ───

  function setStatus(text, className) {
    statusText.textContent = text;
    statusText.className = className || "";
  }

  function updateFilenameDisplay() {
    const name = currentFilePath
      ? currentFilePath.split("/").pop()
      : "Untitled";
    titlebarFilename.textContent = name;
  }

  function setModified(modified) {
    isModified = modified;
    if (modified) {
      titlebarModified.classList.add("visible");
      window.mdfy.markModified();
    } else {
      titlebarModified.classList.remove("visible");
      window.mdfy.markSaved();
    }
  }

  // ─── File Operations ───

  function newDocument() {
    currentFilePath = null;
    currentMarkdown = "";
    isModified = false;
    isSourceView = false;

    content.innerHTML = "";
    sourceEditor.value = "";

    updateFilenameDisplay();
    setModified(false);
    updateCounts("");
    flavorBadge.textContent = "GFM";
    setStatus("Ready");
    showEditor();
    content.focus();
  }

  function openDocument(filePath, fileContent) {
    currentFilePath = filePath;
    currentMarkdown = fileContent;
    isModified = false;

    updateFilenameDisplay();
    setModified(false);

    renderMarkdown(currentMarkdown);
    sourceEditor.value = currentMarkdown;

    updateCounts(currentMarkdown);
    flavorBadge.textContent = detectFlavor(currentMarkdown);
    setStatus("Ready");
    showEditor();

    if (isSourceView) {
      sourceEditor.focus();
    } else {
      content.focus();
    }
  }

  async function saveDocument() {
    if (!currentFilePath) {
      // Save As
      return saveDocumentAs();
    }

    try {
      // Get current markdown
      const md = isSourceView ? sourceEditor.value : htmlToMarkdown(content);
      setStatus("Saving...", "saving");

      await window.mdfy.saveFile(currentFilePath, md);
      currentMarkdown = md;
      setModified(false);
      setStatus("Saved", "saved");

      setTimeout(() => {
        setStatus("Ready");
      }, 2000);
    } catch (err) {
      setStatus("Save failed", "error");
      console.error("Save error:", err);
    }
  }

  async function saveDocumentAs() {
    const defaultName = currentFilePath
      ? currentFilePath.split("/").pop()
      : "Untitled.md";

    const filePath = await window.mdfy.saveFileDialog(defaultName);
    if (!filePath) return;

    currentFilePath = filePath;
    updateFilenameDisplay();
    return saveDocument();
  }

  async function shareDocument() {
    const md = isSourceView ? sourceEditor.value : htmlToMarkdown(content);
    if (!md.trim()) {
      setStatus("Nothing to share");
      return;
    }

    try {
      setStatus("Sharing...", "saving");
      const title = extractTitle(md);
      const result = await window.mdfy.shareToMdfy(md, title);

      // Copy URL to clipboard
      navigator.clipboard.writeText(result.url);

      setStatus("Shared! URL copied", "shared");
      window.mdfy.showNotification(
        "Published to mdfy.cc",
        result.url
      );

      setTimeout(() => {
        setStatus("Ready");
      }, 3000);
    } catch (err) {
      setStatus("Share failed", "error");
      console.error("Share error:", err);
      setTimeout(() => {
        setStatus("Ready");
      }, 3000);
    }
  }

  function extractTitle(markdown) {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : undefined;
  }

  // ─── Auto-save (5s debounce) ───

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (!currentFilePath) return;

    autoSaveTimer = setTimeout(() => {
      if (isModified && currentFilePath) {
        saveDocument();
      }
    }, 5000);
  }

  // ─── WYSIWYG Editing ───

  content.addEventListener("input", () => {
    if (isUpdatingContent) return;

    if (editDebounceTimer) clearTimeout(editDebounceTimer);

    editDebounceTimer = setTimeout(() => {
      const md = htmlToMarkdown(content);
      if (md !== currentMarkdown) {
        currentMarkdown = md;
        sourceEditor.value = md;
        setModified(true);
        updateCounts(md);
        flavorBadge.textContent = detectFlavor(md);
        scheduleAutoSave();
      }
    }, 300);
  });

  // ─── Keyboard Shortcuts ───

  content.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          applyInlineFormat("bold");
          break;
        case "i":
          e.preventDefault();
          applyInlineFormat("italic");
          break;
        case "k":
          e.preventDefault();
          insertLink();
          break;
      }
    }
  });

  // ─── Source View Editing ───

  sourceEditor.addEventListener("input", () => {
    if (sourceDebounceTimer) clearTimeout(sourceDebounceTimer);

    sourceDebounceTimer = setTimeout(() => {
      const md = sourceEditor.value;
      if (md !== currentMarkdown) {
        currentMarkdown = md;
        setModified(true);
        updateCounts(md);
        flavorBadge.textContent = detectFlavor(md);

        // Update preview in background
        isUpdatingContent = true;
        renderMarkdown(md);
        isUpdatingContent = false;

        scheduleAutoSave();
      }
    }, 300);
  });

  // Handle Tab key in source editor
  sourceEditor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = sourceEditor.selectionStart;
      const end = sourceEditor.selectionEnd;
      sourceEditor.value =
        sourceEditor.value.substring(0, start) +
        "  " +
        sourceEditor.value.substring(end);
      sourceEditor.selectionStart = sourceEditor.selectionEnd = start + 2;
      sourceEditor.dispatchEvent(new Event("input"));
    }
  });

  // ─── Toggle Source View ───

  function toggleSource() {
    isSourceView = !isSourceView;

    if (isSourceView) {
      // Sync markdown from WYSIWYG before switching
      currentMarkdown = htmlToMarkdown(content);
      sourceEditor.value = currentMarkdown;

      content.style.display = "none";
      sourceView.style.display = "flex";
      btnSourceToggle.classList.add("active");
      sourceEditor.focus();
    } else {
      // Sync markdown from source before switching
      currentMarkdown = sourceEditor.value;
      renderMarkdown(currentMarkdown);

      sourceView.style.display = "none";
      content.style.display = "block";
      btnSourceToggle.classList.remove("active");
      content.focus();
    }
  }

  // ─── Toolbar Handlers ───

  toolbar.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const action = button.getAttribute("data-action");
    if (!action) return;

    e.preventDefault();

    // If in source view, apply text operations to source editor
    if (isSourceView) {
      applySourceAction(action);
      return;
    }

    content.focus();

    switch (action) {
      case "bold":
        applyInlineFormat("bold");
        break;
      case "italic":
        applyInlineFormat("italic");
        break;
      case "strikethrough":
        applyInlineFormat("strikethrough");
        break;
      case "h1":
        applyBlockFormat("h1");
        break;
      case "h2":
        applyBlockFormat("h2");
        break;
      case "h3":
        applyBlockFormat("h3");
        break;
      case "ul":
        applyBlockFormat("ul");
        break;
      case "ol":
        applyBlockFormat("ol");
        break;
      case "task":
        applyBlockFormat("task");
        break;
      case "indent":
        applyIndent();
        break;
      case "outdent":
        applyOutdent();
        break;
      case "blockquote":
        applyBlockFormat("blockquote");
        break;
      case "hr":
        insertHorizontalRule();
        break;
      case "link":
        insertLink();
        break;
      case "image":
        insertImagePrompt();
        break;
      case "table":
        insertTable();
        break;
      case "code":
        applyInlineFormat("code");
        break;
      case "codeblock":
        insertCodeBlock();
        break;
    }
  });

  // ─── Source View Actions ───

  function applySourceAction(action) {
    const start = sourceEditor.selectionStart;
    const end = sourceEditor.selectionEnd;
    const text = sourceEditor.value;
    const selected = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    switch (action) {
      case "bold":
        replacement = "**" + (selected || "bold") + "**";
        cursorOffset = selected ? replacement.length : 2;
        break;
      case "italic":
        replacement = "*" + (selected || "italic") + "*";
        cursorOffset = selected ? replacement.length : 1;
        break;
      case "strikethrough":
        replacement = "~~" + (selected || "strikethrough") + "~~";
        cursorOffset = selected ? replacement.length : 2;
        break;
      case "code":
        replacement = "`" + (selected || "code") + "`";
        cursorOffset = selected ? replacement.length : 1;
        break;
      case "h1":
        replacement = "# " + (selected || "Heading 1");
        cursorOffset = replacement.length;
        break;
      case "h2":
        replacement = "## " + (selected || "Heading 2");
        cursorOffset = replacement.length;
        break;
      case "h3":
        replacement = "### " + (selected || "Heading 3");
        cursorOffset = replacement.length;
        break;
      case "ul":
        replacement = "- " + (selected || "List item");
        cursorOffset = replacement.length;
        break;
      case "ol":
        replacement = "1. " + (selected || "List item");
        cursorOffset = replacement.length;
        break;
      case "task":
        replacement = "- [ ] " + (selected || "Task");
        cursorOffset = replacement.length;
        break;
      case "blockquote":
        replacement = "> " + (selected || "Quote");
        cursorOffset = replacement.length;
        break;
      case "hr":
        replacement = "\n---\n";
        cursorOffset = replacement.length;
        break;
      case "link":
        replacement = "[" + (selected || "text") + "](url)";
        cursorOffset = replacement.length;
        break;
      case "image":
        replacement = "![" + (selected || "alt") + "](url)";
        cursorOffset = replacement.length;
        break;
      case "table":
        replacement =
          "| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n";
        cursorOffset = replacement.length;
        break;
      case "codeblock":
        replacement = "```\n" + (selected || "code") + "\n```";
        cursorOffset = 4;
        break;
      default:
        return;
    }

    sourceEditor.value =
      text.substring(0, start) + replacement + text.substring(end);
    sourceEditor.selectionStart = sourceEditor.selectionEnd =
      start + cursorOffset;
    sourceEditor.focus();
    sourceEditor.dispatchEvent(new Event("input"));
  }

  // ─── WYSIWYG Formatting ───

  function applyInlineFormat(format) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const text = range.toString();
    if (!text) return;

    let wrapper;
    switch (format) {
      case "bold":
        wrapper = document.createElement("strong");
        break;
      case "italic":
        wrapper = document.createElement("em");
        break;
      case "strikethrough":
        wrapper = document.createElement("del");
        break;
      case "code":
        wrapper = document.createElement("code");
        break;
      default:
        return;
    }

    // Check if already wrapped
    const parentTag = range.commonAncestorContainer.parentElement;
    if (
      parentTag &&
      parentTag.tagName === wrapper.tagName &&
      parentTag !== content
    ) {
      // Unwrap
      const textNode = document.createTextNode(parentTag.textContent || "");
      parentTag.parentNode.replaceChild(textNode, parentTag);
    } else {
      range.surroundContents(wrapper);
    }

    triggerEditDebounce();
  }

  function applyBlockFormat(format) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const blockNode = findBlockParent(range.startContainer);
    if (!blockNode || blockNode === content) return;

    let newNode;
    switch (format) {
      case "h1":
      case "h2":
      case "h3":
        newNode = document.createElement(format);
        newNode.textContent = blockNode.textContent;
        break;
      case "p":
        newNode = document.createElement("p");
        newNode.textContent = blockNode.textContent;
        break;
      case "blockquote": {
        newNode = document.createElement("blockquote");
        const p = document.createElement("p");
        p.textContent = blockNode.textContent;
        newNode.appendChild(p);
        break;
      }
      case "ul": {
        newNode = document.createElement("ul");
        const li = document.createElement("li");
        li.textContent = blockNode.textContent;
        newNode.appendChild(li);
        break;
      }
      case "ol": {
        newNode = document.createElement("ol");
        const li2 = document.createElement("li");
        li2.textContent = blockNode.textContent;
        newNode.appendChild(li2);
        break;
      }
      case "task": {
        newNode = document.createElement("ul");
        const tli = document.createElement("li");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.disabled = false;
        tli.appendChild(cb);
        tli.appendChild(
          document.createTextNode(" " + blockNode.textContent)
        );
        newNode.appendChild(tli);
        break;
      }
      default:
        return;
    }

    blockNode.parentNode.replaceChild(newNode, blockNode);
    triggerEditDebounce();
  }

  function insertLink() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const text = range.toString() || "link text";

    const link = document.createElement("a");
    link.href = "https://";
    link.textContent = text;

    range.deleteContents();
    range.insertNode(link);
    sel.selectAllChildren(link);
    triggerEditDebounce();
  }

  function insertImagePrompt() {
    const url = prompt("Image URL:", "https://");
    if (!url) return;
    const alt = prompt("Alt text:", "image") || "image";

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const img = document.createElement("img");
    img.src = url;
    img.alt = alt;

    const p = document.createElement("p");
    p.appendChild(img);

    const range = sel.getRangeAt(0);
    const blockNode = findBlockParent(range.startContainer);
    if (blockNode && blockNode !== content) {
      blockNode.parentNode.insertBefore(p, blockNode.nextSibling);
    } else {
      content.appendChild(p);
    }

    triggerEditDebounce();
  }

  function insertTable() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const blockNode = findBlockParent(range.startContainer);

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (let h = 1; h <= 3; h++) {
      const th = document.createElement("th");
      th.textContent = "Header " + h;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let r = 0; r < 2; r++) {
      const row = document.createElement("tr");
      for (let c = 0; c < 3; c++) {
        const td = document.createElement("td");
        td.textContent = "Cell";
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    if (blockNode && blockNode !== content) {
      blockNode.parentNode.insertBefore(table, blockNode.nextSibling);
    } else {
      content.appendChild(table);
    }

    triggerEditDebounce();
  }

  function insertCodeBlock() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const blockNode = findBlockParent(range.startContainer);

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = range.toString() || "code here";
    pre.appendChild(code);

    if (blockNode && blockNode !== content) {
      blockNode.parentNode.insertBefore(pre, blockNode.nextSibling);
    } else {
      content.appendChild(pre);
    }

    triggerEditDebounce();
  }

  function insertHorizontalRule() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const blockNode = findBlockParent(range.startContainer);

    const hr = document.createElement("hr");

    if (blockNode && blockNode !== content) {
      blockNode.parentNode.insertBefore(hr, blockNode.nextSibling);
    } else {
      content.appendChild(hr);
    }

    triggerEditDebounce();
  }

  function applyIndent() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const li = findParentByTag(range.startContainer, "LI");
    if (!li) return;

    const prevLi = li.previousElementSibling;
    if (!prevLi || prevLi.tagName !== "LI") return;

    const parentList = li.parentNode;
    const listTag = parentList.tagName.toLowerCase();
    let nestedList = prevLi.querySelector(listTag);
    if (!nestedList) {
      nestedList = document.createElement(listTag);
      prevLi.appendChild(nestedList);
    }

    nestedList.appendChild(li);
    triggerEditDebounce();
  }

  function applyOutdent() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const li = findParentByTag(range.startContainer, "LI");
    if (!li) return;

    const parentList = li.parentNode;
    if (!parentList) return;

    const grandparentLi = parentList.parentNode;
    if (!grandparentLi || grandparentLi.tagName !== "LI") return;

    const outerList = grandparentLi.parentNode;
    if (!outerList) return;

    outerList.insertBefore(li, grandparentLi.nextSibling);

    if (parentList.children.length === 0) {
      parentList.parentNode.removeChild(parentList);
    }

    triggerEditDebounce();
  }

  // ─── Table Inline Editing ───

  content.addEventListener("dblclick", (e) => {
    const td = e.target.closest("td, th");
    if (!td) return;
    if (td.getAttribute("contenteditable") === "true") return;

    e.stopPropagation();
    td.setAttribute("contenteditable", "true");
    td.classList.add("table-cell-editing");
    td.focus();

    const range = document.createRange();
    range.selectNodeContents(td);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const onBlur = () => {
      td.removeAttribute("contenteditable");
      td.classList.remove("table-cell-editing");
      td.removeEventListener("blur", onBlur);
      triggerEditDebounce();
    };
    td.addEventListener("blur", onBlur);

    td.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === "Escape") {
        ev.preventDefault();
        td.blur();
      }
      if (ev.key === "Tab") {
        ev.preventDefault();
        td.blur();
        const next = ev.shiftKey
          ? td.previousElementSibling
          : td.nextElementSibling;
        if (next && (next.tagName === "TD" || next.tagName === "TH")) {
          next.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        }
      }
    });
  });

  // Table context menu
  content.addEventListener("contextmenu", (e) => {
    const td = e.target.closest("td, th");
    if (!td) {
      hideTableContextMenu();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    showTableContextMenu(e.clientX, e.clientY, td);
  });

  function showTableContextMenu(x, y, td) {
    hideTableContextMenu();

    const menu = document.createElement("div");
    menu.className = "table-context-menu";

    const items = [
      { label: "Add Row Above", action: "addRowAbove" },
      { label: "Add Row Below", action: "addRowBelow" },
      { label: "Add Column Left", action: "addColLeft" },
      { label: "Add Column Right", action: "addColRight" },
      { label: "---" },
      { label: "Delete Row", action: "deleteRow" },
      { label: "Delete Column", action: "deleteCol" },
    ];

    items.forEach((item) => {
      if (item.label === "---") {
        const sep = document.createElement("div");
        sep.className = "table-ctx-separator";
        menu.appendChild(sep);
        return;
      }

      const btn = document.createElement("button");
      btn.className = "table-ctx-item";
      btn.textContent = item.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleTableAction(item.action, td);
        hideTableContextMenu();
      });
      menu.appendChild(btn);
    });

    menu.style.position = "fixed";
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    document.body.appendChild(menu);
    tableContextMenu = menu;

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = x - rect.width + "px";
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = y - rect.height + "px";
    }

    setTimeout(() => {
      document.addEventListener("click", hideTableContextMenu, {
        once: true,
      });
    }, 0);
  }

  function hideTableContextMenu() {
    if (tableContextMenu) {
      tableContextMenu.remove();
      tableContextMenu = null;
    }
  }

  function handleTableAction(action, td) {
    const tr = td.closest("tr");
    const table = td.closest("table");
    if (!tr || !table) return;

    const cellIndex = Array.prototype.indexOf.call(tr.children, td);
    const allRows = table.querySelectorAll("tr");
    const colCount = allRows.length > 0 ? allRows[0].children.length : 0;

    switch (action) {
      case "addRowAbove":
      case "addRowBelow": {
        const newRow = document.createElement("tr");
        for (let c = 0; c < colCount; c++) {
          const newTd = document.createElement("td");
          newTd.textContent = "";
          newRow.appendChild(newTd);
        }
        if (action === "addRowAbove") {
          tr.parentNode.insertBefore(newRow, tr);
        } else {
          tr.parentNode.insertBefore(newRow, tr.nextSibling);
        }
        break;
      }
      case "addColLeft":
      case "addColRight": {
        allRows.forEach((row) => {
          const isHeader =
            row.children[0] && row.children[0].tagName === "TH";
          const newCell = document.createElement(isHeader ? "th" : "td");
          newCell.textContent = isHeader ? "Header" : "";
          const refCell = row.children[cellIndex];
          if (action === "addColLeft" && refCell) {
            row.insertBefore(newCell, refCell);
          } else if (refCell) {
            row.insertBefore(newCell, refCell.nextSibling);
          } else {
            row.appendChild(newCell);
          }
        });
        break;
      }
      case "deleteRow": {
        const rowIndex = Array.prototype.indexOf.call(allRows, tr);
        if (rowIndex === 0 || allRows.length <= 2) return;
        tr.remove();
        break;
      }
      case "deleteCol": {
        if (colCount <= 1) return;
        allRows.forEach((row) => {
          const cell = row.children[cellIndex];
          if (cell) cell.remove();
        });
        break;
      }
    }

    triggerEditDebounce();
  }

  // ─── Helper Functions ───

  function findBlockParent(node) {
    const blockTags = [
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "LI",
      "BLOCKQUOTE",
      "PRE",
      "DIV",
      "TABLE",
      "UL",
      "OL",
      "HR",
      "DETAILS",
    ];

    let current = node;
    while (current && current !== content) {
      if (
        current.nodeType === Node.ELEMENT_NODE &&
        blockTags.indexOf(current.tagName) !== -1
      ) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  function findParentByTag(node, tagName) {
    let current = node;
    while (current && current !== content) {
      if (
        current.nodeType === Node.ELEMENT_NODE &&
        current.tagName === tagName
      ) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  function triggerEditDebounce() {
    if (editDebounceTimer) clearTimeout(editDebounceTimer);

    editDebounceTimer = setTimeout(() => {
      const md = htmlToMarkdown(content);
      if (md !== currentMarkdown) {
        currentMarkdown = md;
        sourceEditor.value = md;
        setModified(true);
        updateCounts(md);
        flavorBadge.textContent = detectFlavor(md);
        scheduleAutoSave();
      }
    }, 300);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Drag & Drop ───

  let dragCounter = 0;

  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      dragOverlay.style.display = "flex";
    }
  });

  document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dragOverlay.style.display = "none";
    }
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    dragOverlay.style.display = "none";

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const name = file.name.toLowerCase();
      if (
        name.endsWith(".md") ||
        name.endsWith(".markdown") ||
        name.endsWith(".mdown") ||
        name.endsWith(".mkd") ||
        name.endsWith(".txt")
      ) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          // For dropped files, we get the path from the file object
          const filePath = file.path || null;
          if (filePath) {
            openDocument(filePath, ev.target.result);
          } else {
            // No path available (security restriction), open as untitled
            currentFilePath = null;
            currentMarkdown = ev.target.result;
            isModified = true;
            updateFilenameDisplay();
            renderMarkdown(currentMarkdown);
            sourceEditor.value = currentMarkdown;
            updateCounts(currentMarkdown);
            flavorBadge.textContent = detectFlavor(currentMarkdown);
            setStatus("Opened (unsaved)");
            showEditor();
          }
        };
        reader.readAsText(file);
      }
    }
  });

  // ─── Empty State Buttons ───

  emptyNew.addEventListener("click", () => {
    newDocument();
  });

  emptyOpen.addEventListener("click", async () => {
    const result = await window.mdfy.openFileDialog();
    if (result) {
      openDocument(result.path, result.content);
    }
  });

  // ─── Title Bar Buttons ───

  btnShare.addEventListener("click", () => {
    shareDocument();
  });

  btnSourceToggle.addEventListener("click", () => {
    toggleSource();
  });

  // ─── IPC Event Handlers ───

  window.mdfy.onFileOpened((path, fileContent) => {
    if (path === null && fileContent === "") {
      // New file
      newDocument();
      return;
    }
    openDocument(path, fileContent);
  });

  window.mdfy.onRequestSave(() => {
    saveDocument();
  });

  window.mdfy.onRequestSaveAs(() => {
    saveDocumentAs();
  });

  window.mdfy.onRequestShare(() => {
    shareDocument();
  });

  window.mdfy.onToggleSource(() => {
    // Only toggle if editor is visible (not empty state)
    if (emptyState.style.display !== "flex") {
      toggleSource();
    }
  });

  window.mdfy.onFileChangedExternally((newContent) => {
    if (newContent === currentMarkdown) return;

    // File was modified externally
    currentMarkdown = newContent;
    renderMarkdown(currentMarkdown);
    sourceEditor.value = currentMarkdown;
    updateCounts(currentMarkdown);
    flavorBadge.textContent = detectFlavor(currentMarkdown);
    setStatus("Updated from disk");
    setTimeout(() => setStatus("Ready"), 2000);
  });

  window.mdfy.onShowShortcuts(() => {
    showShortcutsModal();
  });

  // ─── Keyboard Shortcuts Modal ───

  function showShortcutsModal() {
    // Remove existing
    const existing = document.getElementById("shortcuts-modal");
    if (existing) {
      existing.remove();
      return;
    }

    const modal = document.createElement("div");
    modal.id = "shortcuts-modal";
    modal.innerHTML = `
      <div class="shortcuts-panel">
        <h2>Keyboard Shortcuts</h2>
        <table>
          <tr><td>New Document</td><td><kbd>Cmd+N</kbd></td></tr>
          <tr><td>Open File</td><td><kbd>Cmd+O</kbd></td></tr>
          <tr><td>Save</td><td><kbd>Cmd+S</kbd></td></tr>
          <tr><td>Save As</td><td><kbd>Cmd+Shift+S</kbd></td></tr>
          <tr><td>Share to mdfy.cc</td><td><kbd>Cmd+Shift+P</kbd></td></tr>
          <tr><td>Toggle Source</td><td><kbd>Cmd+/</kbd></td></tr>
          <tr><td>Bold</td><td><kbd>Cmd+B</kbd></td></tr>
          <tr><td>Italic</td><td><kbd>Cmd+I</kbd></td></tr>
          <tr><td>Insert Link</td><td><kbd>Cmd+K</kbd></td></tr>
          <tr><td>Zoom In</td><td><kbd>Cmd++</kbd></td></tr>
          <tr><td>Zoom Out</td><td><kbd>Cmd+-</kbd></td></tr>
          <tr><td>Actual Size</td><td><kbd>Cmd+0</kbd></td></tr>
        </table>
        <button class="shortcuts-close">Close</button>
      </div>
    `;

    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("shortcuts-close")) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  // ─── Global Keyboard Shortcuts ───

  document.addEventListener("keydown", (e) => {
    // Escape closes modals
    if (e.key === "Escape") {
      const modal = document.getElementById("shortcuts-modal");
      if (modal) modal.remove();
      hideTableContextMenu();
    }
  });
})();
