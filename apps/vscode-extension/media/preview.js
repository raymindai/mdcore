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

          // Post-process: syntax highlighting
          content.querySelectorAll('pre code').forEach(function(block) {
            if (typeof hljs !== 'undefined') hljs.highlightElement(block);
          });

          // Post-process: KaTeX math
          content.querySelectorAll('[data-math-style]').forEach(function(el) {
            if (typeof katex !== 'undefined') {
              try {
                katex.render(el.textContent || '', el, {
                  displayMode: el.getAttribute('data-math-style') === 'display',
                  throwOnError: false
                });
              } catch(e) {}
            }
          });

          if (hadFocus && caretOffset > 0) {
            restoreCaretPosition(content, caretOffset);
          }
        }
        isUpdatingFromExtension = false;
        break;

      case "syncStatus":
        setSyncStatusDisplay(message.status);
        break;

      case "imageUploaded": {
        // Replace "![Uploading...]()" placeholder with actual URL
        var html = content.innerHTML;
        var placeholder = '![Uploading...]()';
        // The placeholder was inserted as text via execCommand, so it appears as text nodes
        // Walk through and replace first occurrence
        replacePlaceholderText(content, placeholder, '![' + (message.alt || 'image') + '](' + message.url + ')');
        triggerEditDebounce();
        break;
      }

      case "imageUploadFailed": {
        // Replace placeholder with error message
        replacePlaceholderText(content, '![Uploading...]()', '![Upload failed]()');
        triggerEditDebounce();
        break;
      }

      case "insertImage": {
        // Extension is sending an image URL to insert (from toolbar image button)
        if (message.url) {
          insertImageElement(message.url, message.alt || 'image');
        }
        break;
      }
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
      case "undo":
        document.execCommand("undo", false, null);
        triggerEditDebounce();
        break;
      case "redo":
        document.execCommand("redo", false, null);
        triggerEditDebounce();
        break;
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
      case "h4":
        applyBlockFormat("h4");
        break;
      case "h5":
        applyBlockFormat("h5");
        break;
      case "h6":
        applyBlockFormat("h6");
        break;
      case "p":
        applyBlockFormat("p");
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
      case "link":
        insertLink();
        break;
      case "image":
        // Post message to extension to show VS Code input box for image URL
        vscode.postMessage({ type: "requestImageUrl" });
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
      case "blockquote":
        applyBlockFormat("blockquote");
        break;
      case "hr":
        insertHorizontalRule();
        break;
      case "removeFormat":
        removeFormatting();
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
      case "h4":
        newNode = document.createElement("h4");
        newNode.textContent = blockNode.textContent;
        break;
      case "h5":
        newNode = document.createElement("h5");
        newNode.textContent = blockNode.textContent;
        break;
      case "h6":
        newNode = document.createElement("h6");
        newNode.textContent = blockNode.textContent;
        break;
      case "p":
        newNode = document.createElement("p");
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

  function insertTable() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var blockNode = findBlockParent(range.startContainer);

    var table = document.createElement("table");
    var thead = document.createElement("thead");
    var headerRow = document.createElement("tr");
    var th1 = document.createElement("th");
    th1.textContent = "Header 1";
    var th2 = document.createElement("th");
    th2.textContent = "Header 2";
    var th3 = document.createElement("th");
    th3.textContent = "Header 3";
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    headerRow.appendChild(th3);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    for (var r = 0; r < 2; r++) {
      var row = document.createElement("tr");
      for (var c = 0; c < 3; c++) {
        var td = document.createElement("td");
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

  function applyIndent() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var li = findParentByTag(range.startContainer, "LI");
    if (!li) return;

    // Find the previous sibling LI
    var prevLi = li.previousElementSibling;
    if (!prevLi || prevLi.tagName !== "LI") return;

    // Create or find a nested list inside the previous LI
    var parentList = li.parentNode;
    var listTag = parentList.tagName.toLowerCase(); // ul or ol
    var nestedList = prevLi.querySelector(listTag);
    if (!nestedList) {
      nestedList = document.createElement(listTag);
      prevLi.appendChild(nestedList);
    }

    // Move the current LI into the nested list
    nestedList.appendChild(li);

    triggerEditDebounce();
  }

  function applyOutdent() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var li = findParentByTag(range.startContainer, "LI");
    if (!li) return;

    var parentList = li.parentNode;
    if (!parentList) return;

    var grandparentLi = parentList.parentNode;
    if (!grandparentLi || grandparentLi.tagName !== "LI") return;

    var outerList = grandparentLi.parentNode;
    if (!outerList) return;

    // Insert the LI after the grandparent LI in the outer list
    outerList.insertBefore(li, grandparentLi.nextSibling);

    // If the nested list is now empty, remove it
    if (parentList.children.length === 0) {
      parentList.parentNode.removeChild(parentList);
    }

    triggerEditDebounce();
  }

  function removeFormatting() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var text = range.toString();
    if (!text) return;

    // Replace the selection with plain text
    range.deleteContents();
    var textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Place cursor after the text
    sel.collapseToEnd();

    triggerEditDebounce();
  }

  function insertImageElement(url, alt) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      // No selection — append to end
      var img = document.createElement("img");
      img.src = url;
      img.alt = alt || "image";
      var p = document.createElement("p");
      p.appendChild(img);
      content.appendChild(p);
    } else {
      var range = sel.getRangeAt(0);
      var img2 = document.createElement("img");
      img2.src = url;
      img2.alt = alt || "image";
      range.deleteContents();
      range.insertNode(img2);
      sel.collapseToEnd();
    }
    triggerEditDebounce();
  }

  function findParentByTag(node, tagName) {
    var current = node;
    while (current && current !== content) {
      if (current.nodeType === Node.ELEMENT_NODE && current.tagName === tagName) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  // ─── Image Paste Support ───

  content.addEventListener("paste", function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    for (var i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        var file = items[i].getAsFile();
        if (!file) break;
        var reader = new FileReader();
        var fileName = file.name || "image.png";
        reader.onload = function (ev) {
          vscode.postMessage({
            type: "uploadImage",
            data: ev.target.result,
            name: fileName,
          });
        };
        reader.readAsDataURL(file);
        // Insert placeholder
        document.execCommand("insertText", false, "![Uploading...]()");
        break;
      }
    }
  });

  // ─── Image Drop Support ───

  content.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  content.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files) return;

    for (var i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        e.preventDefault();
        var file = files[i];
        var reader = new FileReader();
        var fileName = file.name;
        reader.onload = function (ev) {
          vscode.postMessage({
            type: "uploadImage",
            data: ev.target.result,
            name: fileName,
          });
        };
        reader.readAsDataURL(file);
        // Insert placeholder
        document.execCommand("insertText", false, "![Uploading...]()");
        break;
      }
    }
  });

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

  function replacePlaceholderText(root, placeholder, replacement) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var idx = (node.textContent || "").indexOf(placeholder);
      if (idx !== -1) {
        var text = node.textContent || "";
        node.textContent = text.substring(0, idx) + replacement + text.substring(idx + placeholder.length);
        return true;
      }
    }
    return false;
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
