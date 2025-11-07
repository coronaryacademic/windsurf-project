# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                    ┌──────────────┐          │
│  │  login.html  │                    │  index.html  │          │
│  │              │                    │              │          │
│  │ - Email/Pass │                    │ - Note Editor│          │
│  │ - Google SSO │                    │ - Folders    │          │
│  │              │                    │ - Settings   │          │
│  └──────┬───────┘                    └──────┬───────┘          │
│         │                                   │                  │
│         │                                   │                  │
│  ┌──────▼───────────────────────────────────▼───────┐          │
│  │           scripts/auth.js                        │          │
│  │           scripts/app.js                         │          │
│  │           scripts/firebase-service.js            │          │
│  └──────────────────────┬───────────────────────────┘          │
│                         │                                      │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          │ Firebase SDK (CDN)
                          │
┌─────────────────────────▼──────────────────────────────────────┐
│                      Firebase Cloud                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ Authentication  │  │   Firestore     │  │   Storage    │  │
│  │                 │  │                 │  │              │  │
│  │ - Email/Pass    │  │ users/          │  │ users/       │  │
│  │ - Google OAuth  │  │   {userId}/     │  │   {userId}/  │  │
│  │ - Sessions      │  │     notes/      │  │     notes/   │  │
│  │                 │  │     folders/    │  │     images/  │  │
│  │                 │  │     settings/   │  │              │  │
│  │                 │  │     trash/      │  │              │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ 1. Opens login.html
     ▼
┌─────────────────┐
│   login.html    │
│                 │
│ ┌─────────────┐ │
│ │ Email/Pass  │ │
│ │   Form      │ │
│ └──────┬──────┘ │
│        │        │
│ ┌──────▼──────┐ │
│ │   Google    │ │
│ │  Sign-In    │ │
│ └──────┬──────┘ │
└────────┼────────┘
         │
         │ 2. Submit credentials
         ▼
┌─────────────────────┐
│   scripts/auth.js   │
│                     │
│ - Validate input    │
│ - Call Firebase Auth│
└──────────┬──────────┘
           │
           │ 3. Authenticate
           ▼
┌──────────────────────────┐
│  Firebase Authentication │
│                          │
│ - Verify credentials     │
│ - Create session token   │
│ - Return user object     │
└──────────┬───────────────┘
           │
           │ 4. Success
           ▼
┌─────────────────────┐
│  Redirect to        │
│  index.html         │
│                     │
│  + User ID          │
│  + Session Token    │
└─────────────────────┘
```

## Data Flow - Saving a Note

```
┌──────────┐
│  User    │
│  Types   │
│  Note    │
└────┬─────┘
     │
     │ 1. Edit note
     ▼
┌─────────────────┐
│  Note Editor    │
│  (index.html)   │
└────┬────────────┘
     │
     │ 2. Auto-save triggered
     ▼
┌─────────────────────┐
│  scripts/app.js     │
│                     │
│  Storage.saveNotes()│
└────┬────────────────┘
     │
     │ 3. Check storage type
     ▼
┌──────────────────────────┐
│  Storage Adapter         │
│                          │
│  if (useFirebase) {      │
│    firebaseService...    │
│  } else {                │
│    localStorage...       │
│  }                       │
└────┬─────────────────────┘
     │
     │ 4. Save to Firebase
     ▼
┌───────────────────────────┐
│  firebase-service.js      │
│                           │
│  saveNotes(notes) {       │
│    userId = getUserId()   │
│    for each note:         │
│      save to Firestore    │
│  }                        │
└────┬──────────────────────┘
     │
     │ 5. Write to database
     ▼
┌────────────────────────────┐
│  Firestore                 │
│                            │
│  users/{userId}/notes/     │
│    {noteId}/               │
│      - title               │
│      - content             │
│      - tags                │
│      - updatedAt           │
└────────────────────────────┘
```

## Image Upload Flow

```
┌──────────┐
│  User    │
│  Pastes  │
│  Image   │
└────┬─────┘
     │
     │ 1. Paste event
     ▼
┌─────────────────┐
│  Note Editor    │
│                 │
│  onPaste()      │
└────┬────────────┘
     │
     │ 2. Extract image file
     ▼
┌─────────────────────────┐
│  scripts/app.js         │
│                         │
│  Storage.uploadImage(   │
│    file, noteId         │
│  )                      │
└────┬────────────────────┘
     │
     │ 3. Upload to Firebase Storage
     ▼
┌───────────────────────────────┐
│  firebase-service.js          │
│                               │
│  uploadImage(file, noteId) {  │
│    userId = getUserId()       │
│    path = users/{userId}/     │
│           notes/{noteId}/     │
│           images/{filename}   │
│    upload to Storage          │
│    return downloadURL         │
│  }                            │
└────┬──────────────────────────┘
     │
     │ 4. Store file
     ▼
┌────────────────────────────────┐
│  Firebase Storage              │
│                                │
│  users/{userId}/               │
│    notes/{noteId}/             │
│      images/                   │
│        timestamp_filename.jpg  │
└────┬───────────────────────────┘
     │
     │ 5. Return URL
     ▼
┌─────────────────────────┐
│  Note Editor            │
│                         │
│  Insert <img> tag with  │
│  Firebase Storage URL   │
└─────────────────────────┘
```

## User Data Isolation

```
Firebase Firestore
│
├── users/
│   │
│   ├── user-abc-123/              ← User 1's data
│   │   ├── notes/
│   │   │   ├── note-1/
│   │   │   └── note-2/
│   │   ├── folders/
│   │   ├── settings/
│   │   └── trash/
│   │
│   ├── user-xyz-789/              ← User 2's data
│   │   ├── notes/
│   │   │   ├── note-1/            ← Different from User 1's note-1
│   │   │   └── note-3/
│   │   ├── folders/
│   │   ├── settings/
│   │   └── trash/
│   │
│   └── user-def-456/              ← User 3's data
│       ├── notes/
│       ├── folders/
│       ├── settings/
│       └── trash/

Security Rules enforce:
- User 1 can ONLY access user-abc-123/
- User 2 can ONLY access user-xyz-789/
- User 3 can ONLY access user-def-456/
```

## Security Rules Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                         │
│                                                         │
│  "Read note-1 from user-xyz-789"                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 1. Request with auth token
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Security Rules                    │
│                                                         │
│  match /users/{userId}/{document=**} {                 │
│    allow read, write: if                               │
│      request.auth != null &&                           │
│      request.auth.uid == userId;                       │
│  }                                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 2. Check conditions
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│ Is user       │         │ Does userId   │
│ authenticated?│         │ match token?  │
│               │         │               │
│ ✓ Yes         │         │ ✓ Yes         │
└───────────────┘         └───────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     │ 3. Both conditions met
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  ✓ ALLOW ACCESS                         │
│                                                         │
│  Return requested data                                  │
└─────────────────────────────────────────────────────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  login.html          index.html                          │
│      │                   │                               │
│      └───────┬───────────┘                               │
│              │                                           │
│              ▼                                           │
│      ┌──────────────┐                                    │
│      │   auth.js    │  ← Handles authentication         │
│      └──────┬───────┘                                    │
│             │                                            │
│             ▼                                            │
│      ┌──────────────┐                                    │
│      │   app.js     │  ← Main application logic         │
│      └──────┬───────┘                                    │
│             │                                            │
│             ▼                                            │
│      ┌──────────────┐                                    │
│      │   Storage    │  ← Storage adapter                │
│      │   Adapter    │                                    │
│      └──────┬───────┘                                    │
└─────────────┼────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│                   Service Layer                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│      ┌────────────────────────┐                          │
│      │  firebase-service.js   │                          │
│      │                        │                          │
│      │  - init()              │                          │
│      │  - loadNotes()         │                          │
│      │  - saveNotes()         │                          │
│      │  - uploadImage()       │                          │
│      │  - logout()            │                          │
│      └────────┬───────────────┘                          │
└───────────────┼──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│                   Firebase SDK                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  firebase-config.js  ← Configuration                     │
│  firebase-check.js   ← Validation                        │
│                                                          │
└────────────┬─────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│                  Firebase Cloud                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Authentication  │  Firestore  │  Storage                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## File Dependencies

```
login.html
  ├── styles/login.css
  ├── scripts/firebase-config.js
  │   ├── firebase-check.js
  │   └── Firebase SDK (CDN)
  └── scripts/auth.js
      └── scripts/firebase-config.js

index.html
  ├── styles/style.css
  ├── scripts/firebase-service.js
  │   └── scripts/firebase-config.js
  ├── scripts/app.js (type="module")
  │   └── scripts/firebase-service.js
  └── scripts/custom-features.js
```

## State Management

```
┌─────────────────────────────────────────┐
│         Application State               │
├─────────────────────────────────────────┤
│                                         │
│  Authentication State                   │
│  ├── currentUser: User | null           │
│  ├── isAuthenticated: boolean           │
│  └── userEmail: string                  │
│                                         │
│  Data State (in memory)                 │
│  ├── notes: Note[]                      │
│  ├── folders: Folder[]                  │
│  ├── settings: Settings                 │
│  └── trash: TrashItem[]                 │
│                                         │
│  UI State                               │
│  ├── activeNote: string | null          │
│  ├── openFolders: string[]              │
│  └── theme: string                      │
│                                         │
└─────────────────────────────────────────┘
         │                    ▲
         │                    │
         │ Save               │ Load
         ▼                    │
┌─────────────────────────────────────────┐
│         Firebase Cloud                  │
├─────────────────────────────────────────┤
│                                         │
│  Persistent State                       │
│  ├── users/{userId}/notes/              │
│  ├── users/{userId}/folders/            │
│  ├── users/{userId}/settings/           │
│  └── users/{userId}/trash/              │
│                                         │
└─────────────────────────────────────────┘
```

## Error Handling Flow

```
User Action
    │
    ▼
Try Operation
    │
    ├─── Success ──────────────┐
    │                          │
    └─── Error                 │
         │                     │
         ▼                     │
    Catch Error                │
         │                     │
         ├─── Auth Error       │
         │    └─ Redirect      │
         │       to login      │
         │                     │
         ├─── Network Error    │
         │    └─ Show retry    │
         │       message       │
         │                     │
         ├─── Permission Error │
         │    └─ Show access   │
         │       denied msg    │
         │                     │
         └─── Unknown Error    │
              └─ Log to        │
                 console       │
                               │
                               ▼
                          Continue
```

## Summary

### Key Architectural Decisions

1. **Modular Design**: Separate concerns (auth, storage, UI)
2. **Service Layer**: Firebase operations abstracted in firebase-service.js
3. **Storage Adapter**: Flexible switching between Firebase and localStorage
4. **Security First**: User data isolated at database level
5. **CDN-based**: Firebase SDK loaded from CDN (no npm required)
6. **Progressive Enhancement**: Works with or without Firebase

### Benefits

- ✅ Clean separation of concerns
- ✅ Easy to test and maintain
- ✅ Secure by default
- ✅ Scalable architecture
- ✅ User data isolation
- ✅ Flexible storage options
