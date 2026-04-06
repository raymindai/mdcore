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

const MDFY_URL = "https://mdfy.cc";

// ─── Supported File Types ───

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".mdown", ".mkd", ".txt"]);

const ALL_SUPPORTED_EXTENSIONS = new Set([
  ".md", ".markdown", ".mdown", ".mkd",
  ".pdf", ".docx", ".pptx", ".xlsx",
  ".html", ".htm", ".csv", ".json", ".xml",
  ".txt", ".rtf", ".rst", ".tex", ".latex",
]);

const FILE_FILTERS = [
  { name: "All Supported", extensions: [
    "md", "markdown", "txt", "pdf", "docx", "pptx", "xlsx",
    "html", "htm", "csv", "json", "xml", "rtf", "rst", "tex", "latex",
  ]},
  { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
  { name: "Documents", extensions: ["pdf", "docx", "pptx", "xlsx", "rtf"] },
  { name: "Web & Data", extensions: ["html", "htm", "csv", "json", "xml"] },
  { name: "Text & Markup", extensions: ["txt", "rst", "tex", "latex"] },
  { name: "All Files", extensions: ["*"] },
];

// ─── Single Instance ───

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Open file from argv if it has a supported extension
      const filePath = argv.find((a) => {
        const ext = path.extname(a).toLowerCase();
        return ALL_SUPPORTED_EXTENSIONS.has(ext);
      });
      if (filePath) openFileInApp(filePath);
    }
  });
}

// ─── Connectivity Check ───

function isOnline() {
  return net.isOnline();
}

function loadMdfyOrOffline(url) {
  if (!mainWindow) return;
  if (isOnline()) {
    mainWindow.loadURL(url || MDFY_URL);
    mainWindow.webContents.once("did-fail-load", (event, errorCode, errorDescription) => {
      // Network error during load — show offline page
      if (errorCode === -106 || errorCode === -105 || errorCode === -102 || errorCode === -2) {
        mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
  }
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
    },
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  // Show dashboard by default (no file)
  mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));

  // Inject native bridge after any page loads
  mainWindow.webContents.on("did-finish-load", () => {
    const url = mainWindow.webContents.getURL();
    if (url.includes("mdfy.cc")) {
      injectNativeBridge();
    }
  });

  // Handle new window requests (open in browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Set window title
  mainWindow.webContents.on("page-title-updated", (event, title) => {
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
  `);
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

  if (!ALL_SUPPORTED_EXTENSIONS.has(ext)) {
    dialog.showErrorBox("Unsupported Format", `mdfy does not support .${ext.slice(1)} files.`);
    return;
  }

  try {
    currentFilePath = absolutePath;
    const fileName = path.basename(absolutePath);
    mainWindow.setTitle(`${fileName} — mdfy`);

    if (isTextFile(absolutePath)) {
      // Text files: load content directly via hash (original behavior)
      const content = fs.readFileSync(absolutePath, "utf8");
      const encoded = Buffer.from(content).toString("base64");
      const encodedName = encodeURIComponent(fileName);
      if (isOnline()) {
        mainWindow.loadURL(`${MDFY_URL}/#md=${encoded}&file=${encodedName}`);
        mainWindow.webContents.once("did-finish-load", () => injectNativeBridge());
        mainWindow.webContents.once("did-fail-load", () => {
          mainWindow.loadFile(path.join(__dirname, "renderer", "offline.html"));
        });
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
  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString("base64");
  const mimeType = mime(absolutePath);

  if (!isOnline()) {
    dialog.showErrorBox("Offline", "Importing non-text files requires an internet connection. Connect to the internet and try again.");
    return;
  }
  mainWindow.loadURL(MDFY_URL);
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
  openFileInApp(filePath);
  addToRecentFiles(filePath);
});

ipcMain.handle("open-editor", () => {
  currentFilePath = null;
  loadMdfyOrOffline(MDFY_URL);
  mainWindow.setTitle("mdfy");
});

ipcMain.handle("get-recent-files", () => {
  return loadRecentFiles();
});

ipcMain.handle("open-in-browser", (event, url) => {
  shell.openExternal(url);
});

// ─── Recent Files ───

const RECENT_FILES_PATH = path.join(
  app.getPath("userData"),
  "recent-files.json"
);

function loadRecentFiles() {
  try {
    const data = fs.readFileSync(RECENT_FILES_PATH, "utf8");
    return JSON.parse(data).filter((f) => fs.existsSync(f.path));
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
  } catch {}
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
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            currentFilePath = null;
            loadMdfyOrOffline(MDFY_URL);
            mainWindow.webContents.on("did-finish-load", () => injectNativeBridge());
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

// ─── App Events ───

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // Handle file open from OS (double-click .md file)
  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    if (mainWindow) {
      openFileInApp(filePath);
    } else {
      app.whenReady().then(() => {
        createWindow();
        openFileInApp(filePath);
      });
    }
  });

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
  if (process.platform !== "darwin") {
    app.quit();
  }
});
