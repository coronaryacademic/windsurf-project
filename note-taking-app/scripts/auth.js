// Authentication Handler - Google Sign-In Only
import { auth } from './firebase-config.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
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

// Check if we're on a mobile device or Safari
const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

async function signInWithGoogle() {
  hideError();
  showLoading();

  try {
    // Set persistence for better mobile support
    await setPersistence(auth, browserLocalPersistence);
    
    // Use redirect for mobile and Safari, popup for others
    if (isMobile || isSafari) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google sign-in successful:', result.user.email);
    }
  } catch (error) {
    hideLoading();
    console.error('Google sign-in error:', error);
    
    let errorMsg = 'Failed to sign in with Google. Please try again.';
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      errorMsg = 'Sign-in was cancelled. Please try again.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMsg = 'Pop-up was blocked. Please allow pop-ups or try the redirect method.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMsg = 'Network error. Please check your connection and try again.';
    }
    
    showError(errorMsg);
  }
}

// Handle redirect result when page loads
async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('Redirect sign-in successful:', result.user.email);
    }
  } catch (error) {
    console.error('Redirect sign-in error:', error);
    showError('Failed to complete sign in. Please try again.');
  } finally {
    hideLoading();
  }
}

// Initialize auth state and handle redirects
function initAuth() {
  // Handle redirect result if this is a redirect back from Google
  if (isMobile || isSafari) {
    handleRedirectResult();
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

// Initialize authentication when the page loads
window.addEventListener('DOMContentLoaded', initAuth);
