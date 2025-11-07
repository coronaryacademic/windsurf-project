# Firebase Setup Guide for My Notes App

This guide will help you set up Firebase for your note-taking application to enable cloud storage and authentication.

## Prerequisites

- A Google account
- Your note-taking app files

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "my-notes-app")
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "My Notes Web App")
3. **Check** "Also set up Firebase Hosting" (optional but recommended)
4. Click "Register app"
5. **Copy the Firebase configuration object** - you'll need this in Step 5

The config object looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 3: Enable Authentication

1. In the Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable the following providers:
   - **Email/Password**: Click on it, toggle "Enable", and click "Save"
   - **Google**: Click on it, toggle "Enable", select a support email, and click "Save"

## Step 4: Set Up Firestore Database

1. In the Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add security rules next)
4. Select a Cloud Firestore location (choose one close to your users)
5. Click "Enable"

### Add Security Rules

1. Go to the **Rules** tab in Firestore
2. Replace the default rules with the following:

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

3. Click "Publish"

## Step 5: Set Up Firebase Storage

1. In the Firebase Console, go to **Build** → **Storage**
2. Click "Get started"
3. Choose **Start in production mode**
4. Select the same location as your Firestore database
5. Click "Done"

### Add Storage Security Rules

1. Go to the **Rules** tab in Storage
2. Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 6: Configure Your App

1. Open `scripts/firebase-config.js` in your note-taking app
2. Replace the placeholder values with your actual Firebase configuration from Step 2:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // Replace with your actual API key
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 7: Test Your Setup

1. Open `login.html` in your browser
2. Try creating a new account with email/password
3. Or sign in with Google
4. You should be redirected to `index.html` after successful login
5. Create a note and verify it's saved to Firestore:
   - Go to Firebase Console → Firestore Database
   - You should see a `users` collection with your user ID
   - Inside, you'll find `notes`, `folders`, and `settings` subcollections

## Data Structure

Your data is organized in Firestore as follows:

```
users/
  {userId}/
    notes/
      {noteId}/
        - id: string
        - title: string
        - content: string
        - tags: array
        - createdAt: timestamp
        - updatedAt: timestamp
        - userId: string
    
    folders/
      {folderId}/
        - id: string
        - name: string
        - icon: string
        - notes: array
        - updatedAt: timestamp
        - userId: string
    
    settings/
      preferences/
        - theme: string
        - foldersOpen: array
        - updatedAt: timestamp
    
    trash/
      {itemId}/
        - (deleted items)
        - deletedAt: timestamp
```

Images are stored in Firebase Storage:
```
users/
  {userId}/
    notes/
      {noteId}/
        images/
          {timestamp}_{filename}
```

## Features

### ✅ User Authentication
- Email/password signup and login
- Google Sign-In
- Secure session management
- Automatic redirect to login when not authenticated

### ✅ Per-User Data Isolation
- Each user has their own isolated data
- Notes, folders, and settings are private to each account
- New accounts start with a fresh, empty workspace

### ✅ Cloud Storage
- Notes are automatically saved to Firestore
- Images are uploaded to Firebase Storage
- Real-time sync capabilities (optional)

### ✅ Image Support
- Upload images to notes
- Images are stored in Firebase Storage
- Each image gets a unique URL
- Images are organized per note and per user

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure you've replaced the placeholder values in `firebase-config.js` with your actual Firebase configuration

### "Missing or insufficient permissions"
- Check that your Firestore and Storage security rules are set up correctly
- Ensure you're logged in with a valid account

### Images not uploading
- Verify Firebase Storage is enabled
- Check Storage security rules
- Ensure the user is authenticated

### Can't sign in
- Check that Email/Password and Google authentication are enabled in Firebase Console
- Verify your Firebase configuration is correct
- Check browser console for specific error messages

## Security Best Practices

1. **Never commit your Firebase config with real keys to public repositories**
2. Keep your Firebase API keys secure
3. Use Firebase security rules to protect user data
4. Regularly review access logs in Firebase Console
5. Enable App Check for additional security (optional)

## Next Steps

- Consider enabling Firebase Hosting to deploy your app
- Set up Firebase Analytics to track usage
- Implement offline persistence with Firestore
- Add email verification for new accounts
- Set up password reset functionality

## Support

For more information, visit:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
