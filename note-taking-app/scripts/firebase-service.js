// Firebase Service - Handles all database operations
import { auth, db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

class FirebaseService {
  constructor() {
    this.currentUser = null;
    this.unsubscribeAuth = null;
    this.listeners = new Map();
  }

  // Initialize and check authentication
  init() {
    return new Promise((resolve, reject) => {
      this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          this.currentUser = user;
          console.log('Firebase Service: User authenticated', user.email);
          resolve(user);
        } else {
          this.currentUser = null;
          console.log('Firebase Service: No user authenticated');
          // Redirect to login if not authenticated
          if (window.location.pathname !== '/login.html') {
            window.location.href = 'login.html';
          }
          reject(new Error('Not authenticated'));
        }
      });
    });
  }

  // Get current user ID
  getUserId() {
    if (!this.currentUser) {
      throw new Error('No user authenticated');
    }
    return this.currentUser.uid;
  }

  // Get user email
  getUserEmail() {
    if (!this.currentUser) {
      throw new Error('No user authenticated');
    }
    return this.currentUser.email;
  }

  // Sign out
  async logout() {
    try {
      await signOut(auth);
      this.currentUser = null;
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // ==================== NOTES OPERATIONS ====================

  // Get user's notes collection reference
  getNotesRef() {
    const userId = this.getUserId();
    return collection(db, 'users', userId, 'notes');
  }

  // Load all notes for current user
  async loadNotes() {
    try {
      const notesRef = this.getNotesRef();
      const snapshot = await getDocs(notesRef);
      const notes = [];
      
      snapshot.forEach((doc) => {
        notes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Loaded ${notes.length} notes for user`);
      return notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  }

  // Save a single note
  async saveNote(noteId, noteData) {
    try {
      const userId = this.getUserId();
      const noteRef = doc(db, 'users', userId, 'notes', noteId);
      
      const dataToSave = {
        ...noteData,
        updatedAt: new Date().toISOString(),
        userId: userId
      };

      await setDoc(noteRef, dataToSave, { merge: true });
      console.log('Note saved:', noteId);
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  // Save all notes (batch operation)
  async saveNotes(notes) {
    try {
      const userId = this.getUserId();
      const promises = notes.map(note => {
        const noteRef = doc(db, 'users', userId, 'notes', note.id);
        return setDoc(noteRef, {
          ...note,
          updatedAt: new Date().toISOString(),
          userId: userId
        }, { merge: true });
      });

      await Promise.all(promises);
      console.log(`Saved ${notes.length} notes`);
      return true;
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  }

  // Delete a note
  async deleteNote(noteId) {
    try {
      const userId = this.getUserId();
      const noteRef = doc(db, 'users', userId, 'notes', noteId);
      await deleteDoc(noteRef);
      console.log('Note deleted:', noteId);
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  // ==================== FOLDERS OPERATIONS ====================

  // Get user's folders collection reference
  getFoldersRef() {
    const userId = this.getUserId();
    return collection(db, 'users', userId, 'folders');
  }

  // Load all folders for current user
  async loadFolders() {
    try {
      const foldersRef = this.getFoldersRef();
      const snapshot = await getDocs(foldersRef);
      const folders = [];
      
      snapshot.forEach((doc) => {
        folders.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Loaded ${folders.length} folders for user`);
      return folders;
    } catch (error) {
      console.error('Error loading folders:', error);
      return [];
    }
  }

  // Save all folders
  async saveFolders(folders) {
    try {
      const userId = this.getUserId();
      const promises = folders.map(folder => {
        const folderRef = doc(db, 'users', userId, 'folders', folder.id);
        return setDoc(folderRef, {
          ...folder,
          updatedAt: new Date().toISOString(),
          userId: userId
        }, { merge: true });
      });

      await Promise.all(promises);
      console.log(`Saved ${folders.length} folders`);
      return true;
    } catch (error) {
      console.error('Error saving folders:', error);
      throw error;
    }
  }

  // ==================== SETTINGS OPERATIONS ====================

  // Load user settings
  async loadSettings() {
    try {
      const userId = this.getUserId();
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snapshot = await getDoc(settingsRef);
      
      if (snapshot.exists()) {
        console.log('Settings loaded');
        return snapshot.data();
      } else {
        console.log('No settings found, returning defaults');
        return {
          theme: 'light',
          foldersOpen: []
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        theme: 'light',
        foldersOpen: []
      };
    }
  }

  // Save user settings
  async saveSettings(settings) {
    try {
      const userId = this.getUserId();
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('Settings saved');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // ==================== TRASH OPERATIONS ====================

  // Load trash items
  async loadTrash() {
    try {
      const userId = this.getUserId();
      const trashRef = collection(db, 'users', userId, 'trash');
      const snapshot = await getDocs(trashRef);
      const trash = [];
      
      snapshot.forEach((doc) => {
        trash.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Loaded ${trash.length} trash items`);
      return trash;
    } catch (error) {
      console.error('Error loading trash:', error);
      return [];
    }
  }

  // Save trash items
  async saveTrash(trashItems) {
    try {
      const userId = this.getUserId();
      const promises = trashItems.map(item => {
        const trashRef = doc(db, 'users', userId, 'trash', item.id);
        return setDoc(trashRef, {
          ...item,
          deletedAt: new Date().toISOString(),
          userId: userId
        }, { merge: true });
      });

      await Promise.all(promises);
      console.log(`Saved ${trashItems.length} trash items`);
      return true;
    } catch (error) {
      console.error('Error saving trash:', error);
      throw error;
    }
  }

  // ==================== IMAGE OPERATIONS (Base64 - No Storage) ====================

  // Convert image file to base64 data URL
  async uploadImage(file, noteId) {
    try {
      console.log('Converting image to base64:', file.name);
      
      // Convert file to base64 data URL
      const dataUrl = await this.fileToDataURL(file);
      
      console.log('Image converted successfully');
      return {
        url: dataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        isBase64: true
      };
    } catch (error) {
      console.error('Error converting image:', error);
      throw error;
    }
  }

  // Helper: Convert file to data URL
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Delete an image (no-op since images are embedded in notes)
  async deleteImage(imagePath) {
    // Images are stored as base64 in note content, nothing to delete
    console.log('Image is embedded in note content, no separate deletion needed');
    return true;
  }

  // Upload multiple images
  async uploadImages(files, noteId) {
    try {
      const uploadPromises = files.map(file => this.uploadImage(file, noteId));
      const results = await Promise.all(uploadPromises);
      console.log(`Converted ${results.length} images to base64`);
      return results;
    } catch (error) {
      console.error('Error converting images:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME LISTENERS ====================

  // Listen to notes changes in real-time
  listenToNotes(callback) {
    const notesRef = this.getNotesRef();
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const notes = [];
      snapshot.forEach((doc) => {
        notes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(notes);
    }, (error) => {
      console.error('Error listening to notes:', error);
    });

    this.listeners.set('notes', unsubscribe);
    return unsubscribe;
  }

  // Stop listening to notes
  stopListeningToNotes() {
    const unsubscribe = this.listeners.get('notes');
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete('notes');
    }
  }

  // Cleanup all listeners
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  }
}

// Export singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;
