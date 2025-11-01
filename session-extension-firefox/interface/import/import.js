// Import necessary modules
const browserDetector = {
  getApi() {
    return typeof browser !== 'undefined' ? browser : chrome;
  }
};

const storageHandler = {
  async getLocal(key) {
    const result = await browserDetector.getApi().storage.local.get(key);
    return result[key];
  },
  async setLocal(key, value) {
    await browserDetector.getApi().storage.local.set({ [key]: value });
  }
};

// Initialize i18n
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for i18n to load
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Apply translations manually
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (window.i18n && window.i18n.t) {
      const translation = window.i18n.t(key);
      if (translation && translation !== key) {
        el.textContent = translation;
      }
    }
  });

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const importBtn = document.getElementById('importBtn');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const backBtn = document.getElementById('backBtn');

  let selectedFiles = [];

  // Back button
  backBtn.addEventListener('click', () => {
    window.close();
  });

  // Click to select file
  selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target === selectFileBtn || e.target.closest('#selectFileBtn')) {
      return;
    }
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  // Handle multiple files
  async function handleFiles(files) {
    const jsonFiles = files.filter(file => file.name.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      showError(window.i18n?.t('invalidFileType') || 'Please select valid JSON files.');
      return;
    }

    selectedFiles = jsonFiles;
    
    // Hide drop zone and import immediately
    dropZone.style.display = 'none';
    fileInfo.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    // Import immediately
    importFiles();
  }

  // Import files function
  async function importFiles() {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      const sessions = await storageHandler.getLocal('sessions') || {};
      let importedCount = 0;

      // Import all selected files
      for (const file of selectedFiles) {
        try {
          const text = await file.text();
          const sessionData = JSON.parse(text);

          // Validate session data
          if (!sessionData.name || !sessionData.domain) {
            console.warn(`Skipping invalid file: ${file.name}`);
            continue;
          }

          // Import session with unique ID
          const sessionId = 'session_' + Date.now() + '_' + importedCount;
          
          sessions[sessionId] = {
            ...sessionData,
            timestamp: Date.now()
          };

          importedCount++;
          
          // Small delay to ensure unique timestamps
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          console.error(`Error importing ${file.name}:`, error);
        }
      }

      if (importedCount > 0) {
        await storageHandler.setLocal('sessions', sessions);

        // Show success
        fileInfo.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Update success message
        const successTitle = successMessage.querySelector('h3');
        if (importedCount === 1) {
          successTitle.textContent = window.i18n?.t('sessionImportedSuccess') || 'Session imported successfully!';
        } else {
          successTitle.textContent = `${importedCount} sessions imported successfully!`;
        }

        // Reset after 2 seconds
        setTimeout(() => {
          resetForm();
        }, 2000);
      } else {
        throw new Error('No valid sessions found');
      }

    } catch (error) {
      console.error('Import error:', error);
      showError(window.i18n?.t('importErrorDesc') || 'The files are not valid session formats.');
    }
  }

  // Import button (manual trigger if needed)
  importBtn.addEventListener('click', importFiles);

  // Show error
  function showError(message) {
    errorText.textContent = message;
    dropZone.style.display = 'none';
    fileInfo.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'block';

    setTimeout(() => {
      resetForm();
    }, 3000);
  }

  // Reset form
  function resetForm() {
    selectedFiles = [];
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
});
