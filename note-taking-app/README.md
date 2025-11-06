# My Notes - Desktop App

A powerful offline note-taking application with rich text editing, folders, tags, and more.

## ✨ Features

- 📝 **Rich Text Editing** - Bold, italic, underline, lists, images
- 🎨 **Syntax Highlighting** - Auto-highlight and manual highlights with comments
- 📁 **Folder Organization** - Nested folders with drag-and-drop
- 🏷️ **Tags** - Chip-based tagging system
- 🪟 **Multi-window** - Open notes in separate windows
- 🔄 **Split View** - View two notes side-by-side (Amboss-style)
- 📌 **Pin Tabs** - Keep important notes at the front
- 💾 **File-based Storage** - Notes saved to `Documents/MyNotes/` (not browser)
- 🌙 **Dark/Light Theme** - Toggle between themes
- 📤 **Export** - Export as JSON, HTML, or PDF

## 📦 Installation & Setup

### First Time Setup

1. **Install Node.js** (if not installed)
   - Download from https://nodejs.org/ (LTS version)
   - Verify: `node --version` and `npm --version`

2. **Install Dependencies**
   ```bash
   npm install
   ```

### Running the App

#### Development Mode
```bash
npm start
```
or
```bash
npm run dev
```

This opens the app with DevTools enabled for debugging.

#### Production Mode
Just run the built `.exe` file after building (see below).

### Building for Windows

Create a standalone `.exe` installer:

```bash
npm run dist:win
```

The installer will be in the `dist/` folder:
- `My Notes Setup x.x.x.exe` - Windows installer

Double-click to install. The app will:
- Install to `C:\Program Files\My Notes\`
- Create a desktop shortcut
- Add to Start Menu

## 📂 Data Storage

**All your notes are saved to:**
```
C:\Users\YourName\Documents\MyNotes\
```

Files:
- `notes.json` - All your notes
- `folders.json` - Folder structure
- `settings.json` - Theme and preferences

**Backup:** Simply copy the `MyNotes` folder to USB/cloud for backup.

## 🔧 Project Structure

```
note-taking-app/
├── index.html          # Main UI
├── styles/
│   └── style.css       # All styles
├── scripts/
│   └── app.js          # Application logic
├── main.js             # Electron main process
├── preload.js          # Secure IPC bridge
├── package.json        # Dependencies & build config
└── README.md           # This file
```

## 🚀 Tech Stack

- **Electron** - Desktop framework
- **Vanilla JavaScript** - No frameworks, lightweight
- **HTML/CSS** - Modern UI with CSS Grid/Flexbox
- **Node.js File System** - Direct file I/O

## 🔨 Development

### Project Scripts

- `npm start` - Run in dev mode
- `npm run dev` - Run with DevTools
- `npm run pack` - Build unpacked (for testing)
- `npm run dist` - Build installer for current OS
- `npm run dist:win` - Build Windows installer

### Adding Features

1. Edit `scripts/app.js` for app logic
2. Edit `styles/style.css` for UI changes
3. Edit `index.html` for structure
4. Electron code in `main.js` and `preload.js`

## 📝 Usage Tips

### Split View
- Click any note → Opens in left pane
- Click another note → Auto-splits and opens in right pane
- Drag the divider to resize
- Close right pane → Split auto-collapses

### Keyboard Shortcuts
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + U` - Underline
- `Enter` - Auto-continue lists

### Tags
- Type a tag in "Add tag..." field
- Press `Enter` or `,` to add
- Click `×` on chip to remove

### Images
- Paste from clipboard
- Drag image to move it
- Click image → Resize with slider

## 🐛 Troubleshooting

**App won't start?**
- Make sure Node.js is installed
- Run `npm install` again
- Delete `node_modules` and run `npm install`

**Notes not saving?**
- Check `Documents/MyNotes/` folder exists
- Ensure you have write permissions
- Try running as administrator

**Build fails?**
- Update npm: `npm install -g npm@latest`
- Clear cache: `npm cache clean --force`
- Delete `node_modules`, `package-lock.json`, run `npm install`

## 📄 License

MIT License - Use freely!

## 🙋 Support

For issues or questions, check:
- Electron docs: https://www.electronjs.org/docs
- Node.js docs: https://nodejs.org/docs

---

**Made with ❤️ - Offline, secure, and yours forever.**
