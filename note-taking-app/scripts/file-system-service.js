// File System Service - Handles all file system operations via REST API
class FileSystemService {
  constructor() {
    // Try Electron port first (3002), then standalone server port (3001)
    this.baseUrl = 'http://localhost:3002/api';
    this.fallbackUrl = 'http://localhost:3001/api';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Helper method for making HTTP requests with retry logic
  async makeRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    // Try primary URL (Electron port 3002) first
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${url}`, defaultOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      } catch (error) {
        console.error(`Request attempt ${attempt} to ${this.baseUrl} failed:`, error);
        
        if (attempt === this.retryAttempts) {
          // If primary URL fails, try fallback URL (standalone server port 3001)
          try {
            const response = await fetch(`${this.fallbackUrl}${url}`, defaultOptions);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              // Switch to fallback URL for future requests
              this.baseUrl = this.fallbackUrl;
              return await response.json();
            } else {
              this.baseUrl = this.fallbackUrl;
              return await response.text();
            }
          } catch (fallbackError) {
            throw new Error(`Failed to connect to both Electron (3002) and standalone (3001) servers: ${error.message}`);
          }
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  // Check if server is running
  async checkHealth() {
    try {
      const response = await this.makeRequest('/health');
      return response.status === 'OK';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // NOTES OPERATIONS

  async loadNotes() {
    try {
      const notes = await this.makeRequest('/notes');
      return Array.isArray(notes) ? notes : [];
    } catch (error) {
      console.error('Error loading notes:', error);
      throw error;
    }
  }

  async saveNote(noteId, noteData) {
    try {
      const response = await this.makeRequest(`/notes/${noteId}`, {
        method: 'POST',
        body: JSON.stringify(noteData)
      });
      return response;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  async deleteNoteFromCollection(noteId) {
    try {
      const response = await this.makeRequest(`/notes/${noteId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  // FOLDERS OPERATIONS

  async loadFolders() {
    try {
      const folders = await this.makeRequest('/folders');
      return Array.isArray(folders) ? folders : [];
    } catch (error) {
      console.error('Error loading folders:', error);
      throw error;
    }
  }

  async saveFolders(folders) {
    try {
      const response = await this.makeRequest('/folders', {
        method: 'POST',
        body: JSON.stringify(folders)
      });
      return response;
    } catch (error) {
      console.error('Error saving folders:', error);
      throw error;
    }
  }

  async deleteFolderFromCollection(folderId) {
    try {
      const response = await this.makeRequest(`/folders/${folderId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // TRASH OPERATIONS

  async loadTrash() {
    try {
      const trash = await this.makeRequest('/trash');
      return Array.isArray(trash) ? trash : [];
    } catch (error) {
      console.error('Error loading trash:', error);
      throw error;
    }
  }

  async saveTrash(trashItems) {
    try {
      const response = await this.makeRequest('/trash', {
        method: 'POST',
        body: JSON.stringify(trashItems)
      });
      return response;
    } catch (error) {
      console.error('Error saving trash:', error);
      throw error;
    }
  }

  async deleteTrashItem(itemId) {
    try {
      // Load current trash, remove item, save back
      const currentTrash = await this.loadTrash();
      const updatedTrash = currentTrash.filter(item => item.id !== itemId);
      return await this.saveTrash(updatedTrash);
    } catch (error) {
      console.error('Error deleting trash item:', error);
      throw error;
    }
  }

  async clearAllTrash() {
    try {
      const response = await this.makeRequest('/trash', {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error clearing trash:', error);
      throw error;
    }
  }

  // SETTINGS OPERATIONS

  async loadSettings() {
    try {
      const settings = await this.makeRequest('/settings');
      return settings || {};
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    }
  }

  async saveSettings(settings) {
    try {
      const response = await this.makeRequest('/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      return response;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // FILE STRUCTURE OPERATIONS (for sidebar)

  async getFileStructure() {
    try {
      const structure = await this.makeRequest('/file-structure');
      return structure || { folders: [], notes: [] };
    } catch (error) {
      console.error('Error getting file structure:', error);
      throw error;
    }
  }

  // UTILITY METHODS

  // Check if the file system service is available
  async isAvailable() {
    return await this.checkHealth();
  }

  // Get server status information
  async getServerInfo() {
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      return {
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Delete all notes
  async deleteAllNotes() {
    try {
      const response = await this.makeRequest('/notes', {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting all notes:', error);
      throw error;
    }
  }

  // Create backup
  async createBackup() {
    try {
      const response = await this.makeRequest('/backup', {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const fileSystemService = new FileSystemService();
export default fileSystemService;
