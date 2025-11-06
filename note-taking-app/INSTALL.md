# Quick Install Guide

## 🚀 Get Started in 3 Steps

### 1. Install Node.js
If you don't have Node.js installed:
1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer
4. Verify installation: Open Command Prompt and run:
   ```bash
   node --version
   npm --version
   ```

### 2. Install Dependencies
Open Command Prompt in this folder and run:
```bash
npm install
```

Wait for it to download all dependencies (~2-3 minutes).

### 3. Run the App

#### Option A: Run Now (Development)
```bash
npm start
```

#### Option B: Build Installer
```bash
npm run dist:win
```

Then install `dist/My Notes Setup 1.0.0.exe`

## ✅ Done!

Your notes are saved to:
```
C:\Users\YourName\Documents\MyNotes\
```

**Never lose your notes again!** 🎉

## ❓ Need Help?

**App won't start?**
- Make sure you ran `npm install` first
- Try closing and reopening Command Prompt
- Run as Administrator

**Still stuck?**
- Check README.md for detailed troubleshooting
- Make sure you're in the right folder when running commands
