# Electron File System - Hard Drive Saving

Your note-taking app now saves **directly to your hard drive** through the Node.js backend!

## 🎯 How It Works

### **Automatic Hard Drive Saving**
- All notes are saved to: `D:\MyNotes\`
- Files are saved as JSON on your hard drive
- No browser dialogs or prompts
- Works exactly like a desktop application

### **File Structure**
```
D:\MyNotes\
├── notes.json      (all your notes)
├── folders.json    (folder structure)
├── settings.json   (theme and preferences)
└── trash.json      (deleted items)
```

## 💾 Save Methods

### **1. Auto-Save (Every 30 seconds)**
- Automatically saves to hard drive
- Runs silently in background
- Console shows: "🔄 Auto-saving to hard drive..."
- No action needed from you

### **2. Manual Save (Ctrl+S)**
- Press **Ctrl+S** anytime
- Instantly saves to `D:\MyNotes\`
- Shows notification: "✓ Saved X notes to hard drive"
- No file picker dialog

### **3. Real-Time Saving**
- Every change is automatically saved through the Storage adapter
- Notes, folders, and settings all persist
- Uses Electron IPC (Inter-Process Communication)

## 🔄 How Data Flows

```
Frontend (Browser)
    ↓
Electron IPC
    ↓
Node.js Backend (main.js)
    ↓
File System (D:\MyNotes\)
```

### **Save Operation:**
1. You edit a note in the browser
2. Frontend calls `window.electronAPI.writeNotes(data)`
3. Backend receives IPC message
4. Node.js writes JSON file to `D:\MyNotes\notes.json`
5. Success notification appears

### **Load Operation:**
1. App starts
2. Frontend calls `window.electronAPI.readNotes()`
3. Backend reads `D:\MyNotes\notes.json`
4. Data sent back to frontend via IPC
5. Notes appear in sidebar

## 📁 File Locations

All files are stored in: **`D:\MyNotes\`**

You can:
- ✅ Backup this folder
- ✅ Copy it to another computer
- ✅ Edit JSON files manually (if needed)
- ✅ Version control with Git

## 🔧 Technical Details

### **Backend (main.js)**
```javascript
const dataDir = path.join("D:", "MyNotes");

ipcMain.handle("write-notes", async (event, data) => {
  await writeFile(FILES.notes, data);
});

ipcMain.handle("read-notes", async () => {
  return await readFile(FILES.notes, []);
});
```

### **Frontend (app.js)**
```javascript
const Storage = {
  isElectron: typeof window.electronAPI !== "undefined",
  
  async saveNotes(data) {
    if (this.isElectron) {
      await window.electronAPI.writeNotes(data);
    }
  }
};
```

### **Preload Bridge (preload.js)**
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  readNotes: () => ipcRenderer.invoke('read-notes'),
  writeNotes: (data) => ipcRenderer.invoke('write-notes', data),
});
```

## 🎨 UI Indicators

**Header Display:**
- Shows: "💾 Auto-saved to D:\MyNotes"
- Confirms files are being saved to hard drive

**Notifications:**
- Green: "✓ Saved X notes to hard drive" (success)
- Red: "⚠ Error saving to hard drive" (error)
- Blue: Console logs for debugging

## 🚀 Getting Started

1. Launch app via `launch.bat`
2. Create notes
3. They're automatically saved to `D:\MyNotes\`
4. Close app
5. Reopen - all notes are still there!

## 🔒 Data Safety

### **Multiple Backup Layers:**
1. **Hard Drive Files** - Primary storage in `D:\MyNotes\`
2. **Auto-Save** - Every 30 seconds
3. **Real-Time Sync** - Every change triggers save
4. **localStorage** - Browser cache backup
5. **Auto-Recovery** - 60-second emergency backup

### **Backup Your Data:**
Simply copy the `D:\MyNotes\` folder to:
- External hard drive
- Cloud storage (Dropbox, Google Drive)
- USB flash drive
- Another computer

## 🆚 Comparison: Browser vs Electron

| Feature | Browser (Old) | Electron (New) |
|---------|--------------|----------------|
| Storage | File System Access API | Node.js File System |
| Location | User chooses | Fixed: D:\MyNotes |
| Permissions | Requires browser permission | Direct access |
| File Picker | Shows every time | Never shows |
| Auto-Save | After first save | Always active |
| Reliability | Browser-dependent | Always works |
| Cross-Session | Needs re-permission | Automatic |

## 📝 Console Messages

When saving:
```
=== SAVE TO HARD DRIVE STARTED ===
Saving to hard drive:
- Notes: 5
- Folders: 2
[SAVE] Saving notes.json...
[SAVED] notes.json saved successfully
[INFO] 5 note(s) in database
✓ All data saved to hard drive
=== SAVE COMPLETED ===
```

When loading:
```
✓ Running in Electron - using backend file system
✓ Data directory: D:\MyNotes
✓ Auto-save enabled (every 30 seconds)
```

## 🎯 Key Benefits

1. **No Browser Limitations** - Direct file system access
2. **No Permissions** - No browser security prompts
3. **Automatic** - No user interaction needed
4. **Reliable** - Always saves to same location
5. **Portable** - Just copy the folder
6. **Professional** - Works like Word, Excel, etc.

## 🔍 Troubleshooting

**Notes not saving?**
- Check console for error messages
- Verify `D:\MyNotes\` folder exists
- Check file permissions on D: drive

**Can't find saved files?**
- Navigate to `D:\MyNotes\`
- Look for `notes.json`, `folders.json`
- Files are in JSON format

**Want to change save location?**
- Edit `main.js` line 6:
  ```javascript
  const dataDir = path.join("D:", "MyNotes");
  ```
- Change to any path you want

## 🎉 Summary

Your notes app now works like a **real desktop application**:
- ✅ Saves to hard drive automatically
- ✅ No browser dialogs or prompts
- ✅ Files persist forever
- ✅ Easy to backup
- ✅ Professional and reliable

**Location:** `D:\MyNotes\`  
**Auto-Save:** Every 30 seconds  
**Manual Save:** Ctrl+S  
**Status:** Always visible in header
