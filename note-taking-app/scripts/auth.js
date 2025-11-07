// Authentication Handler - Google Sign-In Only
import { auth } from './firebase-config.js';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const googleLoginBtn = document.getElementById('googleLoginBtn');

// Error handling
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function showLoading() {
  loadingSpinner.classList.remove('hidden');
  loginForm.style.display = 'none';
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
  loginForm.style.display = 'block';
}

// Google Sign In
const googleProvider = new GoogleAuthProvider();

async function signInWithGoogle() {
  hideError();
  showLoading();

  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google sign-in successful:', result.user.email);
    // Redirect will happen automatically via onAuthStateChanged
  } catch (error) {
    hideLoading();
    console.error('Google sign-in error:', error);
    
    let errorMsg = 'Failed to sign in with Google. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Sign-in popup was closed. Please try again.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMsg = 'Sign-in was cancelled.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMsg = 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
    }
    
    showError(errorMsg);
  }
}

// Attach Google Sign-In to button
googleLoginBtn?.addEventListener('click', signInWithGoogle);

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, redirect to main app
    console.log('User authenticated:', user.email);
    window.location.href = 'index.html';
  } else {
    // User is signed out
    console.log('No user authenticated');
    hideLoading();
  }
});
