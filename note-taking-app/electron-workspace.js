// Electron Workspace Window Management
// This file handles opening workspaces as separate Electron windows

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Store all workspace windows
const workspaceWindows = new Map();

// Initialize workspace IPC handlers
function initializeWorkspaceHandlers() {
  // Handle opening workspace in new window
  ipcMain.handle('open-workspace-window', async (event, options) => {
    const { workspaceId, workspaceName, width, height } = options;
    
    console.log('Opening workspace window:', workspaceName);
    
    // Check if window already exists for this workspace
    if (workspaceWindows.has(workspaceId)) {
      const existingWindow = workspaceWindows.get(workspaceId);
      if (!existingWindow.isDestroyed()) {
        existingWindow.focus();
        return { success: true, message: 'Window already open' };
      }
    }
    
    // Create new window for workspace
    const workspaceWindow = new BrowserWindow({
      width: width || 1200,
      height: height || 800,
      title: `${workspaceName} - Note Taking App`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        partition: `persist:workspace-${workspaceId}` // ISOLATED STORAGE PER WORKSPACE
      },
      backgroundColor: '#1a1a1a',
      show: false
    });
    
    // Load the app with workspace ID as query parameter
    const appUrl = `file://${path.join(__dirname, 'index.html')}?workspace=${workspaceId}`;
    workspaceWindow.loadURL(appUrl);
    
    // Show window when ready
    workspaceWindow.once('ready-to-show', () => {
      workspaceWindow.show();
    });
    
    // Store window reference
    workspaceWindows.set(workspaceId, workspaceWindow);
    
    // Clean up when window is closed
    workspaceWindow.on('closed', () => {
      workspaceWindows.delete(workspaceId);
      console.log('Workspace window closed:', workspaceName);
    });
    
    return { success: true, message: 'Window opened' };
  });
  
  // Handle getting current workspace ID from URL
  ipcMain.handle('get-workspace-from-url', async (event) => {
    const url = event.sender.getURL();
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const workspaceId = urlParams.get('workspace');
    return workspaceId;
  });
  
  // Handle closing workspace window
  ipcMain.handle('close-workspace-window', async (event, workspaceId) => {
    if (workspaceWindows.has(workspaceId)) {
      const window = workspaceWindows.get(workspaceId);
      if (!window.isDestroyed()) {
        window.close();
      }
      workspaceWindows.delete(workspaceId);
    }
    return { success: true };
  });
  
  console.log('✓ Workspace IPC handlers initialized');
}

// Get all open workspace windows
function getOpenWorkspaces() {
  const openWorkspaces = [];
  workspaceWindows.forEach((window, workspaceId) => {
    if (!window.isDestroyed()) {
      openWorkspaces.push({
        workspaceId,
        title: window.getTitle()
      });
    }
  });
  return openWorkspaces;
}

// Close all workspace windows
function closeAllWorkspaceWindows() {
  workspaceWindows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.close();
    }
  });
  workspaceWindows.clear();
}

module.exports = {
  initializeWorkspaceHandlers,
  getOpenWorkspaces,
  closeAllWorkspaceWindows
};
