const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  isElectron: true
});
