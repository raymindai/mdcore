/* =========================================================
   mdfy Desktop Editor — Local WASM Rendering
   Adapted from VS Code extension preview.js for Electron
   ========================================================= */

(function () {
  "use strict";

  /** @type {HTMLElement} */
  var content = document.getElementById("content");
  /** @type {HTMLElement} */
  var syncStatus = document.getElementById("sync-status");
  /** @type {HTMLElement} */
  var toolbar = document.getElementById("toolbar");
  /** @type {HTMLElement} */
  var fileInfo = document.getElementById("file-info");

  // Current state
  var currentMarkdown = "";
  var currentFlavor = "gfm";
  var currentFilePath = null;
  /** @type {number | null} */
  var editDebounceTimer = null;
  var autoSaveTimer = null;
  var isDirty = false;
  var isRendering = false;

  /** @type {HTMLElement} */
  var flavorBadge = document.getElementById("flavor-badge");
  /** @type {HTMLElement} */
  var flavorDropdown = document.getElementById("flavor-dropdown");
  /** @type {HTMLElement | null} */
  var tableContextMenu = null;

  // ─── Rich Tooltips ───

  (function initRichTooltips() {
    var tipEl = document.createElement("div");
    tipEl.className = "toolbar-rich-tip";
    document.body.appendChild(tipEl);
    var hideTimer;
    document.addEventListener("mouseover", function(e) {
      var btn = e.target.closest("[data-tip]");
      if (!btn) { tipEl.classList.remove("show"); return; }
      clearTimeout(hideTimer);
      var tip = btn.getAttribute("data-tip");
      var preview = btn.getAttribute("data-preview");
      tipEl.innerHTML = '<div class="tip-label">' + (tip || "") + '</div>' + (preview ? '<div class="tip-preview">' + preview + '</div>' : '');
      tipEl.classList.add("show");
      var r = btn.getBoundingClientRect();
      tipEl.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 210)) + "px";
      tipEl.style.top = (r.bottom + 6) + "px";
    });
    document.addEventListener("mouseout", function(e) {
      if (e.target.closest("[data-tip]")) {
        hideTimer = setTimeout(function() { tipEl.classList.remove("show"); }, 100);
      }
    });
  })();

  // ─── Home Logo Click ───

  var homeLogo = document.getElementById("home-logo");
  if (homeLogo) {
    homeLogo.addEventListener("click", function(e) {
      e.preventDefault();
      if (window.mdfyDesktop && window.mdfyDesktop.goHome) {
        window.mdfyDesktop.goHome();
      }
    });
  }

  // ─── Document Loading ───

  if (window.mdfyDesktop && window.mdfyDesktop.onLoadDocument) {
    window.mdfyDesktop.onLoadDocument(function(data) {
      currentMarkdown = data.markdown || "";
      currentFilePath = data.filePath || null;

      if (data.html) {
        content.innerHTML = data.html;
        postProcessAll(content);
      }

      if (data.flavor) {
        currentFlavor = data.flavor;
        updateFlavorBadge(currentFlavor);
      }

      if (fileInfo && currentFilePath) {
        var parts = currentFilePath.split("/");
        fileInfo.textContent = parts[parts.length - 1];
      }

      // Sync source editor if open
      if (cmEditor) {
        cmEditor.setValue(currentMarkdown);
      }

      setSyncStatusDisplay("ready");
    });
  }

  // ─── File Changed (external modification) ───

  if (window.mdfyDesktop && window.mdfyDesktop.onFileChanged) {
    window.mdfyDesktop.onFileChanged(function(data) {
      if (data.markdown !== undefined && data.markdown !== currentMarkdown) {
        currentMarkdown = data.markdown;
        if (data.html) {
          var caretOffset = getCaretCharacterOffset(content);
          content.innerHTML = data.html;
          postProcessAll(content);
          if (caretOffset > 0) restoreCaretPosition(content, caretOffset);
        }
        if (cmEditor && cmEditor.getValue() !== currentMarkdown) {
          var cursor = cmEditor.getCursor();
          cmEditor.setValue(currentMarkdown);
          cmEditor.setCursor(cursor);
        }
      }
    });
  }

  // ─── Post-Processing ───

  function postProcessAll(root) {
    // Syntax highlighting
    root.querySelectorAll('pre[lang] code').forEach(function(block) {
      var lang = block.parentElement.getAttribute('lang');
      if (lang && lang !== 'mermaid') {
        block.className = 'language-' + lang;
      }
    });
    root.querySelectorAll('pre code').forEach(function(block) {
      if (typeof hljs !== 'undefined') hljs.highlightElement(block);
    });

    // KaTeX math
    root.querySelectorAll('[data-math-style]').forEach(function(el) {
      if (typeof katex !== 'undefined') {
        try {
          katex.render(el.textContent || '', el, {
            displayMode: el.getAttribute('data-math-style') === 'display',
            throwOnError: false
          });
        } catch(e) {}
      }
    });

    // Code block headers
    postProcessCodeBlocks(root);

    // Mermaid diagrams
    postProcessMermaid();

    // Non-editable islands
    setupNonEditableIslands(root);
  }

  // ─── Re-render via WASM (through main process) ───

  async function reRenderMarkdown(markdown) {
    if (isRendering || !window.mdfyDesktop) return;
    isRendering = true;
    try {
      var result = await window.mdfyDesktop.renderMarkdown(markdown);
      if (result && result.html !== undefined) {
        var caretOffset = getCaretCharacterOffset(content);
        content.innerHTML = result.html;
        postProcessAll(content);
        if (caretOffset > 0) restoreCaretPosition(content, caretOffset);

        if (result.flavor && result.flavor.primary) {
          currentFlavor = result.flavor.primary;
          updateFlavorBadge(currentFlavor);
        }
      }
    } catch (err) {
      console.error("Render error:", err);
    } finally {
      isRendering = false;
    }
  }

  // ─── WYSIWYG Editing ───

  content.addEventListener("input", function () {
    if (editDebounceTimer) {
      clearTimeout(editDebounceTimer);
    }
    editDebounceTimer = setTimeout(function () {
      var markdown = htmlToMarkdown(content);
      if (markdown !== currentMarkdown) {
        currentMarkdown = markdown;
        isDirty = true;
        setSyncStatusDisplay("editing");
        // Re-render to get proper formatting
        reRenderMarkdown(markdown);
      }
    }, 300);
  });

  // Keyboard shortcuts
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
        case "s":
          e.preventDefault();
          // Trigger immediate save
          if (window.mdfyDesktop) {
            window.mdfyDesktop.autoSave(currentMarkdown);
            isDirty = false;
            setSyncStatusDisplay("synced");
          }
          break;
      }
    }
  });

  // ─── Auto-save (every 3 seconds if dirty) ───

  setInterval(function() {
    if (isDirty && currentMarkdown && window.mdfyDesktop) {
      window.mdfyDesktop.autoSave(currentMarkdown);
      isDirty = false;
      setSyncStatusDisplay("synced");
    }
  }, 3000);

  // ─── Toolbar Handling ───

  toolbar.addEventListener("click", function (e) {
    var button = e.target.closest("button");
    if (!button) return;

    var action = button.getAttribute("data-action");
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
      case "h1": applyBlockFormat("h1"); break;
      case "h2": applyBlockFormat("h2"); break;
      case "h3": applyBlockFormat("h3"); break;
      case "h4": applyBlockFormat("h4"); break;
      case "h5": applyBlockFormat("h5"); break;
      case "h6": applyBlockFormat("h6"); break;
      case "p": applyBlockFormat("p"); break;
      case "ul": applyBlockFormat("ul"); break;
      case "ol": applyBlockFormat("ol"); break;
      case "task": applyBlockFormat("task"); break;
      case "indent": applyIndent(); break;
      case "outdent": applyOutdent(); break;
      case "link": insertLink(); break;
      case "image": insertImagePrompt(); break;
      case "table": showTableGridSelector(button); break;
      case "code": applyInlineFormat("code"); break;
      case "codeblock": insertCodeBlock(); break;
      case "blockquote": applyBlockFormat("blockquote"); break;
      case "hr": insertHorizontalRule(); break;
      case "removeFormat": removeFormatting(); break;
    }
  });

  // ─── Toggle Pill Buttons ───

  var isNarrow = true;
  var isToolbarVisible = true;
  var narrowToggle = document.getElementById('narrow-toggle');
  var toolbarToggle = document.getElementById('toolbar-toggle');

  function setupTogglePill(btn, onToggle) {
    if (!btn) return;
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var active = btn.getAttribute('data-active') === 'true';
      var newState = !active;
      btn.setAttribute('data-active', String(newState));
      var sw = btn.querySelector('.toggle-switch');
      if (sw) sw.classList.toggle('on', newState);
      onToggle(newState);
    });
  }

  setupTogglePill(narrowToggle, function(on) {
    isNarrow = on;
    content.classList.toggle('narrow', on);
  });

  setupTogglePill(toolbarToggle, function(on) {
    isToolbarVisible = on;
    toolbar.style.display = on ? '' : 'none';
    var wrapper = document.getElementById('editor-wrapper');
    if (wrapper) wrapper.style.top = on ? '34px' : '0';
  });

  // ─── View Mode Switcher ───

  var sourceVisible = false;
  var sourceEditor = document.getElementById("source-editor");
  var editorWrapper = document.getElementById("editor-wrapper");
  var sourceView = document.getElementById("source-view");
  var sourceEditorContainer = document.getElementById("source-editor-container");
  var sourceDebounce = null;
  var cmEditor = null;

  function initCodeMirror() {
    if (cmEditor || typeof CodeMirror === 'undefined') return;
    cmEditor = CodeMirror(sourceEditorContainer, {
      value: currentMarkdown,
      mode: 'gfm',
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      autofocus: true,
      viewportMargin: Infinity,
      extraKeys: {
        'Tab': function(cm) { cm.replaceSelection('  ', 'end'); },
        'Cmd-S': function() {
          if (window.mdfyDesktop) {
            window.mdfyDesktop.autoSave(currentMarkdown);
            isDirty = false;
            setSyncStatusDisplay("synced");
          }
        }
      }
    });

    cmEditor.on('change', function() {
      currentMarkdown = cmEditor.getValue();
      isDirty = true;
      setSyncStatusDisplay("editing");
      if (sourceDebounce) clearTimeout(sourceDebounce);
      sourceDebounce = setTimeout(function() {
        reRenderMarkdown(currentMarkdown);
      }, 500);
    });
  }

  function setViewMode(mode) {
    sourceVisible = (mode === 'source' || mode === 'split');
    document.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === mode);
    });
    if (mode === 'split') {
      content.classList.remove("hidden");
      sourceView.classList.remove("hidden");
      content.style.width = "50%";
      content.style.display = "block";
      content.style.overflow = "auto";
      sourceView.style.width = "50%";
      sourceView.style.display = "block";
      var wrapper = content.parentElement;
      if (wrapper) {
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "row";
      }
      if (!cmEditor) {
        initCodeMirror();
      } else {
        cmEditor.setValue(currentMarkdown);
      }
      if (cmEditor) setTimeout(function() { cmEditor.refresh(); }, 50);
    } else if (mode === 'source') {
      content.classList.add("hidden");
      content.style.width = "";
      content.style.display = "";
      content.style.overflow = "";
      sourceView.classList.remove("hidden");
      sourceView.style.width = "";
      sourceView.style.display = "";
      var wrapper2 = content.parentElement;
      if (wrapper2) { wrapper2.style.display = ""; wrapper2.style.flexDirection = ""; }
      if (!cmEditor) {
        initCodeMirror();
      } else {
        cmEditor.setValue(currentMarkdown);
      }
      if (cmEditor) cmEditor.focus();
    } else {
      // Live
      sourceView.classList.add("hidden");
      sourceView.style.width = "";
      sourceView.style.display = "";
      content.classList.remove("hidden");
      content.style.width = "";
      content.style.display = "";
      content.style.overflow = "";
      var wrapper3 = content.parentElement;
      if (wrapper3) { wrapper3.style.display = ""; wrapper3.style.flexDirection = ""; }
      content.focus();
    }
  }

  // View button clicks
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.view-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    setViewMode(btn.getAttribute('data-view'));
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
      case "bold": wrapper = document.createElement("strong"); break;
      case "italic": wrapper = document.createElement("em"); break;
      case "strikethrough": wrapper = document.createElement("del"); break;
      case "code": wrapper = document.createElement("code"); break;
      default: return;
    }

    var parentTag = range.commonAncestorContainer.parentElement;
    if (parentTag && parentTag.tagName === wrapper.tagName && parentTag !== content) {
      var textNode = document.createTextNode(parentTag.textContent || "");
      parentTag.parentNode.replaceChild(textNode, parentTag);
    } else {
      range.surroundContents(wrapper);
    }

    triggerEditDebounce();
  }

  function applyBlockFormat(format) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var blockNode = findBlockParent(range.startContainer);
    if (!blockNode || blockNode === content) return;

    var newNode;
    switch (format) {
      case "h1": newNode = document.createElement("h1"); newNode.textContent = blockNode.textContent; break;
      case "h2": newNode = document.createElement("h2"); newNode.textContent = blockNode.textContent; break;
      case "h3": newNode = document.createElement("h3"); newNode.textContent = blockNode.textContent; break;
      case "h4": newNode = document.createElement("h4"); newNode.textContent = blockNode.textContent; break;
      case "h5": newNode = document.createElement("h5"); newNode.textContent = blockNode.textContent; break;
      case "h6": newNode = document.createElement("h6"); newNode.textContent = blockNode.textContent; break;
      case "p": newNode = document.createElement("p"); newNode.textContent = blockNode.textContent; break;
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
      default: return;
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
    sel.selectAllChildren(link);
    triggerEditDebounce();
  }

  function insertImagePrompt() {
    var url = prompt("Image URL:");
    if (!url) return;
    var alt = prompt("Alt text:", "image") || "image";
    insertImageElement(url, alt);
  }

  function insertImageElement(url, alt) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      var img = document.createElement("img");
      img.src = url;
      img.alt = alt || "image";
      var p2 = document.createElement("p");
      p2.appendChild(img);
      content.appendChild(p2);
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

  function insertTable(cols, rows) {
    cols = cols || 3;
    rows = rows || 2;

    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var blockNode = findBlockParent(range.startContainer);

    var table = document.createElement("table");
    var thead = document.createElement("thead");
    var headerRow = document.createElement("tr");
    for (var h = 0; h < cols; h++) {
      var th = document.createElement("th");
      th.textContent = "Header " + (h + 1);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    for (var r = 0; r < rows; r++) {
      var row = document.createElement("tr");
      for (var c = 0; c < cols; c++) {
        var td = document.createElement("td");
        td.textContent = "";
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

  // ─── Table Grid Selector ───

  var activeGridSelector = null;

  function showTableGridSelector(button) {
    hideTableGridSelector();

    var rect = button.getBoundingClientRect();
    var grid = document.createElement('div');
    grid.className = 'table-grid-selector';
    grid.style.left = rect.left + 'px';
    grid.style.top = (rect.bottom + 4) + 'px';

    var label = document.createElement('div');
    label.className = 'grid-label';
    label.textContent = 'Select size';
    grid.appendChild(label);

    var gridContainer = document.createElement('div');
    gridContainer.className = 'grid-cells';

    var maxCols = 6, maxRows = 5;
    for (var r = 0; r < maxRows; r++) {
      for (var c = 0; c < maxCols; c++) {
        var cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.setAttribute('data-row', String(r));
        cell.setAttribute('data-col', String(c));
        gridContainer.appendChild(cell);
      }
    }

    grid.appendChild(gridContainer);

    gridContainer.addEventListener('mouseover', function(e) {
      var cell2 = e.target.closest('.grid-cell');
      if (!cell2) return;
      var hoverRow = parseInt(cell2.getAttribute('data-row'));
      var hoverCol = parseInt(cell2.getAttribute('data-col'));
      label.textContent = (hoverCol + 1) + ' x ' + (hoverRow + 1);
      gridContainer.querySelectorAll('.grid-cell').forEach(function(c2) {
        var cr = parseInt(c2.getAttribute('data-row'));
        var cc = parseInt(c2.getAttribute('data-col'));
        c2.classList.toggle('active', cr <= hoverRow && cc <= hoverCol);
      });
    });

    gridContainer.addEventListener('click', function(e) {
      var cell3 = e.target.closest('.grid-cell');
      if (!cell3) return;
      var selRow = parseInt(cell3.getAttribute('data-row')) + 1;
      var selCol = parseInt(cell3.getAttribute('data-col')) + 1;
      hideTableGridSelector();
      content.focus();
      insertTable(selCol, selRow);
    });

    document.body.appendChild(grid);
    activeGridSelector = grid;

    setTimeout(function() {
      document.addEventListener('click', hideTableGridSelector, { once: true });
    }, 0);
  }

  function hideTableGridSelector() {
    if (activeGridSelector) {
      activeGridSelector.remove();
      activeGridSelector = null;
    }
  }

  function applyIndent() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var li = findParentByTag(range.startContainer, "LI");
    if (!li) return;

    var prevLi = li.previousElementSibling;
    if (!prevLi || prevLi.tagName !== "LI") return;

    var parentList = li.parentNode;
    var listTag = parentList.tagName.toLowerCase();
    var nestedList = prevLi.querySelector(listTag);
    if (!nestedList) {
      nestedList = document.createElement(listTag);
      prevLi.appendChild(nestedList);
    }

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

    outerList.insertBefore(li, grandparentLi.nextSibling);

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

    range.deleteContents();
    var textNode = document.createTextNode(text);
    range.insertNode(textNode);
    sel.collapseToEnd();
    triggerEditDebounce();
  }

  // ─── Paste Support ───

  content.addEventListener("paste", function (e) {
    var clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for HTML paste
    var htmlData = clipboardData.getData('text/html');
    var plainText = clipboardData.getData('text/plain');
    if (htmlData && htmlData.trim()) {
      var hasRichContent = /<(h[1-6]|p|ul|ol|li|table|tr|td|th|blockquote|pre|code|a|strong|em|b|i|img)\b/i.test(htmlData);
      if (hasRichContent) {
        e.preventDefault();
        var temp = document.createElement('div');
        temp.innerHTML = htmlData;
        temp.querySelectorAll('style, script, meta, link').forEach(function(el) { el.remove(); });
        var md = htmlToMarkdown(temp);
        document.execCommand("insertText", false, md.trim());
        triggerEditDebounce();
        return;
      }
    }
  });

  // ─── Drop Support ───

  content.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  content.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (var i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        e.preventDefault();
        var file = files[i];
        // For desktop, just use the local file path
        var reader = new FileReader();
        reader.onload = function(ev) {
          insertImageElement(ev.target.result, file.name);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  });

  // ─── HTML to Markdown Conversion ───

  function htmlToMarkdown(root) {
    var result = "";
    var children = root.childNodes;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === 1 && child.classList && child.classList.contains('ce-spacer')) continue;
      if (child.nodeType === 1 && child.classList && (
        child.classList.contains('code-header') ||
        child.classList.contains('mermaid-edit-btn')
      )) continue;
      result += nodeToMarkdown(child, 0);
    }

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
      case "h1": return "# " + innerText.trim() + "\n\n";
      case "h2": return "## " + innerText.trim() + "\n\n";
      case "h3": return "### " + innerText.trim() + "\n\n";
      case "h4": return "#### " + innerText.trim() + "\n\n";
      case "h5": return "##### " + innerText.trim() + "\n\n";
      case "h6": return "###### " + innerText.trim() + "\n\n";

      case "p": return inlineChildrenToMd(node) + "\n\n";
      case "br": return "\n";

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
        if (node.parentElement && node.parentElement.tagName.toLowerCase() === "pre") {
          return innerText;
        }
        return "`" + innerText.replace(/`/g, "\\`") + "`";

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
        return childMd.split("\n").map(function (line) {
          return "> " + line;
        }).join("\n") + "\n\n";

      case "ul": return listToMarkdown(node, "ul", depth) + "\n";
      case "ol": return listToMarkdown(node, "ol", depth) + "\n";

      case "li":
        return inlineChildrenToMd(node);

      case "hr": return "---\n\n";
      case "table": return tableToMarkdown(node) + "\n\n";

      case "input":
        if (node.type === "checkbox") {
          return node.checked ? "[x] " : "[ ] ";
        }
        return "";

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
        for (var j = 0; j < node.childNodes.length; j++) {
          childMd += nodeToMarkdown(node.childNodes[j], depth);
        }
        return childMd;

      case "span":
        return inlineChildrenToMd(node);

      default:
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
        var checkbox = li.querySelector("input[type='checkbox']");
        if (checkbox) {
          prefix = checkbox.checked ? "- [x] " : "- [ ] ";
        } else {
          prefix = "- ";
        }
      }

      var textContent = "";
      var nestedList = "";

      for (var j = 0; j < li.childNodes.length; j++) {
        var child = li.childNodes[j];
        if (child.nodeType === Node.ELEMENT_NODE) {
          var childTag = child.tagName.toLowerCase();
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
      if (current.nodeType === Node.ELEMENT_NODE && blockTags.indexOf(current.tagName) !== -1) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
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

  function triggerEditDebounce() {
    if (editDebounceTimer) {
      clearTimeout(editDebounceTimer);
    }
    editDebounceTimer = setTimeout(function () {
      var markdown = htmlToMarkdown(content);
      if (markdown !== currentMarkdown) {
        currentMarkdown = markdown;
        isDirty = true;
        setSyncStatusDisplay("editing");
        reRenderMarkdown(markdown);
      }
    }, 300);
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
    if (!syncStatus) return;
    syncStatus.className = status;
    switch (status) {
      case "synced": syncStatus.textContent = "Saved"; break;
      case "syncing": syncStatus.textContent = "Saving..."; break;
      case "editing": syncStatus.textContent = "Editing"; break;
      case "error": syncStatus.textContent = "Error"; break;
      default: syncStatus.textContent = "Ready"; syncStatus.className = "";
    }
  }

  // ─── Non-Editable Islands + Spacers ───

  function setupNonEditableIslands(root) {
    var nonEditableSelectors = 'pre, .mermaid, table, img, .katex-display';
    root.querySelectorAll(nonEditableSelectors).forEach(function(el) {
      if (el.closest('[contenteditable="false"]') && el.closest('[contenteditable="false"]') !== el) return;
      el.setAttribute('contenteditable', 'false');
    });

    root.querySelectorAll(nonEditableSelectors).forEach(function(el) {
      var parent = el.parentNode;
      if (el.tagName === 'IMG' && parent && parent.tagName === 'P') return;

      var prev = el.previousElementSibling;
      if (!prev || !prev.classList.contains('ce-spacer')) {
        var spacerBefore = document.createElement('p');
        spacerBefore.className = 'ce-spacer';
        spacerBefore.innerHTML = '<br>';
        spacerBefore.setAttribute('contenteditable', 'true');
        parent.insertBefore(spacerBefore, el);
      }

      var next = el.nextElementSibling;
      if (!next || !next.classList.contains('ce-spacer')) {
        var spacerAfter = document.createElement('p');
        spacerAfter.className = 'ce-spacer';
        spacerAfter.innerHTML = '<br>';
        spacerAfter.setAttribute('contenteditable', 'true');
        if (el.nextSibling) {
          parent.insertBefore(spacerAfter, el.nextSibling);
        } else {
          parent.appendChild(spacerAfter);
        }
      }
    });

    try {
      document.execCommand('enableObjectResizing', false, 'false');
      document.execCommand('enableInlineTableEditing', false, 'false');
    } catch(e) {}
  }

  // ─── Code Block Headers ───

  function postProcessCodeBlocks(root) {
    root.querySelectorAll('pre[lang]').forEach(function(pre) {
      if (pre.querySelector('.code-header')) return;
      var lang = pre.getAttribute('lang');
      if (lang === 'mermaid') return;

      var header = document.createElement('div');
      header.className = 'code-header';

      var langLabel = document.createElement('span');
      langLabel.className = 'code-lang';
      langLabel.textContent = lang;
      header.appendChild(langLabel);

      var copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="8" height="8" rx="1.5"/><path d="M6 10H4.5A1.5 1.5 0 013 8.5v-5A1.5 1.5 0 014.5 2h5A1.5 1.5 0 0111 3.5V6"/></svg> Copy';
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var code = pre.querySelector('code');
        var text = code ? code.textContent : pre.textContent;
        navigator.clipboard.writeText(text || '').then(function() {
          copyBtn.innerHTML = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="8" height="8" rx="1.5"/><path d="M6 10H4.5A1.5 1.5 0 013 8.5v-5A1.5 1.5 0 014.5 2h5A1.5 1.5 0 0111 3.5V6"/></svg> Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
      header.appendChild(copyBtn);

      pre.insertBefore(header, pre.firstChild);
    });
  }

  // ─── Mermaid ───

  function postProcessMermaid() {
    if (typeof mermaid === 'undefined') return;

    content.querySelectorAll('pre[lang="mermaid"] code, code.language-mermaid').forEach(function(el) {
      var container = document.createElement('div');
      container.className = 'mermaid';
      var originalCode = el.textContent || '';
      container.setAttribute('data-original-code', originalCode);
      container.textContent = originalCode;
      var pre = el.closest('pre');
      if (pre) pre.replaceWith(container);
    });

    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    mermaid.run().catch(function() {});
  }

  // ─── Floating Selection Toolbar ───

  var selToolbar = document.getElementById('selection-toolbar');

  function showSelectionToolbar() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      hideSelectionToolbar();
      return;
    }

    var text = sel.toString().trim();
    if (!text || text.length < 1) {
      hideSelectionToolbar();
      return;
    }

    var range = sel.getRangeAt(0);
    if (!content.contains(range.commonAncestorContainer)) {
      hideSelectionToolbar();
      return;
    }

    var ancestor = range.commonAncestorContainer;
    var node = ancestor.nodeType === 3 ? ancestor.parentElement : ancestor;
    if (node && (node.closest('pre') || node.closest('.mermaid') || node.closest('.katex-display'))) {
      hideSelectionToolbar();
      return;
    }

    var rect = range.getBoundingClientRect();
    if (!selToolbar) return;

    selToolbar.classList.add('visible');
    var tbRect = selToolbar.getBoundingClientRect();
    var left = rect.left + (rect.width / 2) - (tbRect.width / 2);
    var top = rect.top - tbRect.height - 8;

    if (left < 8) left = 8;
    if (left + tbRect.width > window.innerWidth - 8) left = window.innerWidth - tbRect.width - 8;
    if (top < 8) top = rect.bottom + 8;

    selToolbar.style.left = left + 'px';
    selToolbar.style.top = top + 'px';
  }

  function hideSelectionToolbar() {
    if (selToolbar) selToolbar.classList.remove('visible');
  }

  document.addEventListener('selectionchange', function() {
    showSelectionToolbar();
  });

  if (selToolbar) {
    selToolbar.addEventListener('mousedown', function(e) {
      e.preventDefault();
    });

    selToolbar.addEventListener('click', function(e) {
      var button = e.target.closest('button');
      if (!button) return;
      var action = button.getAttribute('data-action');
      if (!action) return;
      e.preventDefault();

      switch (action) {
        case 'undo': document.execCommand('undo', false, null); triggerEditDebounce(); break;
        case 'redo': document.execCommand('redo', false, null); triggerEditDebounce(); break;
        case 'bold': applyInlineFormat('bold'); break;
        case 'italic': applyInlineFormat('italic'); break;
        case 'strikethrough': applyInlineFormat('strikethrough'); break;
        case 'code': applyInlineFormat('code'); break;
        case 'h1': applyBlockFormat('h1'); break;
        case 'h2': applyBlockFormat('h2'); break;
        case 'h3': applyBlockFormat('h3'); break;
        case 'h4': applyBlockFormat('h4'); break;
        case 'h5': applyBlockFormat('h5'); break;
        case 'h6': applyBlockFormat('h6'); break;
        case 'p': applyBlockFormat('p'); break;
        case 'ul': applyBlockFormat('ul'); break;
        case 'ol': applyBlockFormat('ol'); break;
        case 'indent': applyIndent(); break;
        case 'outdent': applyOutdent(); break;
        case 'blockquote': applyBlockFormat('blockquote'); break;
        case 'hr': insertHorizontalRule(); break;
        case 'link': insertLink(); break;
        case 'image': insertImagePrompt(); break;
        case 'table': showTableGridSelector(e.target.closest('button')); break;
        case 'removeFormat': removeFormatting(); break;
      }
      hideSelectionToolbar();
    });
  }

  // ─── Table Inline Editing (double-click) ───

  content.addEventListener('dblclick', function(e) {
    var td = e.target.closest('td, th');
    if (!td) return;
    if (td.getAttribute('contenteditable') === 'true') return;

    e.stopPropagation();
    td.setAttribute('contenteditable', 'true');
    td.classList.add('table-cell-editing');
    td.focus();

    var range = document.createRange();
    range.selectNodeContents(td);
    var sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    td.addEventListener('blur', function onBlur() {
      td.removeAttribute('contenteditable');
      td.classList.remove('table-cell-editing');
      td.removeEventListener('blur', onBlur);
      triggerEditDebounce();
    });

    td.addEventListener('keydown', function onKey(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); td.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); td.blur(); }
      if (ev.key === 'Tab') {
        ev.preventDefault();
        td.blur();
        var next = ev.shiftKey ? td.previousElementSibling : td.nextElementSibling;
        if (next && (next.tagName === 'TD' || next.tagName === 'TH')) {
          next.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        }
      }
    });
  });

  // ─── Table Context Menu ───

  content.addEventListener('contextmenu', function(e) {
    var td = e.target.closest('td, th');
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

    var menu = document.createElement('div');
    menu.id = 'table-context-menu';
    menu.className = 'table-context-menu';

    var items = [
      { label: 'Add Row Above', action: 'addRowAbove' },
      { label: 'Add Row Below', action: 'addRowBelow' },
      { label: 'Add Column Left', action: 'addColLeft' },
      { label: 'Add Column Right', action: 'addColRight' },
      { label: '---' },
      { label: 'Delete Row', action: 'deleteRow' },
      { label: 'Delete Column', action: 'deleteCol' },
    ];

    items.forEach(function(item) {
      if (item.label === '---') {
        var sep = document.createElement('div');
        sep.className = 'table-ctx-separator';
        menu.appendChild(sep);
        return;
      }

      var btn = document.createElement('button');
      btn.className = 'table-ctx-item';
      btn.textContent = item.label;
      btn.addEventListener('click', function(e2) {
        e2.stopPropagation();
        handleTableAction(item.action, td);
        hideTableContextMenu();
      });
      menu.appendChild(btn);
    });

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);
    tableContextMenu = menu;

    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (y - rect.height) + 'px';
    }

    setTimeout(function() {
      document.addEventListener('click', hideTableContextMenu, { once: true });
    }, 0);
  }

  function hideTableContextMenu() {
    if (tableContextMenu) {
      tableContextMenu.remove();
      tableContextMenu = null;
    }
  }

  function handleTableAction(action, td) {
    var tr = td.closest('tr');
    var table = td.closest('table');
    if (!tr || !table) return;

    var cellIndex = Array.prototype.indexOf.call(tr.children, td);
    var allRows = table.querySelectorAll('tr');
    var colCount = allRows.length > 0 ? allRows[0].children.length : 0;

    switch (action) {
      case 'addRowAbove':
      case 'addRowBelow': {
        var newRow = document.createElement('tr');
        for (var c = 0; c < colCount; c++) {
          var newTd = document.createElement('td');
          newTd.textContent = '';
          newRow.appendChild(newTd);
        }
        if (action === 'addRowAbove') {
          tr.parentNode.insertBefore(newRow, tr);
        } else {
          tr.parentNode.insertBefore(newRow, tr.nextSibling);
        }
        break;
      }
      case 'addColLeft':
      case 'addColRight': {
        allRows.forEach(function(row) {
          var isHeader = row.children[0] && row.children[0].tagName === 'TH';
          var newCell = document.createElement(isHeader ? 'th' : 'td');
          newCell.textContent = isHeader ? 'Header' : '';
          var refCell = row.children[cellIndex];
          if (action === 'addColLeft' && refCell) {
            row.insertBefore(newCell, refCell);
          } else if (refCell) {
            row.insertBefore(newCell, refCell.nextSibling);
          } else {
            row.appendChild(newCell);
          }
        });
        break;
      }
      case 'deleteRow': {
        var rowIndex = Array.prototype.indexOf.call(allRows, tr);
        if (rowIndex === 0) return;
        if (allRows.length <= 2) return;
        tr.remove();
        break;
      }
      case 'deleteCol': {
        if (colCount <= 1) return;
        allRows.forEach(function(row) {
          var cell = row.children[cellIndex];
          if (cell) cell.remove();
        });
        break;
      }
    }

    triggerEditDebounce();
  }

  // ─── Code Block Double-Click Editing ───

  content.addEventListener('dblclick', function(e) {
    var pre = e.target.closest('pre[lang]');
    if (!pre) return;
    var lang = pre.getAttribute('lang');
    if (lang === 'mermaid') return;

    var codeEl = pre.querySelector('code');
    if (!codeEl) return;

    e.stopPropagation();
    e.preventDefault();

    // Inline editing for code blocks in desktop (no VS Code available)
    var currentCode = codeEl.textContent || '';
    var newCode = prompt("Edit code (" + lang + "):", currentCode);
    if (newCode !== null && newCode !== currentCode) {
      codeEl.textContent = newCode;
      triggerEditDebounce();
    }
  });

  // ─── Flavor Badge ───

  function updateFlavorBadge(flavor) {
    if (!flavorBadge) return;
    var names = {
      gfm: 'GFM',
      commonmark: 'CommonMark',
      obsidian: 'Obsidian',
      mdx: 'MDX',
      pandoc: 'Pandoc'
    };
    flavorBadge.textContent = (names[flavor] || flavor.toUpperCase()) + ' \u25BE';

    if (flavorDropdown) {
      flavorDropdown.querySelectorAll('.flavor-option').forEach(function(opt) {
        if (opt.getAttribute('data-flavor') === flavor) {
          opt.style.display = 'none';
        } else {
          opt.style.display = '';
        }
      });
    }
  }

  if (flavorBadge) {
    flavorBadge.addEventListener('click', function(e) {
      e.stopPropagation();
      if (flavorDropdown) {
        flavorDropdown.classList.toggle('hidden');
      }
    });
  }

  document.addEventListener('click', function() {
    if (flavorDropdown) {
      flavorDropdown.classList.add('hidden');
    }
    hideTableContextMenu();
  });

  updateFlavorBadge(currentFlavor);

  // ─── Custom Tooltips ───

  var tooltipEl = null;
  var tooltipTimer = null;

  function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'mdfy-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(target) {
    var text = target.getAttribute('title') || target.getAttribute('data-tooltip');
    if (!text) return;
    if (target.getAttribute('title')) {
      target.setAttribute('data-tooltip', text);
      target.removeAttribute('title');
    }
    createTooltip();
    tooltipEl.textContent = text;
    tooltipEl.classList.add('visible');

    var rect = target.getBoundingClientRect();
    var tipRect = tooltipEl.getBoundingClientRect();
    var left = rect.left + (rect.width / 2) - (tipRect.width / 2);
    var top = rect.top - tipRect.height - 6;

    if (top < 4) top = rect.bottom + 6;
    if (left < 4) left = 4;
    if (left + tipRect.width > window.innerWidth - 4) left = window.innerWidth - tipRect.width - 4;

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

  document.addEventListener('mouseover', function(e) {
    var btn = e.target.closest('button[title], button[data-tooltip]');
    if (btn) {
      if (tooltipTimer) clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(function() { showTooltip(btn); }, 50);
    }
  });

  document.addEventListener('mouseout', function(e) {
    var btn = e.target.closest('button[title], button[data-tooltip]');
    if (btn) {
      if (tooltipTimer) clearTimeout(tooltipTimer);
      hideTooltip();
    }
  });

  document.addEventListener('mousedown', function() {
    hideTooltip();
  });

})();
