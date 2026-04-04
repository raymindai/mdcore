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

  // Load mdfy.cc directly
  mainWindow.loadURL(MDFY_URL);

  // Inject native bridge after page loads
  mainWindow.webContents.on("did-finish-load", () => {
    injectNativeBridge();
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

    // Inject file content into the web app after it loads
    const escapedContent = JSON.stringify(content);

    // If page is already loaded, inject directly
    mainWindow.webContents.executeJavaScript(`
      (function() {
        // Find the editor and set content
        // Try CM6 editor first (source/MDFIED pane)
        const cmView = document.querySelector('.cm-content');
        if (cmView) {
          // Trigger a paste-like event with the content
          const event = new InputEvent('beforeinput', { inputType: 'insertText', data: ${escapedContent} });
          cmView.dispatchEvent(event);
        }
        // Set markdown via the textarea/state if available
        // The most reliable way: simulate paste into the page
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = ${escapedContent};
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Or use the URL hash approach for reliability
        window.location.hash = 'md=' + btoa(unescape(encodeURIComponent(${escapedContent})));
        window.location.reload();
      })();
    `).catch(() => {
      // Page not ready — load with hash
      const encoded = Buffer.from(content).toString("base64");
      mainWindow.loadURL(MDFY_URL + "/#md=" + encoded);
      mainWindow.webContents.once("did-finish-load", () => injectNativeBridge());
    });
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
