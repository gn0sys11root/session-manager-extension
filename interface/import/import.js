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
  // Apply translations
  if (window.i18n) {
    window.i18n.applyTranslations();
  }

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

  let selectedFile = null;

  // Back button
  backBtn.addEventListener('click', () => {
    window.close();
  });

  // Click to select file
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target !== selectFileBtn) {
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFile(e.target.files[0]);
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
    
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Handle file
  function handleFile(file) {
    if (!file.name.endsWith('.json')) {
      showError(window.i18n?.t('invalidFileType') || 'Por favor selecciona un archivo JSON válido.');
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    dropZone.style.display = 'none';
    fileInfo.style.display = 'flex';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  // Import button
  importBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const sessionData = JSON.parse(text);

      // Validate session data
      if (!sessionData.name || !sessionData.domain) {
        throw new Error('Invalid session format');
      }

      // Import session
      const sessions = await storageHandler.getLocal('sessions') || {};
      const sessionId = 'session_' + Date.now();
      
      sessions[sessionId] = {
        ...sessionData,
        timestamp: Date.now()
      };

      await storageHandler.setLocal('sessions', sessions);

      // Show success
      fileInfo.style.display = 'none';
      successMessage.style.display = 'block';

      // Reset after 2 seconds
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      showError(window.i18n?.t('importErrorDesc') || 'El archivo no es un formato de sesión válido.');
    }
  });

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
    selectedFile = null;
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
