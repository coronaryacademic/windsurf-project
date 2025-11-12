const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

let mainWindow;
let server;
const SERVER_PORT = 3002; // Use different port to avoid conflicts

// Base directory for notes on D drive
const NOTES_BASE_DIR = 'D:\\MyNotes';

// Ensure base directory exists
fs.ensureDirSync(NOTES_BASE_DIR);
fs.ensureDirSync(path.join(NOTES_BASE_DIR, 'notes'));
fs.ensureDirSync(path.join(NOTES_BASE_DIR, 'folders'));
fs.ensureDirSync(path.join(NOTES_BASE_DIR, 'trash'));
fs.ensureDirSync(path.join(NOTES_BASE_DIR, 'settings'));

// Create Express server
function createServer() {
  const expressApp = express();
  
  // Configure CORS
  expressApp.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
  }));
  
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper function to get safe file path
  function getSafeFilePath(basePath, filename) {
    const safeName = filename.replace(/[<>:"/\\|?*]/g, '_');
    return path.join(basePath, safeName);
  }

  // NOTES ENDPOINTS
  expressApp.get('/api/notes', async (req, res) => {
    try {
      const notesDir = path.join(NOTES_BASE_DIR, 'notes');
      const files = await fs.readdir(notesDir);
      const notes = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(notesDir, file);
          const noteData = await fs.readJson(filePath);
          notes.push(noteData);
        }
      }
      
      res.json(notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      res.status(500).json({ error: 'Failed to load notes' });
    }
  });

  expressApp.delete('/api/notes', async (req, res) => {
    try {
      const notesDir = path.join(NOTES_BASE_DIR, 'notes');
      
      if (await fs.pathExists(notesDir)) {
        // Remove all note files
        const files = await fs.readdir(notesDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            await fs.remove(path.join(notesDir, file));
          }
        }
      }
      
      res.json({ success: true, message: 'All notes deleted successfully' });
    } catch (error) {
      console.error('Error deleting all notes:', error);
      res.status(500).json({ error: 'Failed to delete all notes' });
    }
  });

  expressApp.post('/api/backup', async (req, res) => {
    try {
      const backupData = {
        notes: [],
        folders: [],
        trash: [],
        settings: {},
        createdAt: new Date().toISOString()
      };
      
      // Load all data
      const notesDir = path.join(NOTES_BASE_DIR, 'notes');
      const foldersDir = path.join(NOTES_BASE_DIR, 'folders');
      const trashFile = path.join(NOTES_BASE_DIR, 'trash', 'trash.json');
      const settingsFile = path.join(NOTES_BASE_DIR, 'settings', 'settings.json');
      
      // Load notes
      if (await fs.pathExists(notesDir)) {
        const noteFiles = await fs.readdir(notesDir);
        for (const file of noteFiles) {
          if (file.endsWith('.json')) {
            const noteData = await fs.readJson(path.join(notesDir, file));
            backupData.notes.push(noteData);
          }
        }
      }
      
      // Load folders
      if (await fs.pathExists(foldersDir)) {
        const folderFiles = await fs.readdir(foldersDir);
        for (const file of folderFiles) {
          if (file.endsWith('.json')) {
            const folderData = await fs.readJson(path.join(foldersDir, file));
            backupData.folders.push(folderData);
          }
        }
      }
      
      // Load trash
      if (await fs.pathExists(trashFile)) {
        backupData.trash = await fs.readJson(trashFile);
      }
      
      // Load settings
      if (await fs.pathExists(settingsFile)) {
        backupData.settings = await fs.readJson(settingsFile);
      }
      
      // Save backup file
      const backupDir = path.join(NOTES_BASE_DIR, 'backups');
      await fs.ensureDir(backupDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.json`;
      const backupFilePath = path.join(backupDir, backupFileName);
      
      await fs.writeJson(backupFilePath, backupData, { spaces: 2 });
      
      res.json({ 
        success: true, 
        message: 'Backup created successfully',
        backupFile: backupFileName,
        backupPath: backupFilePath
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  expressApp.post('/api/notes/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      const noteData = req.body;
      
      const notesDir = path.join(NOTES_BASE_DIR, 'notes');
      const filePath = path.join(notesDir, `${noteId}.json`);
      
      await fs.writeJson(filePath, noteData, { spaces: 2 });
      
      res.json({ success: true, message: 'Note saved successfully' });
    } catch (error) {
      console.error('Error saving note:', error);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  expressApp.delete('/api/notes/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      const filePath = path.join(NOTES_BASE_DIR, 'notes', `${noteId}.json`);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        res.json({ success: true, message: 'Note deleted successfully' });
      } else {
        res.status(404).json({ error: 'Note not found' });
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  // FOLDERS ENDPOINTS
  expressApp.get('/api/folders', async (req, res) => {
    try {
      const foldersDir = path.join(NOTES_BASE_DIR, 'folders');
      const files = await fs.readdir(foldersDir);
      const folders = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(foldersDir, file);
          const folderData = await fs.readJson(filePath);
          folders.push(folderData);
        }
      }
      
      res.json(folders);
    } catch (error) {
      console.error('Error loading folders:', error);
      res.status(500).json({ error: 'Failed to load folders' });
    }
  });

  expressApp.post('/api/folders', async (req, res) => {
    try {
      const folders = req.body;
      const foldersDir = path.join(NOTES_BASE_DIR, 'folders');
      
      // Clear existing folder files
      const existingFiles = await fs.readdir(foldersDir);
      for (const file of existingFiles) {
        if (file.endsWith('.json')) {
          await fs.remove(path.join(foldersDir, file));
        }
      }
      
      // Save each folder as a separate file
      for (const folder of folders) {
        const filePath = path.join(foldersDir, `${folder.id}.json`);
        await fs.writeJson(filePath, folder, { spaces: 2 });
      }
      
      res.json({ success: true, message: 'Folders saved successfully' });
    } catch (error) {
      console.error('Error saving folders:', error);
      res.status(500).json({ error: 'Failed to save folders' });
    }
  });

  // Delete a specific folder
  expressApp.delete('/api/folders/:folderId', async (req, res) => {
    try {
      const { folderId } = req.params;
      const filePath = path.join(NOTES_BASE_DIR, 'folders', `${folderId}.json`);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        res.json({ success: true, message: 'Folder deleted successfully' });
      } else {
        res.status(404).json({ error: 'Folder not found' });
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  });

  // TRASH ENDPOINTS
  expressApp.get('/api/trash', async (req, res) => {
    try {
      const trashFile = path.join(NOTES_BASE_DIR, 'trash', 'trash.json');
      
      if (await fs.pathExists(trashFile)) {
        const trashData = await fs.readJson(trashFile);
        res.json(trashData);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Error loading trash:', error);
      res.status(500).json({ error: 'Failed to load trash' });
    }
  });

  expressApp.post('/api/trash', async (req, res) => {
    try {
      const trashData = req.body;
      const trashFile = path.join(NOTES_BASE_DIR, 'trash', 'trash.json');
      
      await fs.writeJson(trashFile, trashData, { spaces: 2 });
      
      res.json({ success: true, message: 'Trash saved successfully' });
    } catch (error) {
      console.error('Error saving trash:', error);
      res.status(500).json({ error: 'Failed to save trash' });
    }
  });

  // SETTINGS ENDPOINTS
  expressApp.get('/api/settings', async (req, res) => {
    try {
      const settingsFile = path.join(NOTES_BASE_DIR, 'settings', 'settings.json');
      
      if (await fs.pathExists(settingsFile)) {
        const settings = await fs.readJson(settingsFile);
        res.json(settings);
      } else {
        const defaultSettings = {
          theme: 'light',
          foldersOpen: [],
          autoSave: true
        };
        res.json(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  expressApp.post('/api/settings', async (req, res) => {
    try {
      const settings = req.body;
      const settingsFile = path.join(NOTES_BASE_DIR, 'settings', 'settings.json');
      
      await fs.writeJson(settingsFile, settings, { spaces: 2 });
      
      res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error saving settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Health check endpoint
  expressApp.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Electron file system server is running',
      baseDir: NOTES_BASE_DIR,
      timestamp: new Date().toISOString()
    });
  });

  return expressApp;
}

// Start the embedded server
function startServer() {
  const expressApp = createServer();
  
  server = expressApp.listen(SERVER_PORT, () => {
    console.log(`Embedded server running on http://localhost:${SERVER_PORT}`);
    console.log(`Base directory: ${NOTES_BASE_DIR}`);
  });
}

// Stop the embedded server
function stopServer() {
  if (server) {
    server.close();
    console.log('Embedded server stopped');
  }
}

function createWindow() {
  // Start the embedded server first
  startServer();
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Allow localhost requests
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'), // Add an icon if you have one
    show: false // Don't show until ready
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    stopServer();
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  stopServer();
});

// IPC handlers
ipcMain.handle('shell:openPath', async (event, path) => {
  return await shell.openPath(path);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});
