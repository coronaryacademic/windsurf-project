// Firebase Configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyo1JnTiWLLpQxFVAtl_UX79bNL3j0nXw",
  authDomain: "note-5401e.firebaseapp.com",
  projectId: "note-5401e",
  storageBucket: "note-5401e.firebasestorage.app",
  messagingSenderId: "938595428523",
  appId: "1:938595428523:web:22772b4904ef0c2817afee",
  measurementId: "G-QK0B7DLJ0M"
};

// Initialize Firebase - Using CDN with fallback
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = null; // Storage disabled - images will be stored as base64 in Firestore

export default app;
