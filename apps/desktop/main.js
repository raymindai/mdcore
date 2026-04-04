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
} = require("electron");
const path = require("path");
const fs = require("fs");

// ─── State ───

let mainWindow = null;
let currentFilePath = null;

const MDFY_URL = "https://mdfy.cc";

// ─── Single Instance ───

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Open file from argv
      const filePath = argv.find((a) => a.endsWith(".md") || a.endsWith(".markdown"));
      if (filePath) openFileInApp(filePath);
    }
  });
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

function openFileInApp(filePath) {
  if (!mainWindow) return;
  const absolutePath = path.resolve(filePath);
  try {
    const content = fs.readFileSync(absolutePath, "utf8");
    currentFilePath = absolutePath;
    const fileName = path.basename(absolutePath);
    mainWindow.setTitle(`${fileName} — mdfy`);

    // Load mdfy.cc with file content + filename in hash
    // Web app detects ?file= param and creates a new sidebar tab
    const encoded = Buffer.from(content).toString("base64");
    const encodedName = encodeURIComponent(fileName);
    mainWindow.loadURL(`${MDFY_URL}/#md=${encoded}&file=${encodedName}`);
    mainWindow.webContents.once("did-finish-load", () => injectNativeBridge());
  } catch (err) {
    dialog.showErrorBox("Error", `Could not open file: ${err.message}`);
  }
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
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
      { name: "All Files", extensions: ["*"] },
    ],
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
  mainWindow.loadURL(MDFY_URL);
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
            mainWindow.loadURL(MDFY_URL);
            mainWindow.webContents.on("did-finish-load", () => injectNativeBridge());
          },
        },
        {
          label: "Open...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
              filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
            });
            if (!result.canceled && result.filePaths[0]) {
              openFileInApp(result.filePaths[0]);
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
  const filePath = process.argv.find(
    (a) => a.endsWith(".md") || a.endsWith(".markdown")
  );
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
