const { app, BrowserWindow, ipcMain, Tray, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const http = require("http");
const handler = require("serve-handler");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

// Track main window and tray
let mainWindow = null;
let tray = null;
let currentSettings = {};

// Internal logging for "Debug Log" feature
const startupLogs = [];
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  startupLogs.push(logEntry);
  if (mainWindow) {
    mainWindow.webContents.send('startup-log', logEntry);
  }
}

// Define data directory
const dataDir = process.platform === 'win32' 
  ? path.join("D:", "MyNotes")
  : "/home/momen/WindowsDrive/MyNotes";

// Ensure data directory exists
// File paths
const FILES = {
  folders: path.join(dataDir, "folders.json"),
  settings: path.join(dataDir, "settings", "settings.json"),
  trash: path.join(dataDir, "trash", "trash.json"),
  questions: path.join(dataDir, "questions", "questions.json"),
  sessions: path.join(dataDir, "settings", "sessions.json"),
};

// Ensure data directory and sub-directories exist
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(path.join(dataDir, 'notes'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'settings'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'questions'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'trash'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'folders'), { recursive: true });

    // --- MIGRATION LOGIC ---
    // Move questions.json from root to questions/questions.json if it exists
    const oldQuestions = path.join(dataDir, "questions.json");
    try {
      if (await fs.stat(oldQuestions).catch(() => null)) {
        log("[MIGRATE] Moving questions.json to questions/ subfolder...");
        const data = await fs.readFile(oldQuestions, 'utf8');
        await fs.writeFile(FILES.questions, data);
        await fs.unlink(oldQuestions);
      }
    } catch (e) { log("[ERROR] Questions migration failed: " + e.message); }

    // Move settings.json from root to settings/ subfolder if it exists
    const oldSettings = path.join(dataDir, "settings.json");
    try {
      if (await fs.stat(oldSettings).catch(() => null)) {
        log("[MIGRATE] Moving settings.json to settings/ subfolder...");
        const data = await fs.readFile(oldSettings, 'utf8');
        await fs.writeFile(FILES.settings, data);
        await fs.unlink(oldSettings);
      }
    } catch (e) { log("[ERROR] Settings migration failed: " + e.message); }

    // Move trash.json from root to trash/ subfolder if it exists
    const oldTrash = path.join(dataDir, "trash.json");
    try {
      if (await fs.stat(oldTrash).catch(() => null)) {
        log("[MIGRATE] Moving trash.json to trash/ subfolder...");
        const data = await fs.readFile(oldTrash, 'utf8');
        await fs.writeFile(FILES.trash, data);
        await fs.unlink(oldTrash);
      }
    } catch (e) { log("[ERROR] Trash migration failed: " + e.message); }

    // Move sessions.json from root to settings/ sessions.json if it exists
    const oldSessions = path.join(dataDir, "sessions.json");
    try {
      if (await fs.stat(oldSessions).catch(() => null)) {
        log("[MIGRATE] Moving sessions.json to settings/ subfolder...");
        const data = await fs.readFile(oldSessions, 'utf8');
        await fs.writeFile(FILES.sessions, data);
        await fs.unlink(oldSessions);
      }
    } catch (e) { log("[ERROR] Sessions migration failed: " + e.message); }
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

// Read file with fallback
async function readFile(filePath, defaultData = []) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    // File doesn't exist or is invalid, return default
    return defaultData;
  }
}

// Write file
async function writeFile(filePath, data) {
  try {
    const fileName = path.basename(filePath);
    console.log(`[SAVE] Saving ${fileName}...`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log(`[SAVED] ${fileName} saved successfully`);
    return { success: true };
  } catch (err) {
    console.error("[ERROR] Write error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Resolves a Wikimedia URL to its current direct CDN link
 */
async function resolveWikimediaUrl(url) {
  if (!url.includes('upload.wikimedia.org')) return url;

  try {
    // Extract filename from URL
    const urlParts = url.split('/');
    let fileName = decodeURIComponent(urlParts[urlParts.length - 1]);
    
    // If it's a thumb URL, the filename is usually the second to last part
    if (url.includes('/thumb/')) {
       fileName = decodeURIComponent(urlParts[urlParts.length - 2]);
    }
    
    console.log(`[Wikimedia] Resolving File:${fileName}`);
    
    // Try Commons API first as it's the global repository
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=File:${encodeURIComponent(fileName)}`;
    
    try {
      const response = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'Qnex/1.0 (Educational Note Taking App)' },
        timeout: 5000
      });
      
      const pages = response.data.query.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pageId !== "-1") {
         const directUrl = pages[pageId].imageinfo[0].url;
         console.log(`[Wikimedia] Resolved via Commons: ${directUrl}`);
         return directUrl;
      }
    } catch (e) {
      console.warn(`[Wikimedia] Commons API failed: ${e.message}`);
    }

    // String-based fallback for thumbnails if API resolution fails
    if (url.includes('/thumb/')) {
        const parts = url.split('/');
        const thumbIndex = parts.indexOf('thumb');
        if (thumbIndex !== -1) {
            const newParts = [...parts];
            newParts.splice(thumbIndex, 1); // Remove 'thumb'
            newParts.pop(); // Remove the size-specific part
            const fallbackUrl = newParts.join('/');
            console.log(`[Wikimedia] String-fallback resolution: ${fallbackUrl}`);
            return fallbackUrl;
        }
    }
    
    return url;
  } catch (error) {
    console.warn(`[Wikimedia] Resolution failed: ${error.message}`);
    return url;
  }
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, "icon.png");
  try {
    tray = new Tray(iconPath);
  } catch (err) {
    console.warn("Failed to create tray icon (image missing?):", err);
    // On Linux, we might want to continue without a tray if the icon is missing
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Qnex',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (mainWindow) {
          // Force quit
          mainWindow.destroy();
        }
        if (server) {
          server.close();
        }
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Qnex');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Create main window
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Disable disk cache to prevent permission warnings
      cache: false,
      // Allow Firebase authentication
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, "icon.png"), // optional: add app icon
    autoHideMenuBar: true,
  });

  win.setMenuBarVisibility(false);

  // Allow opening external URLs (for Firebase auth)
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Firebase and Google auth URLs
    if (url.includes('accounts.google.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('googleapis.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    // Block other external URLs
    return { action: 'deny' };
  });

  // Intercept window close
  win.on('close', async (e) => {
    // Check settings for minimize to tray preference
    const settings = await readFile(FILES.settings, {});

    if (settings.minimizeToTray) {
      // Always prevent default close if we want to minimize to tray
      e.preventDefault();
      // Minimize/Hide to tray
      win.hide();

      // Ensure tray exists
      if (!tray) {
        createTray();
      }
    } else {
      // If minimizeToTray is false, allow the window to close normally
      // This will trigger app.quit() via window-all-closed event
    }
  });

  // Force hard refresh on Ctrl+R or Cmd+R to bypass cache
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      log("[SYSTEM] Aggressive Hard Refresh triggered (Ctrl+R). Purging session cache...");
      // 1. Clear session cache explicitly
      win.webContents.session.clearCache().then(() => {
        // 2. Reload with a flag so the renderer knows it was successful
        const currentURL = new URL(win.webContents.getURL());
        currentURL.searchParams.set('cacheCleared', '1');
        win.loadURL(currentURL.toString());
      });
      event.preventDefault();
    }
  });

  // Load via localhost for Firebase auth
  win.loadURL('http://localhost:8080/index.html');

  // Open DevTools in development (remove for production)
  if (process.env.NODE_ENV === "development") {
    win.webContents.openDevTools();
  }

  return win;
}

// Import gray-matter
const matter = require('gray-matter');

// IPC Handlers for file operations
// Helper to recursively read notes
async function readNotesRecursive(dir) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subResults = await readNotesRecursive(fullPath);
      results = results.concat(subResults);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const parsed = matter(content);
        results.push({
          ...parsed.data,
          contentHtml: parsed.content,
          id: parsed.data.id || path.basename(entry.name, '.md')
        });
      } catch (e) {
        console.error(`Error parsing note ${entry.name}:`, e);
      }
    }
  }
  return results;
}

ipcMain.handle("read-notes", async () => {
  const notesDir = path.join(dataDir, 'notes');
  try {
    // Ensure directory exists
    await fs.mkdir(notesDir, { recursive: true });
    return await readNotesRecursive(notesDir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error("Error reading notes directory:", err);
    return [];
  }
});

ipcMain.handle("write-note", async (event, data) => {
  const notesDir = path.join(dataDir, 'notes');
  console.log(`[IPC] write-note requested for ID: ${data.id}`);
  
  try {
    await fs.mkdir(notesDir, { recursive: true });
    
    // Determine path based on folderId if available
    let dirPath = notesDir;
    if (data.folderId) {
       // Need to reconstruct path from folders.json if we want to support nested folders
       // For now, if we match write-notes logic, we need to read folders
       try {
         const folders = await readFile(FILES.folders, []);
         const folderMap = new Map(folders.map(f => [f.id, f]));
         
         const getFolderPath = (folderId) => {
            const pathSegments = [];
            let currentId = folderId;
            while (currentId) {
                const folder = folderMap.get(currentId);
                if (folder) {
                    const safeName = (folder.name || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
                    pathSegments.unshift(safeName);
                    currentId = folder.parentId;
                } else break;
            }
            return path.join(notesDir, ...pathSegments);
         };
         dirPath = getFolderPath(data.folderId);
       } catch(e) {
         console.warn("[IPC] Failed to resolve folder path for write-note, using root:", e);
       }
    }
    
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${data.id}.md`);
    
    const { contentHtml, content, ...meta } = data;
    const body = contentHtml || content || '';
    
    const cleanMeta = {};
    Object.keys(meta).forEach(key => {
        if (meta[key] !== undefined) cleanMeta[key] = meta[key];
    });
    
    const fileContent = matter.stringify(body, cleanMeta);
    await fs.writeFile(filePath, fileContent, 'utf8');
    
    console.log(`[IPC] ✅ Saved note: ${filePath}`);
    return { success: true };
  } catch (err) {
    console.error(`[IPC] 🔴 Error writing note ${data.id}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-note", async (event, id) => {
  const notesDir = path.join(dataDir, 'notes');
  console.log(`[IPC] delete-note requested for ID: ${id}`);
  try {
    // 1. Try direct ID-based path (fastest)
    const idPath = path.join(notesDir, `${id}.md`);
    console.log(`[IPC] Checking for direct note path: ${idPath}`);
    if (await fs.stat(idPath).then(() => true).catch(() => false)) {
      await fs.unlink(idPath);
      console.log(`[IPC] ✅ Deleted note file via direct path: ${id}.md`);
      return { success: true };
    }

    // 2. Search for the file in the entire notes directory (including subdirectories)
    console.log(`[IPC] Note not found via direct path. Starting recursive search for ID: ${id}...`);
    const findAndDelete = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          console.log(`[IPC] Searching in subdirectory: ${entry.name}`);
          if (await findAndDelete(fullPath)) return true;
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const parsed = matter(content);
            if (parsed.data.id === id) {
              console.log(`[IPC] ✅ Found matching note! Deleting: ${fullPath}`);
              await fs.unlink(fullPath);
              return true;
            }
          } catch (e) {
            console.warn(`[IPC] ⚠️ Failed to read ${fullPath} during search:`, e);
          }
        }
      }
      return false;
    };

    if (await findAndDelete(notesDir)) {
      console.log(`[IPC] ✅ Successfully found and deleted note ${id} during search.`);
      return { success: true };
    }

    console.warn(`[IPC] ❌ Note ${id} NOT found on disk after full search.`);
    return { success: true }; // Return success even if not found (idempotent)
  } catch (err) {
    console.error(`[IPC] 🔴 Error during delete-note ${id}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("write-notes", async (event, data) => {
  const notesDir = path.join(dataDir, 'notes');
  console.log(`[IPC] write-notes called with ${data.length} notes`);

  try {
    await fs.mkdir(notesDir, { recursive: true });

    // 1. Get all folders to reconstruct paths
    const folders = await readFile(FILES.folders, []);
    const folderMap = new Map(folders.map(f => [f.id, f]));

    const getFolderPath = (folderId) => {
      const pathSegments = [];
      let currentId = folderId;
      while (currentId) {
        const folder = folderMap.get(currentId);
        if (folder) {
          // Use name for path, sanitized
          const safeName = (folder.name || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
          pathSegments.unshift(safeName);
          currentId = folder.parentId;
        } else {
          break;
        }
      }
      return path.join(notesDir, ...pathSegments);
    };

    // 2. Map notes to intended paths
    const notePathMap = new Map();
    for (const note of data) {
      if (!note.id) continue;
      const dirPath = note.folderId ? getFolderPath(note.folderId) : notesDir;
      const fileName = `${note.id}.md`;
      notePathMap.set(note.id, path.join(dirPath, fileName));
    }

    // 3. Write/Update notes and create directories
    for (const note of data) {
      if (!note.id) continue;
      const filePath = notePathMap.get(note.id);
      const dirPath = path.dirname(filePath);

      await fs.mkdir(dirPath, { recursive: true });

      const { contentHtml, content, ...meta } = note;
      const body = contentHtml || content || '';

      // Clean meta to remove undefined values which cause js-yaml to crash
      const cleanMeta = {};
      Object.keys(meta).forEach(key => {
        if (meta[key] !== undefined) cleanMeta[key] = meta[key];
      });

      const fileContent = matter.stringify(body, cleanMeta);

      await fs.writeFile(filePath, fileContent, 'utf8');
    }

    // 4. Cleanup orphaned files and empty directories
    const cleanup = async (currentDir) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await cleanup(fullPath);
          // Delete directory if empty
          const remaining = await fs.readdir(fullPath);
          if (remaining.length === 0) {
            await fs.rmdir(fullPath);
            console.log(`[IPC] Cleaned up empty directory: ${fullPath}`);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Check if this file is in our new notePathMap
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const parsed = matter(content);
            const noteId = parsed.data.id || path.basename(entry.name, '.md');

            const intendedPath = notePathMap.get(noteId);
            // If the note doesn't exist in the current collection, or is in the wrong place
            if (!intendedPath || path.resolve(intendedPath) !== path.resolve(fullPath)) {
              await fs.unlink(fullPath);
              console.log(`[IPC] Cleaned up orphaned/misplaced note: ${fullPath}`);
            }
          } catch (e) {
            console.warn(`[IPC] Failed to verify ${fullPath} during cleanup:`, e);
          }
        }
      }
    };

    await cleanup(notesDir);

    console.log(`[INFO] ${data.length} notes synced successfully to disk`);
    return { success: true };
  } catch (err) {
    console.error("[ERROR] Write notes sync error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("read-folders", async () => {
  return await readFile(FILES.folders, []);
});

ipcMain.handle("write-folders", async (event, data) => {
  const result = await writeFile(FILES.folders, data);
  if (result.success) {
    console.log(`[INFO] ${data.length} folder(s) saved to folders.json`);
  }
  return result;
});

ipcMain.handle("delete-folder", async (event, id) => {
  console.log(`[IPC] delete-folder requested for: ${id}`);
  const notesDir = path.join(dataDir, 'notes');

  try {
    const folders = await readFile(FILES.folders, []);
    const folder = folders.find(f => f.id === id);

    if (folder) {
      console.log(`[IPC] Reconstructing path for folder: "${folder.name}" (${id})`);
      // Reconstruct intended directory path
      const folderMap = new Map(folders.map(f => [f.id, f]));
      const getFolderPath = (fid) => {
        const segments = [];
        let cid = fid;
        while (cid) {
          const f = folderMap.get(cid);
          if (f) {
            segments.unshift(f.name.replace(/[<>:"/\\|?*]/g, '_'));
            cid = f.parentId;
          } else break;
        }
        return path.join(notesDir, ...segments);
      };

      const dirPath = getFolderPath(id);
      console.log(`[IPC] Targeted physical path for deletion: ${dirPath}`);
      if (await fs.stat(dirPath).then(s => s.isDirectory()).catch(() => false)) {
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`[IPC] ✅ Successfully deleted physical folder: ${dirPath}`);
      } else {
        console.log(`[IPC] ℹ️ Physical folder does not exist at path: ${dirPath}`);
      }
    } else {
      console.warn(`[IPC] ⚠️ Folder ${id} not found in folders.json metadata.`);
    }

    return { success: true };
  } catch (err) {
    console.error(`[IPC] 🔴 Delete folder ${id} error:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("read-settings", async () => {
  const settings = await readFile(FILES.settings, {});
  currentSettings = settings; // Cache settings on read
  return settings;
});

ipcMain.handle("write-settings", async (event, data) => {
  console.log("[SAVE] Writing settings to:", FILES.settings);
  const result = await writeFile(FILES.settings, data);
  if (result.success) {
    currentSettings = data; // Update cache
    if (data.todos) {
      console.log(`[SAVE] ${data.todos.length} todo(s) saved`);
    }
  }
  return result;
});

ipcMain.handle("read-trash", async () => {
  return await readFile(FILES.trash, []);
});

ipcMain.handle("write-trash", async (event, data) => {
  return await writeFile(FILES.trash, data);
});

ipcMain.handle("read-questions", async () => {
  return await readFile(FILES.questions, []);
});

ipcMain.handle("write-questions", async (event, data) => {
  return await writeFile(FILES.questions, data);
});

ipcMain.handle("app:getDataDir", async () => {
  return dataDir;
});

ipcMain.handle("app:openDataDirectory", async () => {
  return await shell.openPath(dataDir);
});

ipcMain.handle("app:openPath", async (event, path) => {
  try {
    return await shell.openPath(path);
  } catch (err) {
    console.error(`[IPC] openPath error for ${path}:`, err);
    return err.message;
  }
});

ipcMain.handle("app:showInExplorer", async (event, id) => {
  const notesDir = path.join(dataDir, 'notes');
  console.log(`[IPC] show-in-explorer requested for ID: ${id}`);

  try {
    // 1. Try direct ID-based path first
    const idPath = path.join(notesDir, `${id}.md`);
    if (await fs.stat(idPath).then(() => true).catch(() => false)) {
      shell.showItemInFolder(idPath);
      return { success: true };
    }

    // 2. Search recursively
    const findAndShow = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (await findAndShow(fullPath)) return true;
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const parsed = matter(content);
            if (parsed.data.id === id) {
              shell.showItemInFolder(fullPath);
              return true;
            }
          } catch (e) { }
        }
      }
      return false;
    };

    if (await findAndShow(notesDir)) return { success: true };

    // 3. Last fallback: just open the notes directory
    shell.openPath(notesDir);
    return { success: true };
  } catch (err) {
    console.error("[IPC] show-in-explorer error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("app:showFolderInExplorer", async (event, id) => {
  const notesDir = path.join(dataDir, 'notes');
  console.log(`[IPC] show-folder-in-explorer requested for: ${id}`);

  try {
    const folders = await readFile(FILES.folders, []);
    const folder = folders.find(f => f.id === id);

    if (folder) {
      const folderMap = new Map(folders.map(f => [f.id, f]));
      const segments = [];
      let cid = id;
      while (cid) {
        const f = folderMap.get(cid);
        if (f) {
          segments.unshift(f.name.replace(/[<>:"/\\|?*]/g, '_'));
          cid = f.parentId;
        } else break;
      }
      const dirPath = path.join(notesDir, ...segments);

      // Ensure directory exists before opening
      await fs.mkdir(dirPath, { recursive: true });
      shell.openPath(dirPath);
      return { success: true };
    } else if (id === "" || id === null || id === "uncategorized") {
      shell.openPath(notesDir);
      return { success: true };
    }
  } catch (err) {
    console.error("[IPC] show-folder-in-explorer error:", err);
    return { success: false, error: err.message };
  }
});

// Handle close confirmation from renderer
ipcMain.on('app-close-confirmed', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Force close regardless of settings for "Close App" button
    mainWindow.destroy();
    mainWindow = null;

    // Close server and quit app
    if (server) {
      server.close();
    }
    app.quit();
  }
});

// Start local server for Firebase auth
let server;
function freePort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`fuser -k ${port}/tcp 2>/dev/null || true`, () => {
      // Wait briefly for the port to be released
      setTimeout(resolve, 300);
    });
  });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      return handler(request, response, {
        public: __dirname
      });
    });

    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        log('[SERVER] Port 8080 in use. Freeing port and retrying...');
        await freePort(8080);
        server.listen(8080, () => {
          log('[SERVER] Running at http://localhost:8080 (after freeing port)');
          resolve();
        });
      } else {
        reject(err);
      }
    });

    server.listen(8080, () => {
      log('[SERVER] Running at http://localhost:8080');
      resolve();
    });
  });
}

// Start second server on port 3002 for health checks and logic
let server3002;
function startServer3002() {
  try {
    const expressApp = require('express')();
    const bodyParser = require('body-parser');
    const cors = require('cors');
    expressApp.use(cors());
    expressApp.use(bodyParser.json({ limit: '50mb' }));
    
    expressApp.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        message: 'Embedded FS Server v3.0 (Linux Port)',
        timestamp: new Date().toISOString()
      });
    });

    // Mirroring main server endpoints for fallback/health redundancy
    expressApp.get('/api/settings', async (req, res) => {
      const data = await readFile(FILES.settings, {});
      res.json(data);
    });

    expressApp.post('/api/settings', async (req, res) => {
      const result = await writeFile(FILES.settings, req.body);
      res.json(result);
    });

    expressApp.get('/api/notes', async (req, res) => {
      const notesDir = path.join(dataDir, 'notes');
      try {
        const files = await fs.readdir(notesDir);
        res.json({ count: files.length });
      } catch (e) {
        res.json([]);
      }
    });

    expressApp.get('/api/folders', async (req, res) => {
      const data = await readFile(FILES.folders, []);
      res.json(data);
    });

    expressApp.post('/api/folders', async (req, res) => {
      const result = await writeFile(FILES.folders, req.body);
      res.json(result);
    });

    expressApp.get('/api/trash', async (req, res) => {
      const data = await readFile(FILES.trash, []);
      res.json(data);
    });

    expressApp.post('/api/trash', async (req, res) => {
      const result = await writeFile(FILES.trash, req.body);
      res.json(result);
    });

    expressApp.get('/api/stats', async (req, res) => {
      const statsPath = path.join(dataDir, 'settings', 'stats.json');
      const data = await readFile(statsPath, {
        correct: 0,
        incorrect: 0,
        omitted: 0,
        total: 0,
        totalTime: 0,
      });
      res.json(data);
    });

    expressApp.post('/api/stats', async (req, res) => {
      const statsPath = path.join(dataDir, 'settings', 'stats.json');
      let stats = await readFile(statsPath, {
        correct: 0,
        incorrect: 0,
        omitted: 0,
        total: 0,
        totalTime: 0,
      });

      // Initialize missing fields for new tracking features
      if (stats.omitted === undefined) stats.omitted = 0;
      if (stats.totalTime === undefined) stats.totalTime = 0;
      if (stats.changesC2I === undefined) stats.changesC2I = 0;
      if (stats.changesI2C === undefined) stats.changesI2C = 0;
      if (stats.changesI2I === undefined) stats.changesI2I = 0;
      if (stats.total === undefined) stats.total = 0;
      if (stats.correct === undefined) stats.correct = 0;
      if (stats.incorrect === undefined) stats.incorrect = 0;

      const { 
        type, 
        timeSpent = 0, 
        isNewSubmission = true, 
        changeType = null, 
        adjustment = null 
      } = req.body;

      stats.totalTime += timeSpent;

      if (isNewSubmission) {
        stats.total++;
        if (type === "correct") stats.correct++;
        else if (type === "incorrect") stats.incorrect++;
        else if (type === "omitted") stats.omitted++;
      } else {
        if (changeType === 'C2I') stats.changesC2I++;
        else if (changeType === 'I2C') stats.changesI2C++;
        else if (changeType === 'I2I') stats.changesI2I++;

        if (adjustment) {
          if (adjustment.correct) stats.correct += adjustment.correct;
          if (adjustment.incorrect) stats.incorrect += adjustment.incorrect;
        }
      }

      await writeFile(statsPath, stats);
      res.json({ success: true, stats });
    });

    expressApp.get('/api/stats/sync', async (req, res) => {
      try {
        const questions = await readFile(FILES.questions, []);
        const statsPath = path.join(dataDir, 'settings', 'stats.json');
        
        let stats = {
          correct: 0,
          incorrect: 0,
          omitted: 0,
          total: 0,
          totalTime: 0,
          changesC2I: 0,
          changesI2C: 0,
          changesI2I: 0
        };

        const qList = Array.isArray(questions) ? questions : (questions.questions || []);
        
        qList.forEach(q => {
          if (q.submittedAnswer) {
            stats.total++;
            if (q.submittedAnswer.isCorrect) stats.correct++;
            else stats.incorrect++;
            
            if (q.timerElapsed) {
              stats.totalTime += Math.floor(q.timerElapsed / 1000);
            }
          }
        });

        await writeFile(statsPath, stats);
        res.json({ success: true, stats });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    expressApp.get('/api/ai/learning-data', async (req, res) => {
      try {
        const statsPath = path.join(dataDir, 'settings', 'stats.json');
        const questionsPath = FILES.questions;
        
        let stats = await readFile(statsPath, { correct: 0, incorrect: 0, total: 0 });
        const questionData = await readFile(questionsPath, { questions: [] });
        const allQuestions = Array.isArray(questionData) ? questionData : (questionData.questions || []);
        
        const examples = allQuestions
          .filter(q => q.text && q.options && q.options.length >= 2)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
          
        res.json({ examples, stats });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    expressApp.delete('/api/trash', async (req, res) => {
      const result = await writeFile(FILES.trash, []);
      res.json(result);
    });

    expressApp.post('/api/ai/chat', async (req, res) => {
      try {
        const { messages, max_tokens = 200, model } = req.body;
        const API_KEY = process.env.OPENROUTER_API_KEY;

        if (!API_KEY) {
          console.error("[AI] ERROR: OPENROUTER_API_KEY missing");
          return res.status(500).json({ error: "AI API key not configured" });
        }

        const modelToUse = model || "arcee-ai/trinity-large-preview:free";
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: modelToUse,
            messages: messages,
            max_tokens: max_tokens,
          },
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:3002",
              "X-Title": "Qnex Local",
            },
            timeout: 120000,
          }
        );
        res.json(response.data);
      } catch (error) {
        const statusCode = error.response?.status === 404 ? 502 : (error.response?.status || 500);
        res.status(statusCode).json({
          error: "Failed to get response from AI",
          details: error.response?.data || error.message
        });
      }
    });

    expressApp.post('/api/upload', async (req, res) => {
      try {
        const { image, name } = req.body;
        if (!image || !name) return res.status(400).json({ error: "Missing data" });
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const imagesDir = path.join(dataDir, "images");
        await fs.mkdir(imagesDir, { recursive: true });
        const filePath = path.join(imagesDir, name);
        await fs.writeFile(filePath, buffer);
        res.json({ success: true, url: `/api/images/${name}`, filename: name });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    expressApp.get('/api/questions', async (req, res) => {
      const data = await readFile(FILES.questions, []);
      res.json(data);
    });

    // Image Proxy Endpoint to bypass CORS
    expressApp.get("/api/proxy-image", async (req, res) => {
      let imageUrl = req.query.url;
      
      if (!imageUrl) {
        return res.status(400).send("URL parameter is required");
      }

      // Resolve Wikimedia URLs before fetching
      if (imageUrl.includes('wikimedia.org')) {
         imageUrl = await resolveWikimediaUrl(imageUrl);
      }

      console.log(`[Proxy] 📥 Request (3002) for: ${imageUrl}`);

      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        };

        // Add Referer ONLY for medical domains where it's known to be needed
        if (imageUrl.includes('nih.gov') || imageUrl.includes('ncbi.nlm.nih.gov')) {
            headers['Referer'] = 'https://www.ncbi.nlm.nih.gov/';
        }

        const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'arraybuffer',
          headers: headers,
          timeout: 20000,
          maxRedirects: 10,
          validateStatus: (status) => status === 200
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        if (contentType.includes('text/html')) {
            return res.status(404).send("Source returned HTML instead of an image");
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(response.data));
        console.log(`[Proxy] ✅ Sent ${response.data.byteLength} bytes from 3002`);
      } catch (error) {
        if (error.response) {
          console.error(`[Proxy] ❌ Source Error (3002): ${error.response.status} for ${imageUrl}`);
          return res.status(error.response.status).send(`Proxy Error: Source returned ${error.response.status}`);
        }
        console.error(`[Proxy] ❌ Network Error (3002): ${error.message}`);
        res.status(500).send(`Proxy Error: ${error.message}`);
      }
    });

    expressApp.post('/api/questions', async (req, res) => {
      const result = await writeFile(FILES.questions, req.body);
      res.json(result);
    });

    expressApp.get('/api/sessions', async (req, res) => {
      const data = await readFile(FILES.sessions, []);
      res.json(data);
    });

    expressApp.post('/api/sessions', async (req, res) => {
      const result = await writeFile(FILES.sessions, req.body);
      res.json(result);
    });

    expressApp.get('/api/tasks', async (req, res) => {
      const tasksPath = path.join(dataDir, 'tasks', 'tasks.json');
      const data = await readFile(tasksPath, []);
      res.json(data);
    });

    server3002 = expressApp.listen(3002, () => {
      log('[SERVER] Health check server running on http://localhost:3002');
    });
    server3002.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        log('[SERVER] Port 3002 in use. Freeing port and retrying...');
        await freePort(3002);
        server3002 = expressApp.listen(3002, () => {
          log('[SERVER] Health check server running on http://localhost:3002 (after freeing port)');
        });
      } else {
        log('[ERROR] Server 3002 error: ' + err.message);
      }
    });
  } catch (err) {
    log('[ERROR] Failed to start server 3002: ' + err.message);
  }
}

// PDF IPC Handlers
const { dialog } = require('electron');

ipcMain.handle('pdf:open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('pdf:read-file', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath);
        return data.toString('base64');
    } catch (err) {
        console.error("Error reading PDF file:", err);
        throw err;
    }
});

ipcMain.handle('pdf:read-annotations', async (event, filePath) => {
    const annotPath = filePath + '.annot.json';
    try {
        const data = await fs.readFile(annotPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return []; // Return empty if no annotations exist
    }
});

ipcMain.handle('pdf:save-annotations', async (event, filePath, annotations) => {
    const annotPath = filePath + '.annot.json';
    try {
        await fs.writeFile(annotPath, JSON.stringify(annotations, null, 2), 'utf8');
        return { success: true };
    } catch (err) {
        console.error("Error saving annotations:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('pdf:get-recent', async () => {
    const recentPath = path.join(dataDir, 'settings', 'recent_pdfs.json');
    return await readFile(recentPath, []);
});

ipcMain.handle('pdf:save-recent', async (event, recentList) => {
    const recentPath = path.join(dataDir, 'settings', 'recent_pdfs.json');
    return await writeFile(recentPath, recentList);
});

// HTML Study Materials IPC Handlers
const htmlMaterialsDir = path.join(dataDir, 'html_materials');
const htmlMetadataPath = path.join(htmlMaterialsDir, 'html_materials.json');

// Ensure html_materials directory exists
async function ensureHtmlDir() {
  await fs.mkdir(htmlMaterialsDir, { recursive: true });
}

ipcMain.handle('html:open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('html:import-file', async (event, filePath) => {
    try {
        await ensureHtmlDir();
        const content = await fs.readFile(filePath, 'utf8');
        
        // Extract title from HTML content or use file name
        let title = '';
        const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        } else {
            title = path.basename(filePath, path.extname(filePath));
        }

        const id = 'html_' + Date.now();
        const destPath = path.join(htmlMaterialsDir, `${id}.html`);
        await fs.writeFile(destPath, content, 'utf8');

        // Update metadata
        let metadata = [];
        try {
            const metaContent = await fs.readFile(htmlMetadataPath, 'utf8');
            metadata = JSON.parse(metaContent);
        } catch (e) {
            // File doesn't exist yet or is empty
        }

        const newEntry = {
            id,
            title,
            originalName: path.basename(filePath),
            category: 'Uncategorized',
            importedAt: new Date().toISOString()
        };

        metadata.push(newEntry);
        await fs.writeFile(htmlMetadataPath, JSON.stringify(metadata, null, 2), 'utf8');

        return { success: true, list: metadata, newItem: newEntry };
    } catch (err) {
        console.error("Error importing HTML file:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('html:get-list', async () => {
    try {
        await ensureHtmlDir();
        try {
            const metaContent = await fs.readFile(htmlMetadataPath, 'utf8');
            return JSON.parse(metaContent);
        } catch (e) {
            return [];
        }
    } catch (err) {
        console.error("Error getting HTML list:", err);
        return [];
    }
});

ipcMain.handle('html:get-file', async (event, id) => {
    try {
        const filePath = path.join(htmlMaterialsDir, `${id}.html`);
        return await fs.readFile(filePath, 'utf8');
    } catch (err) {
        console.error("Error reading HTML file:", err);
        throw err;
    }
});

ipcMain.handle('html:delete-file', async (event, id) => {
    try {
        const filePath = path.join(htmlMaterialsDir, `${id}.html`);
        try {
            await fs.unlink(filePath);
        } catch (e) {
            console.warn(`File ${filePath} could not be deleted or does not exist:`, e);
        }

        let metadata = [];
        try {
            const metaContent = await fs.readFile(htmlMetadataPath, 'utf8');
            metadata = JSON.parse(metaContent);
        } catch (e) { }

        metadata = metadata.filter(item => item.id !== id);
        await fs.writeFile(htmlMetadataPath, JSON.stringify(metadata, null, 2), 'utf8');

        return { success: true, list: metadata };
    } catch (err) {
        console.error("Error deleting HTML file:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('html:rename-file', async (event, id, newTitle) => {
    try {
        let metadata = [];
        try {
            const metaContent = await fs.readFile(htmlMetadataPath, 'utf8');
            metadata = JSON.parse(metaContent);
        } catch (e) { }

        metadata = metadata.map(item => {
            if (item.id === id) {
                return { ...item, title: newTitle };
            }
            return item;
        });

        await fs.writeFile(htmlMetadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        return { success: true, list: metadata };
    } catch (err) {
        console.error("Error renaming HTML file:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('html:set-category', async (event, id, category) => {
    try {
        let metadata = [];
        try {
            const metaContent = await fs.readFile(htmlMetadataPath, 'utf8');
            metadata = JSON.parse(metaContent);
        } catch (e) { }

        metadata = metadata.map(item => {
            if (item.id === id) {
                return { ...item, category: category || 'Uncategorized' };
            }
            return item;
        });

        await fs.writeFile(htmlMetadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        return { success: true, list: metadata };
    } catch (err) {
        console.error("Error setting category on HTML file:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('app:getStartupLogs', () => {
  return startupLogs;
});

ipcMain.on('app:log', (event, ...args) => {
  console.log('[RENDERER LOG]', ...args);
});

app.whenReady().then(async () => {
  console.log("\n");

  await ensureDataDir();
  // Load settings immediately to have them ready
  currentSettings = await readFile(FILES.settings, {});

  await startLocalServer();
  startServer3002();
  log("[OK] Ready! Starting application...");
  log("Notes saved to: " + dataDir);
  console.log("");
  mainWindow = createWindow();
  createTray(); // Initialize tray

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // If minimizing to tray is enabled, we don't quit here usually
  // But since we intercept close event, this might not even be reached unless we destroy window
  if (process.platform !== 'darwin' && (!currentSettings || !currentSettings.minimizeToTray)) {
    // app.quit(); // We rely on explicit quit
  }
});
