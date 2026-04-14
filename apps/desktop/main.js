/* =========================================================
   mdfy Desktop — Electron Shell with Local WASM Rendering
   Uses @mdcore/engine WASM for offline Markdown rendering
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

// ─── WASM Engine ───

const wasmEngine = require("./wasm/mdcore_engine");

function renderMarkdown(markdown) {
  try {
    const result = wasmEngine.render(markdown || "");
    const html = result.html;
    const flavor = result.flavor;
    const flavorPrimary = flavor ? flavor.primary : "gfm";
    // Free WASM objects to avoid memory leaks
    try { result.free(); } catch {}
    return {
      html: html,
      flavor: { primary: flavorPrimary },
    };
  } catch (err) {
    console.error("[wasm] Render error:", err);
    return {
      html: `<p style="color:red">Render error: ${err.message}</p>`,
      flavor: { primary: "gfm" },
    };
  }
}

// ─── State ───

let mainWindow = null;
let currentFilePath = null;
let queuedFilePath = null;
let fileWatcher = null;
let lastAutoSaveTime = 0;

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
      const mdfyUrl = argv.find((a) => a.startsWith("mdfy://"));
      if (mdfyUrl) {
        handleMdfyUrl(mdfyUrl);
        return;
      }
      const filePath = argv.find((a) => {
        const ext = path.extname(a).toLowerCase();
        return ALL_SUPPORTED_EXTENSIONS.has(ext);
      });
      if (filePath) openFileInApp(filePath);
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleMdfyUrl(url);
  });
}

function handleMdfyUrl(url) {
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
        openCloudDocumentInApp(docId);
      }
    }
  } catch { /* ignore malformed URLs */ }
}

// ─── Connectivity Check ───

function isOnline() {
  return net.isOnline();
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

  // Show dashboard by default
  mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Handle new window requests (open in browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    // No unsaved-changes prompt for now; auto-save handles it
  });

  mainWindow.on("closed", () => {
    stopFileWatcher();
    mainWindow = null;
  });
}

// ─── Desktop Save & Publish ───

function handleDesktopSave(markdown, docTitle) {
  if (!markdown && markdown !== "") return;

  if (currentFilePath) {
    try {
      lastAutoSaveTime = Date.now();
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
    dialog.showSaveDialog(mainWindow, {
      defaultPath: (docTitle || "untitled") + ".md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    }).then((result) => {
      if (!result.canceled && result.filePath) {
        currentFilePath = result.filePath;
        lastAutoSaveTime = Date.now();
        fs.writeFileSync(result.filePath, markdown, "utf8");
        mainWindow.setTitle(`${path.basename(result.filePath)} — mdfy`);
        addToRecentFiles(result.filePath);
      }
    });
  }
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

function startFileWatcher(filePath) {
  stopFileWatcher();
  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === "change" && mainWindow) {
        if (fileWatcher._debounce) clearTimeout(fileWatcher._debounce);
        fileWatcher._debounce = setTimeout(() => {
          // Skip if this change was likely from our own auto-save (within 2s)
          if (Date.now() - lastAutoSaveTime < 2000) return;
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const result = renderMarkdown(content);
            mainWindow.webContents.send("file-changed", {
              markdown: content,
              html: result.html,
              flavor: result.flavor.primary,
            });
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
  console.log("[openFileInApp]", absolutePath, "ext:", ext, "isText:", isTextFile(absolutePath));
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
      // Text files: render locally with WASM
      const content = fs.readFileSync(absolutePath, "utf8");
      const result = renderMarkdown(content);
      loadEditorWithContent(content, result.html, absolutePath, result.flavor.primary);
    } else {
      // Binary/non-text files: try to open in browser or show error
      openFileViaImport(absolutePath, fileName);
    }
  } catch (err) {
    dialog.showErrorBox("Error", `Could not open file: ${err.message}`);
  }
}

function loadEditorWithContent(markdown, html, filePath, flavor) {
  mainWindow.loadFile(path.join(__dirname, "renderer", "editor.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.webContents.send("load-document", {
      html: html,
      markdown: markdown,
      filePath: filePath || null,
      flavor: flavor || "gfm",
    });
  });
}

function openFileViaImport(absolutePath, fileName) {
  const stats = fs.statSync(absolutePath);
  if (stats.size > MAX_FILE_SIZE) {
    dialog.showErrorBox("File too large", "Files larger than 50MB are not supported.");
    return;
  }

  // For non-text files, we need the web app's import pipeline
  // Open in browser as fallback
  if (isOnline()) {
    const buffer = fs.readFileSync(absolutePath);
    const base64 = buffer.toString("base64");
    const mimeType = mime(absolutePath);
    const encoded = Buffer.from(`# Imported: ${fileName}\n\nThis file type requires the web editor for import.\n\nOpen at [mdfy.cc](https://mdfy.cc) to import .${path.extname(absolutePath).slice(1)} files.`).toString("utf8");
    const result = renderMarkdown(encoded);
    loadEditorWithContent(encoded, result.html, null, "gfm");
  } else {
    dialog.showErrorBox("Unsupported offline", `Importing ${path.extname(absolutePath)} files requires the web editor. Please open mdfy.cc in your browser.`);
  }
}

// Save current editor content to local file
function saveCurrentToFile() {
  // In the new architecture, the editor.js sends auto-save via IPC
  // For manual "Save to Local File", we use the current markdown from auto-save
  if (!mainWindow) return;

  mainWindow.webContents.executeJavaScript(`
    (function() {
      // Try to get markdown from the global state in editor.js
      var content = document.getElementById('content');
      if (!content) return '';
      // Quick extraction from contentEditable
      return content.innerText || '';
    })();
  `).then(async (markdown) => {
    if (!markdown) return;
    if (currentFilePath) {
      lastAutoSaveTime = Date.now();
      fs.writeFileSync(currentFilePath, markdown, "utf8");
      mainWindow.setTitle(path.basename(currentFilePath) + " — mdfy");
    } else {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: "untitled.md",
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!result.canceled && result.filePath) {
        lastAutoSaveTime = Date.now();
        fs.writeFileSync(result.filePath, markdown, "utf8");
        currentFilePath = result.filePath;
        mainWindow.setTitle(path.basename(result.filePath) + " — mdfy");
        addToRecentFiles(result.filePath);
      }
    }
  }).catch(() => {});
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
    lastAutoSaveTime = Date.now();
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
  mainWindow.setTitle("mdfy — New Document");
  loadEditorWithContent("", "", null, "gfm");
});

ipcMain.handle("open-editor-with-content", (event, markdown, fileName) => {
  currentFilePath = null;
  stopFileWatcher();
  const result = renderMarkdown(markdown || "");
  mainWindow.setTitle(fileName || "mdfy");
  loadEditorWithContent(markdown || "", result.html, null, result.flavor.primary);
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

// ─── New IPC Handlers for Local WASM Rendering ───

ipcMain.handle("render-markdown", (event, markdown) => {
  return renderMarkdown(markdown);
});

ipcMain.handle("auto-save", (event, markdown) => {
  if (currentFilePath && markdown !== undefined) {
    lastAutoSaveTime = Date.now();
    try {
      fs.writeFileSync(currentFilePath, markdown, "utf8");
    } catch (err) {
      console.error("[auto-save] Failed:", err.message);
    }

    // Also push to cloud if published
    const config = loadMdfyConfig(currentFilePath);
    if (config && config.docId) {
      pushToCloud(config, markdown, extractTitleFromMd(markdown)).catch((err) => {
        console.error("[auto-save push] Cloud push failed:", err.message);
      });
    }
  }
});

ipcMain.handle("go-home", () => {
  currentFilePath = null;
  stopFileWatcher();
  mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));
  mainWindow.setTitle("mdfy");
});

// ─── User Auth & Cloud Documents ───

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

// Fetch user's cloud documents via API
async function fetchCloudDocuments(userId) {
  if (!userId) return [];
  try {
    const response = await net.fetch(`${MDFY_URL}/api/user/documents`, {
      headers: {
        "x-user-id": userId,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.documents || [];
  } catch {
    return [];
  }
}

async function fetchRecentDocuments(userId) {
  if (!userId) return [];
  try {
    const response = await net.fetch(`${MDFY_URL}/api/user/recent`, {
      headers: {
        "x-user-id": userId,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.recent || [];
  } catch {
    return [];
  }
}

function openCloudDocumentInApp(docId) {
  if (!mainWindow || !isOnline()) return;
  // Fetch the document markdown from the API
  net.fetch(`${MDFY_URL}/api/docs/${docId}`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const markdown = data.markdown || data.content || "";
      const result = renderMarkdown(markdown);
      mainWindow.setTitle((data.title || docId) + " — mdfy");
      loadEditorWithContent(markdown, result.html, null, result.flavor.primary);
    })
    .catch((err) => {
      console.error("[cloud] Failed to fetch document:", err.message);
      // Fallback: open in browser
      shell.openExternal(`${MDFY_URL}/d/${docId}`);
    });
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
  // Open mdfy.cc sign-in page in the default browser
  shell.openExternal(`${MDFY_URL}/auth/signin`);
});

ipcMain.handle("sign-out", () => {
  clearCachedUser();
});

ipcMain.handle("open-cloud-document", (event, docId) => {
  openCloudDocumentInApp(docId);
});

ipcMain.handle("refresh-user", async () => {
  return cachedUser || loadCachedUser();
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
            mainWindow.setTitle("mdfy — New Document");
            loadEditorWithContent("", "", null, "gfm");
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
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            // Trigger save via IPC — the renderer will send auto-save
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                if (window.mdfyDesktop && window.mdfyDesktop.autoSave) {
                  // Get current markdown from editor
                  var content = document.getElementById('content');
                  if (content) {
                    // Dispatch a synthetic Cmd+S event to trigger the editor's save handler
                    var evt = new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true });
                    content.dispatchEvent(evt);
                  }
                }
              `).catch(() => {});
            }
          },
        },
        {
          label: "Save As...",
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

function installQuickLookExtension() {
  const marker = path.join(app.getPath("userData"), ".quicklook-installed");
  if (fs.existsSync(marker)) return;

  const qlAppSource = path.join(process.resourcesPath, "MdfyQuickLook.app");
  const qlAppDest = "/Applications/MdfyQuickLook.app";

  if (!fs.existsSync(qlAppSource)) return;

  try {
    if (!fs.existsSync(qlAppDest)) {
      const { execSync } = require("child_process");
      execSync(`cp -R "${qlAppSource}" "${qlAppDest}"`);
      execSync(`open "${qlAppDest}"`);
    }
    fs.writeFileSync(marker, new Date().toISOString());
  } catch (err) {
    console.log("[quicklook] Could not auto-install:", err.message);
  }
}

// ─── App Events ───

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
