const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("mdfyDesktop", {
  isDesktop: true,
  openFile: () => ipcRenderer.invoke("open-file-dialog"),
  openFilePath: (filePath) => ipcRenderer.invoke("open-file-path", filePath),
  openEditor: () => ipcRenderer.invoke("open-editor"),
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", filePath, content),
  saveFileDialog: (name) => ipcRenderer.invoke("save-file-dialog", name),
  getFilePath: () => ipcRenderer.invoke("get-file-path"),
  getRecentFiles: () => ipcRenderer.invoke("get-recent-files"),
  openInBrowser: (url) => ipcRenderer.invoke("open-in-browser", url),
});
