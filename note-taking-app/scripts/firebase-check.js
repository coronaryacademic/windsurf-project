// Firebase Configuration Checker
// This script helps verify your Firebase setup is correct

export function checkFirebaseConfig(config) {
  const issues = [];
  
  // Check if config exists
  if (!config) {
    issues.push('❌ Firebase config is missing');
    return { valid: false, issues };
  }
  
  // Check required fields
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];
  
  requiredFields.forEach(field => {
    if (!config[field]) {
      issues.push(`❌ Missing required field: ${field}`);
    } else if (config[field].includes('YOUR_')) {
      issues.push(`⚠️  Placeholder value detected in: ${field}`);
    }
  });
  
  // Check format
  if (config.apiKey && !config.apiKey.startsWith('AIza')) {
    issues.push('⚠️  API key format looks incorrect (should start with "AIza")');
  }
  
  if (config.authDomain && !config.authDomain.includes('firebaseapp.com')) {
    issues.push('⚠️  Auth domain should end with "firebaseapp.com"');
  }
  
  if (config.storageBucket && !config.storageBucket.includes('appspot.com')) {
    issues.push('⚠️  Storage bucket should end with "appspot.com"');
  }
  
  // Return results
  const valid = issues.length === 0;
  
  if (valid) {
    console.log('✅ Firebase configuration looks good!');
  } else {
    console.log('🔧 Firebase configuration needs attention:');
    issues.forEach(issue => console.log('  ' + issue));
  }
  
  return { valid, issues };
}

export function displayConfigStatus(config) {
  const result = checkFirebaseConfig(config);
  
  if (!result.valid) {
    const message = `
Firebase Configuration Issues Detected:

${result.issues.join('\n')}

Please update your Firebase configuration in:
scripts/firebase-config.js

See FIREBASE_SETUP.md for detailed instructions.
    `.trim();
    
    console.warn(message);
    
    // Show user-friendly error in UI
    if (typeof document !== 'undefined') {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fee;
        border: 2px solid #c33;
        color: #c33;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        z-index: 10000;
        font-family: monospace;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      errorDiv.innerHTML = `
        <strong>⚠️ Firebase Not Configured</strong><br><br>
        ${result.issues.join('<br>')}
        <br><br>
        <small>See FIREBASE_SETUP.md for setup instructions.</small>
      `;
      document.body.appendChild(errorDiv);
    }
  }
  
  return result;
}
