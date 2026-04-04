const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdfyDesktop", {
  isDesktop: true,
  openFile: () => ipcRenderer.invoke("open-file-dialog"),
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", filePath, content),
  saveFileDialog: (name) => ipcRenderer.invoke("save-file-dialog", name),
  getFilePath: () => ipcRenderer.invoke("get-file-path"),
});
