// Settings functionality for Session Manager
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n
    await window.i18n.init();
    updateLanguage();
    
    // Load saved settings
    await loadSettings();
    
    // Event listeners
    document.getElementById('backBtn').addEventListener('click', () => {
        window.close();
    });
    
    // PIN Lock Toggle
    document.getElementById('pinLockToggle').addEventListener('change', async (e) => {
        if (e.target.checked) {
            // Show setup PIN modal
            showSetupPinModal();
        } else {
            // Request PIN verification before removing
            showVerifyPinToRemoveModal();
        }
    });
    
    // Change PIN Button
    document.getElementById('changePinBtn').addEventListener('click', () => {
        showChangePinModal();
    });
    
    document.getElementById('developerModeToggle').addEventListener('change', async (e) => {
        await chrome.storage.local.set({ developerMode: e.target.checked });
        showNotification(e.target.checked ? 'Modo desarrollador activado' : 'Modo desarrollador desactivado');
    });
    
    document.getElementById('advancedViewToggle').addEventListener('change', async (e) => {
        const isAdvanced = e.target.checked;
        await chrome.storage.local.set({ showAdvancedView: isAdvanced });
        
        // Also update the old options system for compatibility
        const options = await chrome.storage.local.get('all_options');
        if (options.all_options) {
            options.all_options.advancedCookies = isAdvanced;
            await chrome.storage.local.set({ all_options: options.all_options });
        }
        
        showNotification(isAdvanced ? 'Visión avanzada activada' : 'Visión avanzada desactivada');
    });
    
    document.getElementById('deleteAllSessionsBtn').addEventListener('click', () => {
        showConfirmModal(
            window.i18n.t('deleteAllSessions'),
            window.i18n.t('deleteAllSessionsConfirm'),
            async () => {
                await chrome.storage.local.set({ sessions: {} });
                showNotification(window.i18n.t('allSessionsDeleted'));
            }
        );
    });
    
    // Language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = window.i18n.getCurrentLanguage();
        languageSelect.addEventListener('change', async (e) => {
            await handleLanguageChange(e.target.value);
        });
    }
    
    // Modal handlers
    document.getElementById('closeConfirmModal').addEventListener('click', hideConfirmModal);
    document.getElementById('cancelConfirmBtn').addEventListener('click', hideConfirmModal);
    
    // Setup PIN Modal
    document.getElementById('closeSetupPinModal').addEventListener('click', hideSetupPinModal);
    document.getElementById('cancelSetupPinBtn').addEventListener('click', hideSetupPinModal);
    document.getElementById('setupPinForm').addEventListener('submit', handleSetupPin);
    
    // Change PIN Modal
    document.getElementById('closeChangePinModal').addEventListener('click', hideChangePinModal);
    document.getElementById('cancelChangePinBtn').addEventListener('click', hideChangePinModal);
    document.getElementById('changePinForm').addEventListener('submit', handleChangePin);
    
    // Verify PIN to Remove Modal
    document.getElementById('closeVerifyPinRemoveModal').addEventListener('click', hideVerifyPinToRemoveModal);
    document.getElementById('cancelVerifyPinRemoveBtn').addEventListener('click', hideVerifyPinToRemoveModal);
    document.getElementById('verifyPinRemoveForm').addEventListener('submit', handleVerifyPinToRemove);
});

async function loadSettings() {
    const settings = await chrome.storage.local.get(['developerMode', 'showAdvancedView', 'pinConfigured']);
    document.getElementById('developerModeToggle').checked = settings.developerMode || false;
    document.getElementById('advancedViewToggle').checked = settings.showAdvancedView || false;
    
    // PIN settings
    const pinConfigured = settings.pinConfigured || false;
    document.getElementById('pinLockToggle').checked = pinConfigured;
    document.getElementById('pinSettings').style.display = pinConfigured ? 'block' : 'none';
}

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    modal.style.display = 'flex';
    
    const acceptBtn = document.getElementById('acceptConfirmBtn');
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    
    newAcceptBtn.addEventListener('click', async () => {
        await onConfirm();
        hideConfirmModal();
    });
}

function hideConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function showNotification(message) {
    // Simple notification - could be enhanced with a toast system
    console.log('Notification:', message);
}

// PIN Modal Functions
function showSetupPinModal() {
    document.getElementById('setupPinModal').style.display = 'flex';
    document.getElementById('newPin').value = '';
    document.getElementById('confirmPin').value = '';
    document.getElementById('pinError').style.display = 'none';
}

function hideSetupPinModal() {
    document.getElementById('setupPinModal').style.display = 'none';
    // Reset toggle if cancelled
    const pinConfigured = document.getElementById('pinSettings').style.display === 'block';
    document.getElementById('pinLockToggle').checked = pinConfigured;
}

async function handleSetupPin(e) {
    e.preventDefault();
    
    const newPin = document.getElementById('newPin').value;
    const confirmPin = document.getElementById('confirmPin').value;
    const errorDiv = document.getElementById('pinError');
    
    if (newPin !== confirmPin) {
        errorDiv.textContent = 'Los PINs no coinciden';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        await window.securityManager.setupPin(newPin);
        hideSetupPinModal();
        // Update UI to reflect PIN is now configured
        document.getElementById('pinLockToggle').checked = true;
        document.getElementById('pinSettings').style.display = 'block';
        showNotification('PIN configurado correctamente');
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function showChangePinModal() {
    document.getElementById('changePinModal').style.display = 'flex';
    document.getElementById('currentPin').value = '';
    document.getElementById('newPinChange').value = '';
    document.getElementById('confirmPinChange').value = '';
    document.getElementById('changePinError').style.display = 'none';
}

function hideChangePinModal() {
    document.getElementById('changePinModal').style.display = 'none';
}

async function handleChangePin(e) {
    e.preventDefault();
    
    const currentPin = document.getElementById('currentPin').value;
    const newPin = document.getElementById('newPinChange').value;
    const confirmPin = document.getElementById('confirmPinChange').value;
    const errorDiv = document.getElementById('changePinError');
    
    if (newPin !== confirmPin) {
        errorDiv.textContent = window.i18n.t('pinsDoNotMatch');
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        await window.securityManager.changePin(currentPin, newPin);
        hideChangePinModal();
        showNotification(window.i18n.t('pinChanged'));
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function updateLanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = window.i18n.t(key);
    });

    // Update all placeholders with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = window.i18n.t(key);
    });
}

async function handleLanguageChange(lang) {
    await window.i18n.setLanguage(lang);
    updateLanguage();
    showNotification(window.i18n.t('languageChanged'));
}

// Verify PIN to Remove Functions
function showVerifyPinToRemoveModal() {
    document.getElementById('verifyPinRemoveModal').style.display = 'flex';
    document.getElementById('verifyPinRemove').value = '';
    document.getElementById('verifyPinRemoveError').style.display = 'none';
}

function hideVerifyPinToRemoveModal() {
    document.getElementById('verifyPinRemoveModal').style.display = 'none';
    // Reset toggle if cancelled
    document.getElementById('pinLockToggle').checked = true;
}

async function handleVerifyPinToRemove(e) {
    e.preventDefault();
    
    const pin = document.getElementById('verifyPinRemove').value;
    const errorDiv = document.getElementById('verifyPinRemoveError');
    
    try {
        const isValid = await window.securityManager.verifyPin(pin);
        if (!isValid) {
            errorDiv.textContent = 'PIN incorrecto';
            errorDiv.style.display = 'block';
            return;
        }
        
        // PIN verified, remove it
        await window.securityManager.removePin();
        hideVerifyPinToRemoveModal();
        document.getElementById('pinSettings').style.display = 'none';
        document.getElementById('pinLockToggle').checked = false;
        showNotification('Bloqueo por PIN desactivado');
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}
