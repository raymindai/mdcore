const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdfyDesktop", {
  isDesktop: true,

  // File operations
  openFile: () => ipcRenderer.invoke("open-file-dialog"),
  openFilePath: (filePath) => ipcRenderer.invoke("open-file-path", filePath),
  openEditor: () => ipcRenderer.invoke("open-editor"),
  openEditorWithContent: (markdown, fileName) => ipcRenderer.invoke("open-editor-with-content", markdown, fileName),
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", filePath, content),
  saveFileDialog: (name) => ipcRenderer.invoke("save-file-dialog", name),
  getFilePath: () => ipcRenderer.invoke("get-file-path"),
  getRecentFiles: () => ipcRenderer.invoke("get-recent-files"),
  openInBrowser: (url) => ipcRenderer.invoke("open-in-browser", url),
  getVersion: () => ipcRenderer.invoke("get-version"),
  readClipboard: () => ipcRenderer.invoke("read-clipboard"),

  // User & cloud
  getUser: () => ipcRenderer.invoke("get-user"),
  getCloudDocuments: () => ipcRenderer.invoke("get-cloud-documents"),
  signIn: () => ipcRenderer.invoke("sign-in"),
  signOut: () => ipcRenderer.invoke("sign-out"),
  openCloudDocument: (docId) => ipcRenderer.invoke("open-cloud-document", docId),
  refreshUser: () => ipcRenderer.invoke("refresh-user"),

  // Local WASM rendering
  renderMarkdown: (markdown) => ipcRenderer.invoke("render-markdown", markdown),
  autoSave: (markdown) => ipcRenderer.invoke("auto-save", markdown),
  goHome: () => ipcRenderer.invoke("go-home"),

  // Events from main process
  onLoadDocument: (callback) => {
    ipcRenderer.on("load-document", (event, data) => callback(data));
  },
  onFileChanged: (callback) => {
    ipcRenderer.on("file-changed", (event, data) => callback(data));
  },
});
