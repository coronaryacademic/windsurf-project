# File-Based Save System - UPDATED TO ELECTRON

⚠️ **This document is outdated. The app now uses Electron backend for file saving.**

👉 **See [ELECTRON_FILE_SYSTEM.md](./ELECTRON_FILE_SYSTEM.md) for current documentation.**

---

## Old Browser-Based System (Deprecated)

Your note-taking app **previously used browser File System Access API** but now uses Electron for better reliability:

## 🎯 How It Works

### First Time Save (Like "Save As")
1. Press **Ctrl+S** (or Cmd+S on Mac)
2. Browser shows file picker dialog
3. Choose where to save your file (e.g., `my-notes.json`)
4. File is saved to your hard drive
5. File handle is remembered for future saves

### Subsequent Saves (Like "Save")
1. Press **Ctrl+S** again
2. **No dialog appears** - file saves directly to the same location
3. You see a notification: "✓ Saved X notes"
4. Works exactly like Word - instant save to the same file

### Auto-Save Feature
- Once you've saved a file, auto-save activates
- Automatically saves every **30 seconds**
- Runs in the background silently
- Console shows: "🔄 Auto-saving..." and "✓ Auto-save complete"

### File Persistence
- File handle is stored in **IndexedDB** (browser database)
- Survives browser restarts
- When you reopen the app, it automatically:
  - Finds your saved file
  - Loads notes from it
  - Shows filename in header: "- my-notes"
  - Resumes auto-save

## 📁 Menu Options

### Tools Menu
1. **Import Notes** - Open a notes file from hard drive
2. **Save As...** - Save to a new file location
3. All other existing tools (Export, Backup, etc.)

## 🔑 Keyboard Shortcuts

- **Ctrl+S** (Cmd+S) - Save to file
- **F12** - Toggle fullscreen mode

## 💾 What Gets Saved

The JSON file contains:
- ✅ All notes (title, content, tags)
- ✅ All folders and organization
- ✅ All images (base64 encoded)
- ✅ Theme settings
- ✅ Complete app state

## 🌐 Browser Compatibility

**Works in:**
- ✅ Chrome
- ✅ Edge
- ✅ Opera

**Not supported:**
- ❌ Firefox (File System Access API not available)
- ❌ Safari (limited support)

If browser doesn't support it, you'll see: "⚠ Your browser doesn't support file saving"

## 🔄 Auto-Load on Startup

When you launch the app:
1. Checks IndexedDB for saved file handle
2. If found, displays filename in header
3. Automatically loads notes from that file
4. File becomes the "source of truth"
5. Auto-save starts running

## 📝 Example Workflow

```
Day 1:
1. Create some notes
2. Press Ctrl+S
3. Save as "work-notes.json" in Documents folder
4. Continue working - auto-saves every 30 seconds

Day 2:
1. Open app
2. Automatically loads "work-notes.json"
3. All your notes are there
4. Make changes
5. Press Ctrl+S or wait for auto-save
6. Changes saved to same file
```

## 🛡️ Safety Features

1. **Permission Verification** - Checks file access before each save
2. **Auto-Recovery** - Still has 60-second localStorage backup
3. **Error Handling** - Shows notifications if save fails
4. **Data Validation** - Checks file structure before loading

## 🎨 UI Indicators

- **Header Display**: Shows current filename (e.g., "- work-notes")
- **Notifications**: 
  - Green: "✓ Saved X notes" (success)
  - Red: "⚠ Error saving file" (error)
  - Blue: "📁 Go to Tools → Import Notes..." (info)

## 🔧 Technical Details

- Uses **File System Access API** (modern browser feature)
- File handle stored in **IndexedDB** (persists across sessions)
- Auto-save interval: **30 seconds**
- File format: **JSON** with pretty formatting
- Suggested filename: `my-notes.json`

## 🚀 Getting Started

1. Launch your app via cmd
2. Create a note
3. Press **Ctrl+S**
4. Choose save location
5. Done! File is now your permanent storage

Your notes are now saved like a real desktop application! 🎉
