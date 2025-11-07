# Quick Reference Guide

## 🚀 Getting Started

### First Time Setup
1. Open `START_HERE.html` in browser
2. Follow the 8-step setup guide
3. Update `scripts/firebase-config.js`
4. Open `login.html` and create account

### Daily Use
1. Open `login.html`
2. Sign in with your credentials
3. Start taking notes!

---

## 🔑 Firebase Console Quick Links

| Task | Location in Firebase Console |
|------|------------------------------|
| Create project | https://console.firebase.google.com/ |
| Enable Authentication | Build → Authentication → Sign-in method |
| Enable Firestore | Build → Firestore Database |
| Enable Storage | Build → Storage |
| View users | Build → Authentication → Users |
| View notes data | Build → Firestore Database → users |
| View images | Build → Storage → users |
| Set Firestore rules | Build → Firestore Database → Rules |
| Set Storage rules | Build → Storage → Rules |

---

## 📝 Common Tasks

### Create a New Account
1. Open `login.html`
2. Click "Sign up"
3. Enter email and password (min 6 characters)
4. Click "Create Account"

### Login
1. Open `login.html`
2. Enter email and password
3. Click "Sign In"

### Google Sign-In
1. Open `login.html`
2. Click "Continue with Google"
3. Select your Google account

### Logout
1. In the app, click Settings (gear icon)
2. Click "Logout"
3. Confirm logout

### Create a Note
1. Click "+ New" button
2. Enter title
3. Start typing content
4. Auto-saves to Firebase

### Upload Image
1. Open a note
2. Paste image (Ctrl+V)
3. Or drag and drop image
4. Image uploads to Firebase Storage

### Create Folder
1. Right-click in sidebar
2. Select "New Subfolder"
3. Enter folder name
4. Choose icon

### Search Notes
1. Click search box in sidebar
2. Type search term
3. Results show matching notes

---

## 🔧 Configuration

### Update Firebase Config
**File**: `scripts/firebase-config.js`

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Firestore Security Rules
**Location**: Firebase Console → Firestore → Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Security Rules
**Location**: Firebase Console → Storage → Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🐛 Troubleshooting

### Problem: Can't login
**Solutions**:
- Check Firebase config in `firebase-config.js`
- Verify Authentication is enabled in Firebase Console
- Check browser console for errors
- Try different browser

### Problem: Notes not saving
**Solutions**:
- Check you're logged in
- Verify Firestore is enabled
- Check Firestore security rules
- Look at browser console for errors

### Problem: Images not uploading
**Solutions**:
- Verify Storage is enabled
- Check Storage security rules
- Check file size (max 10MB by default)
- Check browser console

### Problem: "Permission denied"
**Solutions**:
- Verify security rules are set correctly
- Make sure you're logged in
- Check that userId matches in rules

### Problem: "Firebase not configured"
**Solutions**:
- Update `scripts/firebase-config.js`
- Replace all "YOUR_" placeholders
- Check config format is correct

---

## 📊 Data Locations

### Where is my data stored?

| Data Type | Location |
|-----------|----------|
| Notes | Firestore: `users/{userId}/notes/` |
| Folders | Firestore: `users/{userId}/folders/` |
| Settings | Firestore: `users/{userId}/settings/` |
| Trash | Firestore: `users/{userId}/trash/` |
| Images | Storage: `users/{userId}/notes/{noteId}/images/` |

### How to view data?

1. **Notes**: Firebase Console → Firestore Database → users → {your-user-id} → notes
2. **Images**: Firebase Console → Storage → users → {your-user-id} → notes

---

## 💾 Backup & Export

### Export All Notes
1. Click Settings (gear icon)
2. Click Tools menu
3. Click "Export Notes"
4. Save JSON file

### Import Notes
1. Click Settings (gear icon)
2. Click Tools menu
3. Click "Import Notes"
4. Select JSON file

### Manual Backup (Firestore)
1. Go to Firebase Console
2. Firestore Database
3. Click "Import/Export"
4. Export to Cloud Storage

---

## 🔐 Security Best Practices

### ✅ Do
- Use strong passwords (8+ characters, mixed case, numbers)
- Enable 2FA on your Google account
- Keep Firebase config private
- Regularly review Firebase Console for unusual activity
- Use different passwords for different accounts

### ❌ Don't
- Share your Firebase config publicly
- Use simple passwords
- Share your account credentials
- Commit Firebase config to public repos
- Disable security rules

---

## 📱 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New note | Ctrl+N |
| Save note | Ctrl+S |
| Search notes | Ctrl+F |
| Bold text | Ctrl+B |
| Underline | Ctrl+U |
| Close tab | Ctrl+O |
| Toggle sidebar | Ctrl+. |
| Fullscreen | F12 |

---

## 🌐 Browser Support

### Recommended
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

### Not Supported
- ❌ Internet Explorer
- ❌ Very old browsers

---

## 💰 Cost Tracking

### Free Tier Limits
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5GB storage, 1GB/day downloads
- **Authentication**: Unlimited

### How to Monitor Usage
1. Firebase Console → Usage and billing
2. View current usage
3. Set up budget alerts (optional)

### Typical Usage (Personal)
- **100 notes**: ~1MB Firestore
- **50 images**: ~25MB Storage
- **Daily operations**: ~100 reads, ~20 writes

**Result**: Well within free tier ✅

---

## 📞 Support & Help

### Documentation Files
- `START_HERE.html` - Visual setup guide
- `FIREBASE_SETUP.md` - Detailed setup instructions
- `MIGRATION_GUIDE.md` - Migration information
- `README_FIREBASE.md` - Complete documentation
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_SUMMARY.md` - What was changed

### External Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Status](https://status.firebase.google.com/)

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `auth/user-not-found` | Email not registered | Create new account |
| `auth/wrong-password` | Incorrect password | Check password or reset |
| `auth/email-already-in-use` | Email exists | Use different email or login |
| `permission-denied` | No access to data | Check security rules |
| `auth/network-request-failed` | No internet | Check connection |

---

## 🎯 Quick Commands

### Check Firebase Status
Open browser console (F12) and look for:
```
✅ Firebase configuration looks good!
App initialized with user: your-email@example.com
```

### Test Authentication
```javascript
// In browser console
console.log(window.firebaseService.currentUser);
```

### Check User ID
```javascript
// In browser console
console.log(window.firebaseService.getUserId());
```

### Force Logout
```javascript
// In browser console
await window.firebaseService.logout();
```

---

## 🔄 Update Checklist

When updating Firebase config:
- [ ] Update `apiKey`
- [ ] Update `authDomain`
- [ ] Update `projectId`
- [ ] Update `storageBucket`
- [ ] Update `messagingSenderId`
- [ ] Update `appId`
- [ ] Test login
- [ ] Test note creation
- [ ] Test image upload

---

## ✨ Tips & Tricks

### Faster Login
- Use Google Sign-In for one-click login
- Browser will remember your session

### Organize Notes
- Use folders to categorize notes
- Use tags for easy searching
- Pin important notes

### Search Effectively
- Search by title, content, or tags
- Use specific keywords
- Clear search to see all notes

### Image Best Practices
- Optimize images before upload
- Use reasonable file sizes
- Name images descriptively

### Backup Strategy
- Export notes weekly
- Keep backup JSON file safe
- Consider Firebase automatic backups

---

## 🎓 Learning Path

### Beginner
1. ✅ Set up Firebase
2. ✅ Create first account
3. ✅ Create first note
4. ✅ Upload first image

### Intermediate
1. ✅ Organize with folders
2. ✅ Use tags effectively
3. ✅ Export/import notes
4. ✅ Customize settings

### Advanced
1. 🔧 Deploy to Firebase Hosting
2. 🔧 Enable offline persistence
3. 🔧 Add email verification
4. 🔧 Set up custom domain

---

## 📋 Checklist: Is Everything Working?

- [ ] Can login with email/password
- [ ] Can login with Google
- [ ] Can create new note
- [ ] Note appears in Firestore Console
- [ ] Can upload image
- [ ] Image appears in Storage Console
- [ ] Can create folder
- [ ] Can search notes
- [ ] Can export notes
- [ ] Can logout
- [ ] Can login again (data persists)
- [ ] Second account has separate data

If all checked: **You're all set! 🎉**

---

**Last Updated**: November 7, 2024  
**Version**: 1.0 (Firebase Edition)
