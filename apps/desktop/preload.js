/* =========================================================
   mdfy Desktop — Preload Script (Context Bridge)
   Exposes safe IPC APIs to the renderer process
   ========================================================= */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdfy", {
  // ─── File Operations ───
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  saveFile: (path, content) => ipcRenderer.invoke("save-file", path, content),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  saveFileDialog: (defaultName) =>
    ipcRenderer.invoke("save-file-dialog", defaultName),
  getFilePath: () => ipcRenderer.invoke("get-file-path"),

  // ─── Share ───
  shareToMdfy: (markdown, title) =>
    ipcRenderer.invoke("share-to-mdfy", markdown, title),

  // ─── Notifications ───
  showNotification: (title, body) =>
    ipcRenderer.invoke("show-notification", title, body),

  // ─── State ───
  markModified: () => ipcRenderer.invoke("mark-modified"),
  markSaved: () => ipcRenderer.invoke("mark-saved"),
  getTheme: () => ipcRenderer.invoke("get-theme"),

  // ─── Events from Main Process ───
  onFileOpened: (callback) => {
    ipcRenderer.on("file-opened", (_event, path, content) =>
      callback(path, content)
    );
  },
  onRequestSave: (callback) => {
    ipcRenderer.on("request-save", () => callback());
  },
  onRequestSaveAs: (callback) => {
    ipcRenderer.on("request-save-as", () => callback());
  },
  onRequestShare: (callback) => {
    ipcRenderer.on("request-share", () => callback());
  },
  onToggleSource: (callback) => {
    ipcRenderer.on("toggle-source", () => callback());
  },
  onToggleFind: (callback) => {
    ipcRenderer.on("toggle-find", () => callback());
  },
  onThemeChanged: (callback) => {
    ipcRenderer.on("theme-changed", (_event, theme) => callback(theme));
  },
  onFileChangedExternally: (callback) => {
    ipcRenderer.on("file-changed-externally", (_event, content) =>
      callback(content)
    );
  },
  onShowShortcuts: (callback) => {
    ipcRenderer.on("show-shortcuts", () => callback());
  },
});
