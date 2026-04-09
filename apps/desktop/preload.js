const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdfyDesktop", {
  isDesktop: true,
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
});
