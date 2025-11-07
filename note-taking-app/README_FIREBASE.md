# My Notes - Firebase Cloud Edition

A powerful note-taking application with cloud storage, user authentication, and multi-device sync powered by Firebase.

## 🎉 New Features

### ✅ User Authentication
- **Email/Password Login**: Create an account with your email
- **Google Sign-In**: Quick login with your Google account
- **Secure Sessions**: Automatic session management and logout

### ✅ Cloud Storage
- **Firestore Database**: All notes, folders, and settings saved to the cloud
- **Firebase Storage**: Images uploaded to cloud storage with unique URLs
- **Never Lose Data**: Your notes are safe even if you clear browser data

### ✅ Per-User Data Isolation
- **Private Accounts**: Each user has completely isolated data
- **Fresh Start**: New accounts start with an empty workspace
- **Secure**: Firebase security rules prevent unauthorized access

### ✅ Image Support
- **Upload Images**: Paste or upload images directly into notes
- **Cloud Storage**: Images stored in Firebase Storage
- **Organized**: Images organized per note and per user

## 🚀 Getting Started

### Prerequisites
- A Google account (for Firebase)
- A web browser
- Text editor (to update config file)

### Setup Steps

1. **Open START_HERE.html**
   - Double-click `START_HERE.html` for a visual setup guide

2. **Follow the Quick Setup**
   - Create Firebase project
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase configuration
   - Update `scripts/firebase-config.js`
   - Set security rules

3. **Start Using**
   - Open `login.html` in your browser
   - Create an account or sign in
   - Start taking notes!

### Detailed Documentation

- **[START_HERE.html](START_HERE.html)** - Visual setup guide (recommended)
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Complete setup instructions
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Migration info and architecture

## 📁 Project Structure

```
note-taking-app/
├── login.html                  # Login/signup page (start here)
├── index.html                  # Main app (requires login)
├── START_HERE.html            # Setup guide
│
├── scripts/
│   ├── firebase-config.js     # Firebase configuration (UPDATE THIS!)
│   ├── firebase-service.js    # Firebase operations
│   ├── firebase-check.js      # Config validation
│   ├── auth.js                # Authentication logic
│   ├── app.js                 # Main app logic
│   └── custom-features.js     # Additional features
│
├── styles/
│   ├── login.css              # Login page styles
│   └── style.css              # Main app styles
│
└── docs/
    ├── FIREBASE_SETUP.md      # Setup guide
    └── MIGRATION_GUIDE.md     # Migration info
```

## 🔧 Configuration

### Firebase Config (REQUIRED)

Edit `scripts/firebase-config.js` and replace these values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                    // From Firebase Console
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Security Rules

**Firestore Rules** (in Firebase Console → Firestore → Rules):
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

**Storage Rules** (in Firebase Console → Storage → Rules):
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

## 💾 Data Structure

### Firestore Collections
```
users/
  {userId}/
    notes/          # User's notes
    folders/        # User's folders
    settings/       # User preferences
    trash/          # Deleted items
```

### Storage Structure
```
users/
  {userId}/
    notes/
      {noteId}/
        images/     # Note images
```

## 🎨 Features

### Note Management
- ✅ Create, edit, delete notes
- ✅ Organize with folders
- ✅ Search notes by title, content, or tags
- ✅ Rich text editing
- ✅ Image support with cloud storage

### User Features
- ✅ Email/password authentication
- ✅ Google Sign-In
- ✅ User profile display
- ✅ Secure logout
- ✅ Isolated user data

### Cloud Features
- ✅ Automatic save to Firestore
- ✅ Image upload to Firebase Storage
- ✅ Real-time sync capabilities
- ✅ Secure data access

## 🔒 Security

### Authentication
- Passwords hashed by Firebase
- OAuth 2.0 for Google Sign-In
- Automatic session management
- Secure token handling

### Data Protection
- User data completely isolated
- Security rules enforce access control
- All operations require authentication
- Images stored with user-specific paths

## 💰 Cost

Firebase offers a generous **free tier**:
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5GB storage, 1GB/day downloads
- **Authentication**: Unlimited users

For personal use, you'll likely stay within the free tier.

## 🐛 Troubleshooting

### "Firebase configuration not found"
- Update `scripts/firebase-config.js` with your actual Firebase config
- Make sure all placeholder values are replaced

### "Not authenticated" error
- Make sure you're logged in
- Check that Authentication is enabled in Firebase Console
- Verify your email/password or Google Sign-In is set up

### Notes not saving
- Check browser console for errors
- Verify Firestore security rules are set correctly
- Ensure you're logged in with a valid account

### Images not uploading
- Check Firebase Storage is enabled
- Verify Storage security rules
- Check file size (default limit is 10MB)

## 📱 Deployment

### Firebase Hosting (Recommended)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy
```

### Other Options
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

## 🔄 Offline Support (Future)

To enable offline persistence, add to `firebase-service.js`:

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  console.log('Offline persistence error:', err.code);
});
```

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Storage](https://firebase.google.com/docs/storage)

## 🆘 Support

1. Check `FIREBASE_SETUP.md` for detailed setup instructions
2. Review browser console for error messages
3. Verify Firebase Console settings
4. Check [Firebase Status](https://status.firebase.google.com/)

## 📝 License

This project is open source and available for personal use.

## 🎯 Next Steps

After setup:
1. ✅ Create your first account
2. ✅ Import existing notes (if any)
3. 📱 Deploy to Firebase Hosting
4. 🔄 Enable offline persistence
5. 📧 Add email verification
6. 🔐 Add password reset

---

**Ready to get started?** Open `START_HERE.html` or `login.html` in your browser!

Enjoy your cloud-powered note-taking experience! 🎉
