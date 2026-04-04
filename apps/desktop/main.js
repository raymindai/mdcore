/* =========================================================
   mdfy Desktop — Electron Main Process
   Native macOS markdown editor with mdfy.cc quality
   ========================================================= */

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  Notification,
  shell,
  nativeTheme,
} = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

// ─── State ───

let mainWindow = null;
let currentFilePath = null;
let isFileModified = false;
let fileWatcher = null;
let recentFiles = [];

const RECENT_FILES_PATH = path.join(
  app.getPath("userData"),
  "recent-files.json"
);
const MAX_RECENT_FILES = 10;

// ─── Recent Files Persistence ───

function loadRecentFiles() {
  try {
    if (fs.existsSync(RECENT_FILES_PATH)) {
      recentFiles = JSON.parse(fs.readFileSync(RECENT_FILES_PATH, "utf-8"));
      // Filter out files that no longer exist
      recentFiles = recentFiles.filter((f) => fs.existsSync(f));
    }
  } catch {
    recentFiles = [];
  }
}

function saveRecentFiles() {
  try {
    fs.writeFileSync(RECENT_FILES_PATH, JSON.stringify(recentFiles, null, 2));
  } catch {
    // Silently ignore write errors
  }
}

function addRecentFile(filePath) {
  recentFiles = recentFiles.filter((f) => f !== filePath);
  recentFiles.unshift(filePath);
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  }
  saveRecentFiles();
  buildMenu();
}

// ─── File Watcher ───

function watchFile(filePath) {
  unwatchFile();
  if (!filePath) return;

  try {
    let debounceTimer = null;
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === "change") {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("file-changed-externally", content);
            }
          } catch {
            // File may have been deleted
          }
        }, 300);
      }
    });
  } catch {
    // File watching not available
  }
}

function unwatchFile() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

// ─── Window Title ───

function updateWindowTitle() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const modified = isFileModified ? " — Edited" : "";
  const fileName = currentFilePath
    ? path.basename(currentFilePath)
    : "Untitled";
  const dir = currentFilePath ? ` — ${path.dirname(currentFilePath)}` : "";

  mainWindow.setTitle(`${fileName}${modified}`);
  mainWindow.setDocumentEdited(isFileModified);

  if (currentFilePath) {
    mainWindow.setRepresentedFilename(currentFilePath);
  }
}

// ─── Menu Bar ───

function buildMenu() {
  const recentMenuItems =
    recentFiles.length > 0
      ? [
          ...recentFiles.map((filePath) => ({
            label: path.basename(filePath),
            sublabel: filePath,
            click: () => openFile(filePath),
          })),
          { type: "separator" },
          {
            label: "Clear Recent",
            click: () => {
              recentFiles = [];
              saveRecentFiles();
              buildMenu();
            },
          },
        ]
      : [{ label: "No Recent Files", enabled: false }];

  const template = [
    {
      label: app.name,
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
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => newFile(),
        },
        {
          label: "Open...",
          accelerator: "CmdOrCtrl+O",
          click: () => openFileDialog(),
        },
        {
          label: "Open Recent",
          submenu: recentMenuItems,
        },
        { type: "separator" },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("request-save");
            }
          },
        },
        {
          label: "Save As...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("request-save-as");
            }
          },
        },
        { type: "separator" },
        {
          label: "Share to mdfy.cc",
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("request-share");
            }
          },
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Find...",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("toggle-find");
            }
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Source",
          accelerator: "CmdOrCtrl+/",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("toggle-source");
            }
          },
        },
        { type: "separator" },
        { role: "resetZoom", label: "Actual Size" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
        { type: "separator" },
        { role: "window" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "mdfy.cc Website",
          click: () => shell.openExternal("https://mdfy.cc"),
        },
        {
          label: "About mdfy.cc",
          click: () => shell.openExternal("https://mdfy.cc/about"),
        },
        { type: "separator" },
        {
          label: "Keyboard Shortcuts",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("show-shortcuts");
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── Window Creation ───

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#09090b" : "#faf9f7",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // If a file was passed as argument, open it
    const fileArg = process.argv.find(
      (arg) => arg.endsWith(".md") || arg.endsWith(".markdown")
    );
    if (fileArg && fs.existsSync(fileArg)) {
      openFile(path.resolve(fileArg));
    }
  });

  // Prevent close if unsaved changes
  mainWindow.on("close", (e) => {
    if (isFileModified) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        buttons: ["Save", "Don't Save", "Cancel"],
        defaultId: 0,
        cancelId: 2,
        title: "Unsaved Changes",
        message: "Do you want to save changes before closing?",
        detail: currentFilePath
          ? `"${path.basename(currentFilePath)}" has unsaved changes.`
          : "This document has unsaved changes.",
      });

      if (choice === 0) {
        // Save, then close
        mainWindow.webContents.send("request-save");
        // The renderer will call save-file, which sets isFileModified = false
        // Then we can close
        setTimeout(() => {
          isFileModified = false;
          mainWindow.close();
        }, 500);
      } else if (choice === 1) {
        // Don't save, just close
        isFileModified = false;
        mainWindow.close();
      }
      // choice === 2: Cancel, do nothing
    }
  });

  mainWindow.on("closed", () => {
    unwatchFile();
    mainWindow = null;
  });

  // Track theme changes
  nativeTheme.on("updated", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "theme-changed",
        nativeTheme.shouldUseDarkColors ? "dark" : "light"
      );
    }
  });
}

// ─── File Operations ───

function newFile() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (isFileModified) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        buttons: ["Save", "Don't Save", "Cancel"],
        defaultId: 0,
        cancelId: 2,
        title: "Unsaved Changes",
        message: "Do you want to save changes?",
      });

      if (choice === 0) {
        mainWindow.webContents.send("request-save");
        return;
      } else if (choice === 2) {
        return;
      }
    }

    currentFilePath = null;
    isFileModified = false;
    unwatchFile();
    updateWindowTitle();
    mainWindow.webContents.send("file-opened", null, "");
  }
}

async function openFileDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd", "txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    openFile(result.filePaths[0]);
  }
}

function openFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    currentFilePath = filePath;
    isFileModified = false;
    addRecentFile(filePath);
    updateWindowTitle();
    watchFile(filePath);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("file-opened", filePath, content);
    }
  } catch (err) {
    dialog.showErrorBox("Error", `Could not open file:\n${err.message}`);
  }
}

// ─── IPC Handlers ───

ipcMain.handle("read-file", async (_event, filePath) => {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new Error(`Could not read file: ${err.message}`);
  }
});

ipcMain.handle("save-file", async (_event, filePath, content) => {
  try {
    // Temporarily stop watching to avoid triggering external change event
    unwatchFile();
    fs.writeFileSync(filePath, content, "utf-8");
    currentFilePath = filePath;
    isFileModified = false;
    addRecentFile(filePath);
    updateWindowTitle();
    watchFile(filePath);
    return { success: true, path: filePath };
  } catch (err) {
    throw new Error(`Could not save file: ${err.message}`);
  }
});

ipcMain.handle("open-file-dialog", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd", "txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");
    currentFilePath = filePath;
    isFileModified = false;
    addRecentFile(filePath);
    updateWindowTitle();
    watchFile(filePath);
    return { path: filePath, content };
  }
  return null;
});

ipcMain.handle("save-file-dialog", async (_event, defaultName) => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || "Untitled.md",
    filters: [
      { name: "Markdown", extensions: ["md"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle("get-file-path", async () => {
  return currentFilePath;
});

ipcMain.handle("share-to-mdfy", async (_event, markdown, title) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ markdown, title: title || undefined });

    const req = https.request(
      {
        hostname: "mdfy.cc",
        port: 443,
        path: "/api/docs",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300 && json.id) {
              const url = `https://mdfy.cc/${json.id}`;
              resolve({ url, editToken: json.editToken });
            } else {
              reject(new Error(json.error || `HTTP ${res.statusCode}`));
            }
          } catch {
            reject(new Error(`Invalid response: ${data.substring(0, 200)}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.write(postData);
    req.end();
  });
});

ipcMain.handle("show-notification", async (_event, title, body) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.show();
  }
});

ipcMain.handle("mark-modified", async () => {
  isFileModified = true;
  updateWindowTitle();
});

ipcMain.handle("mark-saved", async () => {
  isFileModified = false;
  updateWindowTitle();
});

ipcMain.handle("get-theme", async () => {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});

// ─── App Lifecycle ───

app.whenReady().then(() => {
  loadRecentFiles();
  buildMenu();
  createWindow();

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

// Handle file open via OS (double-click .md file)
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed()) {
    openFile(filePath);
  } else {
    // Store the path and open when window is ready
    app.whenReady().then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        openFile(filePath);
      }
    });
  }
});

// Handle second instance (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check if a file was passed
      const fileArg = argv.find(
        (arg) => arg.endsWith(".md") || arg.endsWith(".markdown")
      );
      if (fileArg && fs.existsSync(fileArg)) {
        openFile(path.resolve(fileArg));
      }
    }
  });
}
