/* =========================================================
   mdfy Desktop — Electron Shell for mdfy.cc
   Loads the web app directly + adds native file integration
   ========================================================= */

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  shell,
  nativeTheme,
  protocol,
  net,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { mime } = require("./mime-types");

// ─── State ───

let mainWindow = null;
let currentFilePath = null;
let queuedFilePath = null;
let fileWatcher = null;
let lastAutoSaveTime = 0; // Track our own saves to ignore watcher triggers

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MDFY_URL = "https://mdfy.cc";

// ─── Supported File Types ───

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".mdown", ".mkd", ".txt"]);

const ALL_SUPPORTED_EXTENSIONS = new Set([
  ".md", ".markdown", ".mdown", ".mkd",
  ".pdf", ".docx", ".pptx", ".xlsx",
  ".html", ".csv", ".json",
  ".txt",
]);

const FILE_FILTERS = [
  { name: "All Supported", extensions: [
    "md", "markdown", "txt", "pdf", "docx", "pptx", "xlsx",
    "html", "csv", "json",
  ]},
  { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
  { name: "Documents", extensions: ["pdf", "docx", "pptx", "xlsx"] },
  { name: "Web & Data", extensions: ["html", "csv", "json"] },
  { name: "All Files", extensions: ["*"] },
];

// ─── URL Scheme: mdfy:// ───
// Allows QuickLook "Edit in mdfy" to open files in the desktop app

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("mdfy", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("mdfy");
}

// ─── Single Instance ───

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Handle mdfy:// URL from second instance
      const mdfyUrl = argv.find((a) => a.startsWith("mdfy://"));
      if (mdfyUrl) {
        handleMdfyUrl(mdfyUrl);
        return;
      }
      // Open file from argv if it has a supported extension
      const filePath = argv.find((a) => {
        const ext = path.extname(a).toLowerCase();
        return ALL_SUPPORTED_EXTENSIONS.has(ext);
      });
      if (filePath) openFileInApp(filePath);
    }
  });

  // macOS: handle mdfy:// URL when app is already running
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleMdfyUrl(url);
  });
}

function handleMdfyUrl(url) {
  // mdfy://open?file=/path/to/file.md
  // mdfy://doc/abc123
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "open" || parsed.pathname.startsWith("/open")) {
      const filePath = parsed.searchParams.get("file");
      if (filePath && fs.existsSync(filePath)) {
        openFileInApp(filePath);
      }
    } else if (parsed.hostname === "doc" || parsed.pathname.startsWith("/doc")) {
      const docId = parsed.pathname.split("/").pop();
      if (docId && mainWindow) {
        loadMdfyWithTimeout(`${MDFY_URL}/?doc=${docId}`);
      }
    }
  } catch { /* ignore malformed URLs */ }
}

// ─── Connectivity Check ───

function isOnline() {
  return net.isOnline();
}

function loadMdfyOrOffline(url) {
  if (!mainWindow) return;
  loadMdfyWithTimeout(url || MDFY_URL);
}

function loadMdfyWithTimeout(url) {
  if (!mainWindow) return;
  if (!isOnline()) {
    mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
    return;
  }

  const timeout = setTimeout(() => {
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
    }
  }, 10000);

  mainWindow.webContents.once("did-finish-load", () => clearTimeout(timeout));
  mainWindow.webContents.once("did-fail-load", () => {
    clearTimeout(timeout);
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
    }
  });

  mainWindow.loadURL(url);
}

// ─── Create Window ───

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  // Show dashboard by default (no file)
  mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Inject native bridge after any page loads
  mainWindow.webContents.on("did-finish-load", () => {
    const url = mainWindow.webContents.getURL();
    if (url.includes("mdfy.cc")) {
      injectNativeBridge();
      injectHomeButton();
    }
  });

  // Handle new window requests (open in browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    if (!mainWindow) return;
    const url = mainWindow.webContents.getURL();
    // Only prompt when on mdfy.cc editor (not dashboard or offline page)
    if (url.startsWith("https://mdfy.cc") && currentFilePath) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        buttons: ["Close", "Cancel"],
        defaultId: 1,
        title: "Unsaved Changes",
        message: "You may have unsaved changes. Close anyway?",
      });
      if (choice === 1) e.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    stopFileWatcher();
    mainWindow = null;
  });

  // Set window title — handle signals from web app
  mainWindow.webContents.on("page-title-updated", (event, title) => {
    // Home navigation
    if (title === "__MDFY_HOME__") {
      event.preventDefault();
      currentFilePath = null;
      stopFileWatcher();
      // Try to extract user session before leaving mdfy.cc
      extractUserFromWeb().catch(() => {});
      mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));
      mainWindow.setTitle("mdfy");
      return;
    }

    // Auto-save signal (periodic, local file only)
    if (title.startsWith("__MDFY_AUTOSAVE__:")) {
      event.preventDefault();
      try {
        const data = JSON.parse(title.slice("__MDFY_AUTOSAVE__:".length));
        if (currentFilePath && data.markdown) {
          lastAutoSaveTime = Date.now();
          fs.writeFileSync(currentFilePath, data.markdown, "utf8");
        }
      } catch {}
      // Restore title
      if (currentFilePath) {
        mainWindow.setTitle(`${path.basename(currentFilePath)} — mdfy`);
      }
      return;
    }

    // Save signal from Cmd+S
    if (title.startsWith("__MDFY_SAVE__:")) {
      event.preventDefault();
      try {
        const data = JSON.parse(title.slice("__MDFY_SAVE__:".length));
        handleDesktopSave(data.markdown, data.title);
      } catch (err) {
        console.error("[save] Failed to parse save data:", err);
      }
      // Restore the actual title
      if (currentFilePath) {
        mainWindow.setTitle(`${path.basename(currentFilePath)} — mdfy`);
      }
      return;
    }

    // Publish signal
    if (title.startsWith("__MDFY_PUBLISHED__:")) {
      event.preventDefault();
      try {
        const data = JSON.parse(title.slice("__MDFY_PUBLISHED__:".length));
        handleDesktopPublished(data.docId, data.editToken);
      } catch (err) {
        console.error("[publish] Failed to parse publish data:", err);
      }
      return;
    }

    mainWindow.setTitle(title);
  });
}

// ─── Inject Native Bridge ───
// Adds native file capabilities to the web app

function injectNativeBridge() {
  mainWindow.webContents.executeJavaScript(`
    // Mark as desktop app
    window.__MDFY_DESKTOP__ = true;

    // Fix header overlap with macOS traffic lights
    if (!document.getElementById('mdfy-desktop-style')) {
      const style = document.createElement('style');
      style.id = 'mdfy-desktop-style';
      style.textContent = \`
        /* Draggable title bar area */
        body > div > header,
        body > div > div > header,
        [class*="backdrop-blur"] {
          -webkit-app-region: drag;
          padding-left: 80px !important;
        }
        /* Make all interactive elements not draggable */
        button, a, input, select, textarea, [contenteditable],
        [role="button"], svg, span[class*="cursor"] {
          -webkit-app-region: no-drag;
        }
      \`;
      document.head.appendChild(style);
    }

    // Auto-save to local file periodically
    if (!window.__MDFY_LOCAL_AUTOSAVE__) {
      window.__MDFY_LOCAL_AUTOSAVE__ = true;
      var _lastAutoSaved = '';
      setInterval(function() {
        if (typeof window.__MDFY_GET_MARKDOWN__ !== 'function') return;
        var md = window.__MDFY_GET_MARKDOWN__();
        if (md && md !== _lastAutoSaved && md.length > 5) {
          _lastAutoSaved = md;
          document.title = '__MDFY_AUTOSAVE__:' + JSON.stringify({ markdown: md });
        }
      }, 5000);
    }

    // Listen for save/publish messages from the web app
    if (!window.__MDFY_MSG_BOUND__) {
      window.__MDFY_MSG_BOUND__ = true;
      window.addEventListener('message', function(e) {
        if (!e.data || !e.data.type) return;
        if (e.data.type === 'mdfy-desktop-save') {
          // Notify Electron to save the file
          document.title = '__MDFY_SAVE__:' + JSON.stringify({
            markdown: e.data.markdown,
            title: e.data.title
          });
        }
        if (e.data.type === 'mdfy-desktop-published') {
          document.title = '__MDFY_PUBLISHED__:' + JSON.stringify({
            docId: e.data.docId,
            editToken: e.data.editToken
          });
        }
      });
    }
  `);
}

// ─── Inject Home Button ───
// Adds a clickable home button (logo area) when on mdfy.cc

function injectHomeButton() {
  mainWindow.webContents.executeJavaScript(`
    (function() {
      if (window.__MDFY_HOME_BOUND__) return;
      window.__MDFY_HOME_BOUND__ = true;
      var goHome = function() { document.title = '__MDFY_HOME__'; };

      setTimeout(function() {
        // 1. Logo click → Home
        var logo = document.querySelector('h1[title*="New document"]');
        if (logo) {
          logo.title = 'Home';
          logo.replaceWith(logo.cloneNode(true));
          var newLogo = document.querySelector('h1[title="Home"]');
          if (newLogo) {
            newLogo.style.cursor = 'pointer';
            newLogo.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              goHome();
            });
          }
        }

        // 2. Add Home button to existing footer (left side)
        var footer = document.querySelector('footer') || document.querySelector('[class*="footer"]');
        if (!footer) {
          // Find the bottom bar area
          var allDivs = document.querySelectorAll('div');
          for (var i = allDivs.length - 1; i >= 0; i--) {
            var d = allDivs[i];
            var rect = d.getBoundingClientRect();
            if (rect.bottom >= window.innerHeight - 5 && rect.height < 60 && rect.height > 20) {
              footer = d;
              break;
            }
          }
        }
        if (footer) {
          var homeBtn = document.createElement('button');
          homeBtn.textContent = 'Home';
          homeBtn.style.cssText = 'background:none;border:none;color:var(--text-faint,#52525b);cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;padding:0 8px 0 0;margin-right:8px;transition:color 0.15s;-webkit-app-region:no-drag;';
          homeBtn.onmouseenter = function() { homeBtn.style.color = 'var(--accent,#fb923c)'; };
          homeBtn.onmouseleave = function() { homeBtn.style.color = 'var(--text-faint,#52525b)'; };
          homeBtn.onclick = goHome;
          footer.insertBefore(homeBtn, footer.firstChild);
        }
      }, 2500);
    })();
  `);
}

// ─── Desktop Save & Publish ───

function handleDesktopSave(markdown, docTitle) {
  if (!markdown && markdown !== "") return;

  if (currentFilePath) {
    // Save to existing local file
    try {
      fs.writeFileSync(currentFilePath, markdown, "utf8");
      mainWindow.setTitle(`${path.basename(currentFilePath)} — mdfy`);
      console.log("[save] Saved to:", currentFilePath);

      // If published, also push to cloud
      const config = loadMdfyConfig(currentFilePath);
      if (config && config.docId) {
        pushToCloud(config, markdown, docTitle).catch((err) => {
          console.error("[push] Cloud push failed:", err.message);
        });
      }
    } catch (err) {
      dialog.showErrorBox("Save Error", err.message);
    }
  } else {
    // No file path — show save dialog
    dialog.showSaveDialog(mainWindow, {
      defaultPath: (docTitle || "untitled") + ".md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    }).then((result) => {
      if (!result.canceled && result.filePath) {
        currentFilePath = result.filePath;
        fs.writeFileSync(result.filePath, markdown, "utf8");
        mainWindow.setTitle(`${path.basename(result.filePath)} — mdfy`);
        addToRecentFiles(result.filePath);
      }
    });
  }
}

function handleDesktopPublished(docId, editToken) {
  if (!currentFilePath || !docId) return;
  // Create or update .mdfy.json sidecar
  const config = {
    docId,
    editToken: editToken || "",
    lastSyncedAt: new Date().toISOString(),
    lastServerUpdatedAt: new Date().toISOString(),
  };
  saveMdfyConfig(currentFilePath, config);
  console.log("[publish] Created .mdfy.json for:", currentFilePath, "→", docId);
}

async function pushToCloud(config, markdown, title) {
  const user = cachedUser || loadCachedUser();
  const headers = { "Content-Type": "application/json" };
  if (user) headers["x-user-id"] = user.id;

  const response = await net.fetch(`${MDFY_URL}/api/docs/${config.docId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      editToken: config.editToken,
      markdown,
      title: title || extractTitleFromMd(markdown),
      action: "auto-save",
      userId: user?.id,
    }),
  });
  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }
  return true;
}

function extractTitleFromMd(md) {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// .mdfy.json sidecar management
function getMdfyConfigPath(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  return path.join(dir, base + ".mdfy.json");
}

function loadMdfyConfig(filePath) {
  try {
    const configPath = getMdfyConfigPath(filePath);
    const data = fs.readFileSync(configPath, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveMdfyConfig(filePath, config) {
  try {
    const configPath = getMdfyConfigPath(filePath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("[config] Failed to save .mdfy.json:", err.message);
  }
}

// ─── File Watcher ───
// Watch the current file for external changes and reload content

function startFileWatcher(filePath) {
  stopFileWatcher();
  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === "change" && mainWindow) {
        // Debounce to avoid catching our own saves
        if (fileWatcher._debounce) clearTimeout(fileWatcher._debounce);
        fileWatcher._debounce = setTimeout(() => {
          // Skip if this change was likely from our own auto-save (within 2s)
          if (Date.now() - lastAutoSaveTime < 2000) return;
          try {
            const content = fs.readFileSync(filePath, "utf8");
            // Notify the web app about the external change
            mainWindow.webContents.executeJavaScript(`
              if (window.__MDFY_SET_MARKDOWN__ && typeof window.__MDFY_SET_MARKDOWN__ === 'function') {
                window.__MDFY_SET_MARKDOWN__(${JSON.stringify(content)});
              }
            `).catch(() => {});
          } catch {}
        }, 1000);
      }
    });
  } catch {}
}

function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

// ─── Open File in App ───

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function openFileInApp(filePath) {
  if (!mainWindow) return;
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  console.log("[openFileInApp]", absolutePath, "ext:", ext, "isText:", isTextFile(absolutePath), "online:", isOnline());
  addToRecentFiles(absolutePath);

  if (!ALL_SUPPORTED_EXTENSIONS.has(ext)) {
    const supported = Array.from(ALL_SUPPORTED_EXTENSIONS).map(e => e.slice(1)).join(", ");
    dialog.showErrorBox("Unsupported Format", `mdfy does not support .${ext.slice(1)} files.\n\nSupported formats: ${supported}`);
    return;
  }

  try {
    const stats = fs.statSync(absolutePath);
    if (stats.size > MAX_FILE_SIZE) {
      dialog.showErrorBox("File too large", "Files larger than 50MB are not supported.");
      return;
    }

    currentFilePath = absolutePath;
    startFileWatcher(absolutePath);
    const fileName = path.basename(absolutePath);
    mainWindow.setTitle(`${fileName} — mdfy`);

    if (isTextFile(absolutePath)) {
      // Text files: load content directly via hash
      const content = fs.readFileSync(absolutePath, "utf8");
      const encoded = Buffer.from(content).toString("base64");
      const encodedName = encodeURIComponent(fileName);
      if (isOnline()) {
        const currentUrl = mainWindow.webContents.getURL();
        const targetUrl = `${MDFY_URL}/#md=${encoded}&file=${encodedName}`;
        if (currentUrl.startsWith("https://mdfy.cc")) {
          // Already on mdfy.cc — navigate via JS to trigger hash change
          mainWindow.webContents.executeJavaScript(`window.location.href = ${JSON.stringify(targetUrl)}; window.location.reload();`);
        } else {
          loadMdfyWithTimeout(targetUrl);
          mainWindow.webContents.once("did-finish-load", () => {
            injectNativeBridge();
            injectHomeButton();
          });
        }
      } else {
        mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
      }
    } else {
      // Binary/non-text files: load mdfy.cc first, then inject file via drag-drop
      openFileViaImport(absolutePath, fileName);
    }
  } catch (err) {
    dialog.showErrorBox("Error", `Could not open file: ${err.message}`);
  }
}

function openFileViaImport(absolutePath, fileName) {
  const stats = fs.statSync(absolutePath);
  if (stats.size > MAX_FILE_SIZE) {
    dialog.showErrorBox("File too large", "Files larger than 50MB are not supported.");
    return;
  }

  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString("base64");
  const mimeType = mime(absolutePath);

  if (!isOnline()) {
    dialog.showErrorBox("Offline", "Importing non-text files requires an internet connection. Connect to the internet and try again.");
    return;
  }
  loadMdfyWithTimeout(MDFY_URL);
  mainWindow.webContents.once("did-finish-load", () => {
    injectNativeBridge();

    // Wait a moment for the web app to initialize, then inject the file
    // and trigger the same import pipeline as drag & drop
    const js = `
      (async function() {
        // Wait for the app to be ready (editor area must exist)
        let retries = 0;
        while (!document.querySelector('[class*="flex-1"]') && !document.querySelector('.cm-editor') && !document.querySelector('article') && retries < 50) {
          await new Promise(r => setTimeout(r, 100));
          retries++;
        }

        const base64 = ${JSON.stringify(base64)};
        const fileName = ${JSON.stringify(fileName)};
        const mimeType = ${JSON.stringify(mimeType)};

        // Decode base64 to binary
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        // Create a File object
        const file = new File([bytes], fileName, { type: mimeType });

        // Create a synthetic drop event
        const dt = new DataTransfer();
        dt.items.add(file);
        const dropEvent = new DragEvent('drop', {
          dataTransfer: dt,
          bubbles: true,
          cancelable: true,
        });

        // Try to find the best drop target
        const target =
          document.querySelector('.cm-editor') ||
          document.querySelector('[class*="flex-1"]') ||
          document.querySelector('main') ||
          document.body;

        // Also dispatch dragover first so the app recognizes the drop
        const dragOverEvent = new DragEvent('dragover', {
          dataTransfer: dt,
          bubbles: true,
          cancelable: true,
        });
        target.dispatchEvent(dragOverEvent);

        // Small delay then drop
        await new Promise(r => setTimeout(r, 50));
        target.dispatchEvent(dropEvent);
      })();
    `;

    // Give the web app a moment to fully initialize its event listeners
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(js).catch((err) => {
        console.error("Failed to inject file:", err);
        dialog.showErrorBox("Import Error", `Could not import file: ${err.message}`);
      });
    }, 1500);
  });
}

// Save current editor content to local file
function saveCurrentToFile() {
  mainWindow.webContents.executeJavaScript(`
    (function() {
      // Get markdown from CM6 or contentEditable
      const cmContent = document.querySelector('.cm-content');
      if (cmContent) return cmContent.textContent;
      const article = document.querySelector('article.mdcore-rendered');
      if (article) return article.innerText;
      return '';
    })();
  `).then(async (markdown) => {
    if (!markdown) return;
    if (currentFilePath) {
      fs.writeFileSync(currentFilePath, markdown, "utf8");
      mainWindow.setTitle(path.basename(currentFilePath) + " — mdfy");
    } else {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: "untitled.md",
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, markdown, "utf8");
        currentFilePath = result.filePath;
        mainWindow.setTitle(path.basename(result.filePath) + " — mdfy");
      }
    }
  });
}

// ─── IPC Handlers ───

ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: FILE_FILTERS,
  });
  if (!result.canceled && result.filePaths.length > 0) {
    openFileInApp(result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle("save-file-dialog", async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || "untitled.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("save-file", async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, "utf8");
    currentFilePath = filePath;
    mainWindow.setTitle(`${path.basename(filePath)} — mdfy`);
    return true;
  } catch (err) {
    dialog.showErrorBox("Save Error", err.message);
    return false;
  }
});

ipcMain.handle("get-file-path", () => currentFilePath);

ipcMain.handle("open-file-path", (event, filePath) => {
  console.log("[IPC] open-file-path:", filePath);
  openFileInApp(filePath);
});

ipcMain.handle("open-editor", () => {
  currentFilePath = null;
  stopFileWatcher();
  loadMdfyOrOffline(MDFY_URL);
  mainWindow.setTitle("mdfy — New Document");
  // After mdfy.cc loads, clear to blank editor
  mainWindow.webContents.once("did-finish-load", () => {
    injectNativeBridge();
    injectHomeButton();
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        // Click the logo to trigger handleClear (new document)
        var logo = document.querySelector('h1[title*="New document"]');
        if (logo) logo.click();
      `);
    }, 2000);
  });
});

ipcMain.handle("open-editor-with-content", (event, markdown, fileName) => {
  currentFilePath = null;
  const encoded = Buffer.from(markdown).toString("base64");
  const encodedName = encodeURIComponent(fileName || "untitled.md");
  const url = `${MDFY_URL}/#md=${encoded}&file=${encodedName}`;
  loadMdfyOrOffline(url);
  mainWindow.setTitle(fileName || "mdfy");
});

ipcMain.handle("get-version", () => {
  return app.getVersion();
});

ipcMain.handle("read-clipboard", () => {
  const { clipboard } = require("electron");
  return clipboard.readText() || "";
});

ipcMain.handle("get-recent-files", () => {
  return loadRecentFiles();
});

ipcMain.handle("open-in-browser", (event, url) => {
  shell.openExternal(url);
});

// ─── User Auth & Cloud Documents ───

// Cached user info (extracted from mdfy.cc session)
let cachedUser = null;

const USER_CACHE_PATH = path.join(
  app.getPath("userData"),
  "user-cache.json"
);

function loadCachedUser() {
  try {
    const data = fs.readFileSync(USER_CACHE_PATH, "utf8");
    return JSON.parse(data);
  } catch { return null; }
}

function saveCachedUser(user) {
  cachedUser = user;
  try {
    fs.writeFileSync(USER_CACHE_PATH, JSON.stringify(user, null, 2));
  } catch {}
}

function clearCachedUser() {
  cachedUser = null;
  try { fs.unlinkSync(USER_CACHE_PATH); } catch {}
}

// Extract user from mdfy.cc via JS injection
async function extractUserFromWeb() {
  if (!mainWindow) return null;
  const url = mainWindow.webContents.getURL();
  if (!url.includes("mdfy.cc")) return cachedUser;
  try {
    const result = await mainWindow.webContents.executeJavaScript(`
      (function() {
        try {
          // Try to get Supabase session from localStorage
          var keys = Object.keys(localStorage);
          for (var i = 0; i < keys.length; i++) {
            if (keys[i].indexOf('auth-token') !== -1 || keys[i].indexOf('supabase') !== -1) {
              var val = JSON.parse(localStorage.getItem(keys[i]));
              if (val && val.user) return { id: val.user.id, email: val.user.email };
              if (val && val.access_token) {
                // Decode JWT payload
                var parts = val.access_token.split('.');
                if (parts.length === 3) {
                  var payload = JSON.parse(atob(parts[1]));
                  return { id: payload.sub, email: payload.email };
                }
              }
            }
          }
          return null;
        } catch(e) { return null; }
      })();
    `);
    if (result && result.id) {
      saveCachedUser(result);
      return result;
    }
  } catch {}
  return cachedUser;
}

// Fetch user's cloud documents via API
async function fetchCloudDocuments(userId) {
  if (!userId) return [];
  try {
    const { session } = require("electron");
    const cookies = await session.defaultSession.cookies.get({ url: MDFY_URL });
    const cookieStr = cookies.map(c => c.name + "=" + c.value).join("; ");

    const response = await net.fetch(`${MDFY_URL}/api/user/documents`, {
      headers: {
        "x-user-id": userId,
        "Cookie": cookieStr,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.documents || [];
  } catch {
    return [];
  }
}

// Fetch recently visited documents
async function fetchRecentDocuments(userId) {
  if (!userId) return [];
  try {
    const { session } = require("electron");
    const cookies = await session.defaultSession.cookies.get({ url: MDFY_URL });
    const cookieStr = cookies.map(c => c.name + "=" + c.value).join("; ");

    const response = await net.fetch(`${MDFY_URL}/api/user/recent`, {
      headers: {
        "x-user-id": userId,
        "Cookie": cookieStr,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.recent || [];
  } catch {
    return [];
  }
}

ipcMain.handle("get-user", async () => {
  if (cachedUser) return cachedUser;
  cachedUser = loadCachedUser();
  return cachedUser;
});

ipcMain.handle("get-cloud-documents", async () => {
  const user = cachedUser || loadCachedUser();
  if (!user) return { documents: [], recent: [] };
  const [documents, recent] = await Promise.all([
    fetchCloudDocuments(user.id),
    fetchRecentDocuments(user.id),
  ]);
  return { documents, recent };
});

ipcMain.handle("sign-in", () => {
  // Load mdfy.cc in the window so user can sign in
  loadMdfyOrOffline(MDFY_URL);
  mainWindow.setTitle("mdfy — Sign in");
  // After page loads, try to extract user
  mainWindow.webContents.once("did-finish-load", () => {
    injectNativeBridge();
    injectHomeButton();
    setTimeout(async () => {
      await extractUserFromWeb();
    }, 3000);
  });
});

ipcMain.handle("sign-out", () => {
  clearCachedUser();
});

ipcMain.handle("open-cloud-document", (event, docId) => {
  const url = `${MDFY_URL}/d/${docId}`;
  loadMdfyOrOffline(url);
  mainWindow.setTitle("mdfy");
  mainWindow.webContents.once("did-finish-load", () => {
    injectNativeBridge();
    injectHomeButton();
  });
});

// Try to extract user when returning from mdfy.cc to dashboard
ipcMain.handle("refresh-user", async () => {
  return await extractUserFromWeb();
});

// ─── Recent Files ───

const RECENT_FILES_PATH = path.join(
  app.getPath("userData"),
  "recent-files.json"
);

function loadRecentFiles() {
  try {
    const data = fs.readFileSync(RECENT_FILES_PATH, "utf8");
    const parsed = JSON.parse(data);
    // Handle old format (plain string array) and new format (object array)
    return parsed
      .map((f) => typeof f === "string" ? { path: f, openedAt: new Date().toISOString() } : f)
      .filter((f) => f.path && fs.existsSync(f.path));
  } catch {
    return [];
  }
}

function addToRecentFiles(filePath) {
  const recent = loadRecentFiles();
  const filtered = recent.filter((f) => f.path !== filePath);
  filtered.unshift({ path: filePath, openedAt: new Date().toISOString() });
  const trimmed = filtered.slice(0, 10);
  try {
    fs.writeFileSync(RECENT_FILES_PATH, JSON.stringify(trimmed, null, 2));
  } catch (err) {
    console.error("Failed to write recent files:", err);
  }
}

// ─── Menu ───

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: "mdfy",
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Home",
          accelerator: "CmdOrCtrl+Shift+H",
          click: () => {
            currentFilePath = null;
            stopFileWatcher();
            mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));
            mainWindow.setTitle("mdfy");
          },
        },
        { type: "separator" },
        {
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            currentFilePath = null;
            stopFileWatcher();
            const url = mainWindow.webContents.getURL();
            if (url.startsWith("https://mdfy.cc")) {
              // Already on mdfy.cc, just clear
              mainWindow.webContents.executeJavaScript(`
                var logo = document.querySelector('h1[title*="New document"]');
                if (logo) logo.click();
              `);
            } else {
              loadMdfyOrOffline(MDFY_URL);
              mainWindow.setTitle("mdfy — New Document");
            }
          },
        },
        {
          label: "Open...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
              filters: FILE_FILTERS,
            });
            if (!result.canceled && result.filePaths[0]) {
              openFileInApp(result.filePaths[0]);
              addToRecentFiles(result.filePaths[0]);
            }
          },
        },
        { type: "separator" },
        {
          label: "Save to Local File...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => saveCurrentToFile(),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { label: "Edit", submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" },
      { role: "cut" }, { role: "copy" }, { role: "paste" },
      { role: "selectAll" },
    ]},
    { label: "View", submenu: [
      { role: "reload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ]},
    { label: "Window", submenu: [
      { role: "minimize" }, { role: "zoom" },
      ...(isMac ? [{ type: "separator" }, { role: "front" }] : []),
    ]},
    { label: "Help", submenu: [
      {
        label: "mdfy.cc Website",
        click: () => shell.openExternal("https://mdfy.cc"),
      },
      {
        label: "About mdfy",
        click: () => shell.openExternal("https://mdfy.cc/about"),
      },
      {
        label: "Plugins",
        click: () => shell.openExternal("https://mdfy.cc/plugins"),
      },
    ]},
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── QuickLook Extension Installer ───
// Copies MdfyQuickLook.app to /Applications on first launch to register the extension

function installQuickLookExtension() {
  const marker = path.join(app.getPath("userData"), ".quicklook-installed");
  if (fs.existsSync(marker)) return;

  const qlAppSource = path.join(process.resourcesPath, "MdfyQuickLook.app");
  const qlAppDest = "/Applications/MdfyQuickLook.app";

  if (!fs.existsSync(qlAppSource)) return;

  // Copy to /Applications (may need admin permissions)
  try {
    if (!fs.existsSync(qlAppDest)) {
      const { execSync } = require("child_process");
      execSync(`cp -R "${qlAppSource}" "${qlAppDest}"`);
      // Open once to register the QuickLook extension
      execSync(`open "${qlAppDest}"`);
    }
    fs.writeFileSync(marker, new Date().toISOString());
  } catch (err) {
    console.log("[quicklook] Could not auto-install:", err.message);
    // Not fatal — user can install manually
  }
}

// ─── App Events ───

// Handle file open from OS (double-click .md file) — must be registered
// before app.whenReady() so macOS open-file events arriving during startup
// are captured via queuedFilePath.
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    openFileInApp(filePath);
  } else {
    queuedFilePath = filePath;
  }
});

app.whenReady().then(() => {
  app.setAboutPanelOptions({
    applicationName: "mdfy",
    applicationVersion: app.getVersion(),
    version: `Electron ${process.versions.electron}`,
    copyright: "Copyright 2024-2026 mdfy.cc",
    website: "https://mdfy.cc",
    iconPath: path.join(__dirname, "assets", "icon.png"),
  });

  buildMenu();
  createWindow();
  installQuickLookExtension();

  // Open queued file from pre-ready open-file event
  if (queuedFilePath) {
    openFileInApp(queuedFilePath);
    queuedFilePath = null;
  }

  // Handle argv (file passed as argument)
  const filePath = process.argv.find((a) => {
    const ext = path.extname(a).toLowerCase();
    return ALL_SUPPORTED_EXTENSIONS.has(ext);
  });
  if (filePath) {
    openFileInApp(filePath);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopFileWatcher();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
