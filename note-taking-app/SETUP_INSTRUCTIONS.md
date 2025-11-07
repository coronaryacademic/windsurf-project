# Setup Instructions - Google Sign-In Only

## ✅ Your Configuration

Your Firebase app is now configured with:
- **Project ID**: note-5401e
- **Authentication**: Google Sign-In only
- **Database**: Firestore (for notes, folders, settings)
- **Storage**: Disabled (images stored as base64 in Firestore)

## 🚀 Quick Setup (2 Steps)

### Step 1: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **note-5401e**
3. Click **Build** → **Authentication**
4. Click **Get started** (if not already enabled)
5. Go to **Sign-in method** tab
6. Click on **Google**
7. Toggle **Enable**
8. Select a support email from the dropdown
9. Click **Save**

### Step 2: Set Firestore Security Rules

1. In Firebase Console, go to **Build** → **Firestore Database**
2. If not created yet, click **Create database**
   - Choose **Start in production mode**
   - Select a location (choose closest to you)
   - Click **Enable**
3. Go to the **Rules** tab
4. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Click **Publish**

## ✅ That's It!

Your app is now ready to use!

1. Open `login.html` in your browser
2. Click "Continue with Google"
3. Select your Google account
4. Start taking notes!

## 📝 How It Works

### Authentication
- **Google Sign-In only** - No email/password needed
- Click the Google button to sign in
- Your Google account is your login

### Data Storage
- **Notes**: Saved to Firestore database
- **Folders**: Saved to Firestore database
- **Settings**: Saved to Firestore database
- **Images**: Stored as base64 data URLs inside note content (no separate storage needed)

### Data Isolation
- Each Google account has completely separate data
- Your notes are private and secure
- No one else can access your notes

## 🔒 Security

Your data is protected by:
- Firebase Authentication (Google OAuth)
- Firestore security rules (user-specific access)
- Each user can only access their own data

## 💾 Image Handling

Since Firebase Storage requires a payment method, images are handled differently:

- **Before**: Images uploaded to Firebase Storage
- **Now**: Images converted to base64 and stored in note content
- **Result**: No separate storage needed, everything in Firestore

**Note**: This means images are part of the note document. Very large images may increase note size, but for normal use this works perfectly.

## 🐛 Troubleshooting

### "Pop-up was blocked"
**Solution**: Allow pop-ups for this site in your browser settings

### "Failed to sign in with Google"
**Solutions**:
- Check that Google Sign-In is enabled in Firebase Console
- Make sure you selected a support email
- Try a different browser
- Clear browser cache and try again

### "Permission denied" when saving notes
**Solutions**:
- Make sure you're signed in
- Check that Firestore security rules are set correctly
- Verify the rules match exactly as shown above

### Notes not saving
**Solutions**:
- Check browser console for errors (F12)
- Verify Firestore is enabled
- Make sure security rules are published
- Try signing out and back in

## 📊 Firebase Free Tier

Your usage will stay within the free tier:
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Authentication**: Unlimited Google Sign-Ins

For personal note-taking, you'll use:
- ~1-10MB of Firestore storage
- ~50-200 reads/writes per day

**Result**: Completely free! ✅

## 🎯 Next Steps

1. ✅ Enable Google Sign-In (Step 1 above)
2. ✅ Set Firestore rules (Step 2 above)
3. ✅ Open `login.html` and sign in
4. ✅ Create your first note
5. ✅ Verify it saves to Firestore (check Firebase Console)

## 📱 Using the App

### Sign In
1. Open `login.html`
2. Click "Continue with Google"
3. Select your Google account
4. You're in!

### Create Notes
1. Click "+ New" button
2. Type your note
3. Auto-saves to Firestore

### Add Images
1. Paste image (Ctrl+V)
2. Or drag and drop
3. Image converts to base64 automatically

### Sign Out
1. Click Settings (gear icon)
2. Click "Logout"
3. Confirm

## 🔄 Multiple Devices

Since your notes are in the cloud:
- Sign in on any device with your Google account
- All your notes will be there
- Changes sync automatically

## ✨ Features

- ✅ Google Sign-In (one click)
- ✅ Cloud storage (Firestore)
- ✅ Auto-save
- ✅ Image support (base64)
- ✅ Folders and organization
- ✅ Search functionality
- ✅ Multiple devices
- ✅ Secure and private

## 📞 Need Help?

1. Check this guide first
2. Look at browser console (F12) for errors
3. Verify Firebase Console settings
4. Check [Firebase Status](https://status.firebase.google.com/)

---

**Your app is configured and ready!** Just complete the 2 setup steps above and start using it! 🎉
