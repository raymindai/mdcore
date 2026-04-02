/* =========================================================
   mdfy VS Code Preview — Webview Client Script
   WYSIWYG editing via contentEditable + message passing
   ========================================================= */

(function () {
  "use strict";

  /** @type {ReturnType<typeof acquireVsCodeApi>} */
  const vscode = acquireVsCodeApi();

  /** @type {HTMLElement} */
  const content = document.getElementById("content");
  /** @type {HTMLElement} */
  const syncStatus = document.getElementById("sync-status");
  /** @type {HTMLElement} */
  const toolbar = document.getElementById("toolbar");

  // Current markdown source (kept in sync with extension)
  let currentMarkdown = window.__initialMarkdown || "";
  /** @type {number | null} */
  let editDebounceTimer = null;
  let isUpdatingFromExtension = false;

  // ─── Message Handling (Extension <-> Webview) ───

  window.addEventListener("message", function (event) {
    const message = event.data;

    switch (message.type) {
      case "update":
        // Extension sent new rendered HTML (from .md file change)
        isUpdatingFromExtension = true;
        if (message.markdown !== undefined) {
          currentMarkdown = message.markdown;
        }
        if (message.html !== undefined) {
          // Preserve cursor position approximately
          const sel = window.getSelection();
          const hadFocus = document.activeElement === content;
          let caretOffset = 0;

          if (hadFocus && sel && sel.rangeCount > 0) {
            caretOffset = getCaretCharacterOffset(content);
          }

          content.innerHTML = message.html;

          if (hadFocus && caretOffset > 0) {
            restoreCaretPosition(content, caretOffset);
          }
        }
        isUpdatingFromExtension = false;
        break;

      case "syncStatus":
        setSyncStatusDisplay(message.status);
        break;
    }
  });

  // ─── WYSIWYG Editing ───

  content.addEventListener("input", function () {
    if (isUpdatingFromExtension) return;

    // Debounce: wait 500ms after last edit before sending to extension
    if (editDebounceTimer) {
      clearTimeout(editDebounceTimer);
    }

    editDebounceTimer = setTimeout(function () {
      const markdown = htmlToMarkdown(content);
      if (markdown !== currentMarkdown) {
        currentMarkdown = markdown;
        vscode.postMessage({ type: "edit", markdown: markdown });
      }
    }, 500);
  });

  // Keyboard shortcuts inside contentEditable
  content.addEventListener("keydown", function (e) {
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

  // ─── Toolbar Handling ───

  toolbar.addEventListener("click", function (e) {
    const button = e.target.closest("button");
    if (!button) return;

    const action = button.getAttribute("data-action");
    if (!action) return;

    e.preventDefault();
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
      case "link":
        insertLink();
        break;
      case "code":
        applyInlineFormat("code");
        break;
      case "codeblock":
        insertCodeBlock();
        break;
      case "blockquote":
        applyBlockFormat("blockquote");
        break;
      case "hr":
        insertHorizontalRule();
        break;
    }
  });

  // ─── Formatting Functions ───

  function applyInlineFormat(format) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var text = range.toString();
    if (!text) return;

    var wrapper;
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

    // Check if already wrapped in same tag
    var parentTag = range.commonAncestorContainer.parentElement;
    if (
      parentTag &&
      parentTag.tagName === wrapper.tagName &&
      parentTag !== content
    ) {
      // Unwrap: replace the parent with its text content
      var textNode = document.createTextNode(parentTag.textContent || "");
      parentTag.parentNode.replaceChild(textNode, parentTag);
    } else {
      // Wrap selection
      range.surroundContents(wrapper);
    }

    triggerEditDebounce();
  }

  function applyBlockFormat(format) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);

    // Find the block-level parent
    var blockNode = findBlockParent(range.startContainer);
    if (!blockNode || blockNode === content) return;

    var newNode;
    switch (format) {
      case "h1":
        newNode = document.createElement("h1");
        newNode.textContent = blockNode.textContent;
        break;
      case "h2":
        newNode = document.createElement("h2");
        newNode.textContent = blockNode.textContent;
        break;
      case "h3":
        newNode = document.createElement("h3");
        newNode.textContent = blockNode.textContent;
        break;
      case "blockquote":
        newNode = document.createElement("blockquote");
        var p = document.createElement("p");
        p.textContent = blockNode.textContent;
        newNode.appendChild(p);
        break;
      case "ul": {
        newNode = document.createElement("ul");
        var li = document.createElement("li");
        li.textContent = blockNode.textContent;
        newNode.appendChild(li);
        break;
      }
      case "ol": {
        newNode = document.createElement("ol");
        var li2 = document.createElement("li");
        li2.textContent = blockNode.textContent;
        newNode.appendChild(li2);
        break;
      }
      case "task": {
        newNode = document.createElement("ul");
        newNode.className = "contains-task-list";
        var tli = document.createElement("li");
        tli.className = "task-list-item";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.disabled = false;
        tli.appendChild(cb);
        tli.appendChild(document.createTextNode(" " + blockNode.textContent));
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
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var text = range.toString() || "link text";

    var link = document.createElement("a");
    link.href = "https://";
    link.textContent = text;

    range.deleteContents();
    range.insertNode(link);

    // Select the href for easy editing
    sel.selectAllChildren(link);
    triggerEditDebounce();
  }

  function insertCodeBlock() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var blockNode = findBlockParent(range.startContainer);

    var pre = document.createElement("pre");
    var code = document.createElement("code");
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
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var blockNode = findBlockParent(range.startContainer);

    var hr = document.createElement("hr");

    if (blockNode && blockNode !== content) {
      blockNode.parentNode.insertBefore(hr, blockNode.nextSibling);
    } else {
      content.appendChild(hr);
    }

    triggerEditDebounce();
  }

  // ─── HTML to Markdown Conversion ───

  function htmlToMarkdown(root) {
    var result = "";
    var children = root.childNodes;

    for (var i = 0; i < children.length; i++) {
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

    var tag = node.tagName.toLowerCase();
    var innerText = node.textContent || "";
    var childMd = "";

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
        // If parent is <pre>, skip (handled by pre)
        if (node.parentElement && node.parentElement.tagName.toLowerCase() === "pre") {
          return innerText;
        }
        var escapedCode = innerText.replace(/`/g, "\\`");
        return "`" + escapedCode + "`";

      case "pre": {
        var lang = node.getAttribute("lang") || "";
        var codeEl = node.querySelector("code");
        var codeText = codeEl ? codeEl.textContent : innerText;
        return "```" + lang + "\n" + codeText + "\n```\n\n";
      }

      case "a": {
        var href = node.getAttribute("href") || "";
        var linkText = inlineChildrenToMd(node);
        return "[" + linkText + "](" + href + ")";
      }

      case "img": {
        var src = node.getAttribute("src") || "";
        var alt = node.getAttribute("alt") || "";
        return "![" + alt + "](" + src + ")\n\n";
      }

      case "blockquote":
        childMd = blockChildrenToMd(node);
        return childMd
          .split("\n")
          .map(function (line) {
            return "> " + line;
          })
          .join("\n") + "\n\n";

      case "ul":
        return listToMarkdown(node, "ul", depth) + "\n";

      case "ol":
        return listToMarkdown(node, "ol", depth) + "\n";

      case "li": {
        // Handled by listToMarkdown
        return inlineChildrenToMd(node);
      }

      case "hr":
        return "---\n\n";

      case "table":
        return tableToMarkdown(node) + "\n\n";

      case "input": {
        if (node.type === "checkbox") {
          return node.checked ? "[x] " : "[ ] ";
        }
        return "";
      }

      case "details": {
        var summary = node.querySelector("summary");
        var summaryText = summary ? summary.textContent.trim() : "Details";
        childMd = "";
        for (var c = 0; c < node.childNodes.length; c++) {
          if (node.childNodes[c] !== summary) {
            childMd += nodeToMarkdown(node.childNodes[c], depth);
          }
        }
        return "<details>\n<summary>" + summaryText + "</summary>\n\n" + childMd.trim() + "\n</details>\n\n";
      }

      case "div":
      case "section":
      case "article":
      case "main":
      case "aside":
      case "header":
      case "footer":
      case "nav":
        // Generic containers: process children
        for (var j = 0; j < node.childNodes.length; j++) {
          childMd += nodeToMarkdown(node.childNodes[j], depth);
        }
        return childMd;

      case "span": {
        return inlineChildrenToMd(node);
      }

      default:
        // Fallback: return text content
        return innerText;
    }
  }

  function inlineChildrenToMd(node) {
    var result = "";
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent || "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        result += nodeToMarkdown(child, 0);
      }
    }
    return result;
  }

  function blockChildrenToMd(node) {
    var result = "";
    for (var i = 0; i < node.childNodes.length; i++) {
      result += nodeToMarkdown(node.childNodes[i], 0);
    }
    return result.trim();
  }

  function listToMarkdown(listNode, type, depth) {
    var result = "";
    var items = listNode.children;
    var indent = "  ".repeat(depth);

    for (var i = 0; i < items.length; i++) {
      var li = items[i];
      if (li.tagName.toLowerCase() !== "li") continue;

      var prefix;
      if (type === "ol") {
        prefix = (i + 1) + ". ";
      } else {
        // Check for task list item
        var checkbox = li.querySelector("input[type='checkbox']");
        if (checkbox) {
          prefix = checkbox.checked ? "- [x] " : "- [ ] ";
        } else {
          prefix = "- ";
        }
      }

      // Get text content (excluding nested lists)
      var textContent = "";
      var nestedList = "";

      for (var j = 0; j < li.childNodes.length; j++) {
        var child = li.childNodes[j];
        if (child.nodeType === Node.ELEMENT_NODE) {
          var childTag = child.tagName.toLowerCase();
          if (childTag === "ul" || childTag === "ol") {
            nestedList += listToMarkdown(child, childTag, depth + 1);
          } else if (childTag === "input" && child.type === "checkbox") {
            // Skip, already handled by prefix
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
    var rows = tableNode.querySelectorAll("tr");
    if (rows.length === 0) return "";

    var result = "";
    var colCount = 0;

    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll("th, td");
      if (i === 0) colCount = cells.length;

      var row = "|";
      for (var j = 0; j < cells.length; j++) {
        row += " " + (cells[j].textContent || "").trim() + " |";
      }
      result += row + "\n";

      // Add separator after header row
      if (i === 0) {
        var sep = "|";
        for (var k = 0; k < colCount; k++) {
          sep += " --- |";
        }
        result += sep + "\n";
      }
    }

    return result;
  }

  // ─── Helper Functions ───

  function findBlockParent(node) {
    var blockTags = [
      "P", "H1", "H2", "H3", "H4", "H5", "H6",
      "LI", "BLOCKQUOTE", "PRE", "DIV", "TABLE",
      "UL", "OL", "HR", "DETAILS",
    ];

    var current = node;
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

  function triggerEditDebounce() {
    if (editDebounceTimer) {
      clearTimeout(editDebounceTimer);
    }
    editDebounceTimer = setTimeout(function () {
      var markdown = htmlToMarkdown(content);
      if (markdown !== currentMarkdown) {
        currentMarkdown = markdown;
        vscode.postMessage({ type: "edit", markdown: markdown });
      }
    }, 500);
  }

  function getCaretCharacterOffset(element) {
    var caretOffset = 0;
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      var preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
  }

  function restoreCaretPosition(element, offset) {
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    var currentOffset = 0;
    var node;

    while ((node = walker.nextNode())) {
      var nodeLen = (node.textContent || "").length;
      if (currentOffset + nodeLen >= offset) {
        var sel = window.getSelection();
        if (sel) {
          var range = document.createRange();
          range.setStart(node, Math.min(offset - currentOffset, nodeLen));
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return;
      }
      currentOffset += nodeLen;
    }
  }

  function setSyncStatusDisplay(status) {
    syncStatus.className = status;
    switch (status) {
      case "synced":
        syncStatus.textContent = "Synced";
        break;
      case "syncing":
        syncStatus.textContent = "Syncing...";
        break;
      case "conflict":
        syncStatus.textContent = "Conflict";
        break;
      case "error":
        syncStatus.textContent = "Sync Error";
        break;
      default:
        syncStatus.textContent = "Ready";
        syncStatus.className = "";
    }
  }

  // ─── Initialize ───

  // Preserve VS Code state
  var state = vscode.getState();
  if (state && state.markdown) {
    currentMarkdown = state.markdown;
  }

  // Save state periodically
  setInterval(function () {
    vscode.setState({ markdown: currentMarkdown });
  }, 5000);

})();
