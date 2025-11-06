const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;

// Define data directory on D: drive
const dataDir = path.join("D:", "MyNotes");

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

// File paths
const FILES = {
  notes: path.join(dataDir, "notes.json"),
  folders: path.join(dataDir, "folders.json"),
  settings: path.join(dataDir, "settings.json"),
  trash: path.join(dataDir, "trash.json"),
};

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
    },
    icon: path.join(__dirname, "icon.png"), // optional: add app icon
  });

  win.loadFile("index.html");

  // Open DevTools in development (remove for production)
  if (process.env.NODE_ENV === "development") {
    win.webContents.openDevTools();
  }
}

// IPC Handlers for file operations
ipcMain.handle("read-notes", async () => {
  return await readFile(FILES.notes, []);
});

ipcMain.handle("write-notes", async (event, data) => {
  const result = await writeFile(FILES.notes, data);
  if (result.success) {
    console.log(`[INFO] ${data.length} note(s) in database`);
  }
  return result;
});

ipcMain.handle("read-folders", async () => {
  return await readFile(FILES.folders, []);
});

ipcMain.handle("write-folders", async (event, data) => {
  const result = await writeFile(FILES.folders, data);
  if (result.success) {
    console.log(`[INFO] ${data.length} folder(s) in database`);
  }
  return result;
});

ipcMain.handle("read-settings", async () => {
  return await readFile(FILES.settings, {});
});

ipcMain.handle("write-settings", async (event, data) => {
  console.log("[SAVE] Writing settings to:", FILES.settings);
  const result = await writeFile(FILES.settings, data);
  if (result.success && data.todos) {
    console.log(`[SAVE] ${data.todos.length} todo(s) saved`);
  }
  return result;
});

ipcMain.handle("read-trash", async () => {
  return await readFile(FILES.trash, []);
});

ipcMain.handle("write-trash", async (event, data) => {
  return await writeFile(FILES.trash, data);
});

ipcMain.handle("get-data-dir", async () => {
  return dataDir;
});

// App lifecycle
app.whenReady().then(async () => {
  console.log("\n");

  await ensureDataDir();
  console.log("[OK] Ready! Starting application...");
  console.log("Notes saved to:", dataDir);
  console.log("");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
