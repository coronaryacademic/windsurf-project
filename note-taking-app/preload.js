const { contextBridge, ipcRenderer } = require('electron');

// Expose file system API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Notes
  readNotes: () => ipcRenderer.invoke('read-notes'),
  writeNotes: (data) => ipcRenderer.invoke('write-notes', data),
  
  // Folders
  readFolders: () => ipcRenderer.invoke('read-folders'),
  writeFolders: (data) => ipcRenderer.invoke('write-folders', data),
  
  // Settings
  readSettings: () => ipcRenderer.invoke('read-settings'),
  writeSettings: (data) => ipcRenderer.invoke('write-settings', data),
  
  // Trash
  readTrash: () => ipcRenderer.invoke('read-trash'),
  writeTrash: (data) => ipcRenderer.invoke('write-trash', data),
  
  // Utility
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  
  // Check if running in Electron
  isElectron: true,
});
