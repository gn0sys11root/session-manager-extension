// Sistema de internacionalización (i18n) para Session Manager
const translations = {
    es: {
        // Popup - Main
        savedSessions: "Sesiones Guardadas",
        import: "Importar",
        saveCurrentSession: "Guardar Sesión Actual",
        searchSessions: "Buscar sesiones...",
        cookies: "COOKIES",
        localStorage: "LOCALSTORAGE",
        sessionStorage: "SESSIONSTORAGE",
        indexedDB: "INDEXEDDB",
        restore: "Restaurar",
        export: "Exportar",
        delete: "Eliminar",
        noCookies: "Esta página no tiene cookies.",
        noLocalStorage: "Esta página no tiene elementos de localStorage.",
        noSessionStorage: "Esta página no tiene elementos de sessionStorage.",
        cannotDisplayCookies: "Session Manager no puede mostrar las cookies de esta página.",
        
        // Save Session Modal
        saveSession: "Guardar Sesión",
        sessionName: "Nombre de la sesión:",
        sessionNamePlaceholder: "Ej: Mi sesión de trabajo",
        domain: "Dominio:",
        cancel: "Cancelar",
        save: "Guardar",
        
        // Messages
        noSessionsSaved: "No hay sesiones guardadas. Haz clic en \"Guardar Sesión Actual\" para guardar tu primera sesión.",
        sessionSaved: "Sesión guardada exitosamente",
        sessionRestored: "Sesión restaurada",
        sessionExported: "Sesión exportada exitosamente",
        sessionImported: "Sesión importada exitosamente",
        sessionDeleted: "Sesión eliminada exitosamente",
        errorSavingSession: "Error al guardar la sesión",
        errorRestoringSession: "Error al restaurar la sesión",
        errorDeletingSession: "Error al eliminar la sesión",
        confirmDeleteSession: "¿Estás seguro de que deseas eliminar esta sesión?",
        
        // Import page
        importSession: "Importar Sesión",
        dragDropFile: "Arrastra y suelta tu archivo JSON aquí",
        orClickToSelect: "o haz clic para seleccionar un archivo",
        selectFile: "Seleccionar Archivo",
        sessionImportedSuccess: "¡Sesión importada exitosamente!",
        sessionImportedDesc: "La sesión ha sido agregada a tu lista de sesiones guardadas.",
        importError: "Error al importar",
        importErrorDesc: "El archivo no es un formato de sesión válido.",
        invalidFileType: "Por favor selecciona un archivo JSON válido.",
        
        // Domain Mismatch Modal
        domainMismatchDetected: "⚠️ Dominio diferente detectado",
        sessionSavedForDifferentDomain: "Esta sesión fue guardada para un dominio diferente al actual.",
        sessionDomain: "Dominio de la sesión:",
        currentDomain: "Dominio actual:",
        restoreAnywayWarning: "¿Deseas restaurar la sesión de todas formas? Esto puede causar problemas de compatibilidad o cierres de sesión en el lugar incorrecto.",
        goToOriginalDomain: "Ir al dominio original",
        restoreAnyway: "Restaurar de todas formas",
        
        // Advanced Sections
        advancedSections: "Secciones Avanzadas",
        
        // PIN Verification Modal
        verifyPinToExport: "Verificar PIN para exportar",
        enterPinToExport: "Ingresa tu PIN para exportar esta sesión",
        enterYourPin: "Ingresa tu PIN",
        verify: "Verificar",
        
        // Settings
        configuration: "Configuración",
        back: "← Volver",
        
        // Seguridad
        security: "Seguridad",
        pinForExportSessions: "PIN para exportar sesiones:",
        requirePinDesc: "Requiere un PIN de 4-6 dígitos para exportar sesiones",
        changePin: "Cambiar PIN:",
        updateSecurityPin: "Actualiza tu PIN de seguridad",
        changePinBtn: "Cambiar PIN",
        
        // Modo Desarrollador
        developerMode: "Modo Desarrollador",
        activateDeveloperMode: "Activar modo desarrollador:",
        showTabsDesc: "Muestra las pestañas de Cookies, LocalStorage y SessionStorage en la extensión",
        advancedCookieView: "Visión avanzada de la lista de cookies:",
        showAdvancedOptionsDesc: "Muestra opciones avanzadas al editar cookies (SameSite, Secure, HttpOnly, etc.)",
        
        // Zona Peligrosa
        dangerZone: "Zona de Peligro",
        deleteAllSessions: "Eliminar todas las sesiones:",
        deleteAllSessionsDesc: "Esto eliminará todas las sesiones guardadas permanentemente.",
        deleteAll: "Eliminar Todo",
        
        // Idioma
        language: "Idioma",
        extensionLanguage: "Idioma de la extensión:",
        selectLanguage: "Selecciona el idioma de la interfaz",
        spanish: "Español",
        english: "English",
        
        // Modales
        setupPin: "Configurar PIN",
        setupPinDesc: "Establece un PIN de 4-6 dígitos para proteger tu extensión",
        newPin: "Nuevo PIN (4-6 dígitos)",
        confirmPin: "Confirmar PIN",
        configure: "Configurar",
        cancel: "Cancelar",
        
        verifyPin: "Verificar PIN",
        enterCurrentPin: "Ingresa tu PIN actual para desactivar el bloqueo por PIN",
        currentPin: "PIN actual",
        deactivatePin: "Desactivar PIN",
        
        changePinTitle: "Cambiar PIN",
        currentPinLabel: "PIN actual:",
        newPinLabel: "Nuevo PIN:",
        confirmNewPinLabel: "Confirmar nuevo PIN:",
        change: "Cambiar",
        
        confirmAction: "Confirmar acción",
        deleteAllSessionsConfirm: "¿Estás seguro de que deseas eliminar todas las sesiones guardadas? Esta acción no se puede deshacer.",
        confirm: "Confirmar",
        
        // Mensajes
        pinConfigured: "PIN configurado correctamente",
        pinRemoved: "Bloqueo por PIN desactivado",
        pinChanged: "PIN cambiado correctamente",
        incorrectPin: "PIN incorrecto",
        pinsDoNotMatch: "Los PINs no coinciden",
        pinMustBe4to6: "El PIN debe tener entre 4 y 6 dígitos",
        pinOnlyNumbers: "El PIN solo puede contener números",
        allSessionsDeleted: "Todas las sesiones han sido eliminadas",
        configUpdated: "✓ Configuración actualizada",
        languageChanged: "Idioma cambiado correctamente"
    },
    en: {
        // Popup - Main
        savedSessions: "Saved Sessions",
        import: "Import",
        saveCurrentSession: "Save Current Session",
        searchSessions: "Search sessions...",
        cookies: "COOKIES",
        localStorage: "LOCALSTORAGE",
        sessionStorage: "SESSIONSTORAGE",
        indexedDB: "INDEXEDDB",
        restore: "Restore",
        export: "Export",
        delete: "Delete",
        noCookies: "This page does not have any cookies.",
        noLocalStorage: "This page does not have any localStorage items.",
        noSessionStorage: "This page does not have any sessionStorage items.",
        cannotDisplayCookies: "Session Manager can't display cookies for this page.",
        
        // Save Session Modal
        saveSession: "Save Session",
        sessionName: "Session name:",
        sessionNamePlaceholder: "E.g: My work session",
        domain: "Domain:",
        cancel: "Cancel",
        save: "Save",
        
        // Messages
        noSessionsSaved: "No saved sessions. Click \"Save Current Session\" to save your first session.",
        sessionSaved: "Session saved successfully",
        sessionRestored: "Session restored successfully",
        sessionDeleted: "Session deleted",
        sessionExported: "Session exported successfully",
        sessionImported: "Session imported successfully",
        errorSavingSession: "Error saving session",
        errorRestoringSession: "Error restoring session",
        errorDeletingSession: "Error deleting session",
        confirmDeleteSession: "Are you sure you want to delete this session?",
        
        // Import page
        importSession: "Import Session",
        dragDropFile: "Drag and drop your JSON file here",
        orClickToSelect: "or click to select a file",
        selectFile: "Select File",
        sessionImportedSuccess: "Session imported successfully!",
        sessionImportedDesc: "The session has been added to your saved sessions list.",
        importError: "Import error",
        importErrorDesc: "The file is not a valid session format.",
        invalidFileType: "Please select a valid JSON file.",
        
        // Domain Mismatch Modal
        domainMismatchDetected: "⚠️ Different domain detected",
        sessionSavedForDifferentDomain: "This session was saved for a different domain than the current one.",
        sessionDomain: "Session domain:",
        currentDomain: "Current domain:",
        restoreAnywayWarning: "Do you want to restore the session anyway? This may cause compatibility issues or session closures in the wrong place.",
        goToOriginalDomain: "Go to original domain",
        restoreAnyway: "Restore anyway",
        
        // Advanced Sections
        advancedSections: "Advanced Sections",
        
        // PIN Verification Modal
        verifyPinToExport: "Verify PIN to export",
        enterPinToExport: "Enter your PIN to export this session",
        enterYourPin: "Enter your PIN",
        verify: "Verify",
        
        // Settings
        configuration: "Settings",
        back: "← Back",
        
        // Security
        security: "Security",
        pinForExportSessions: "PIN to export sessions:",
        requirePinDesc: "Requires a 4-6 digit PIN to export sessions",
        changePin: "Change PIN:",
        updateSecurityPin: "Update your security PIN",
        changePinBtn: "Change PIN",
        
        // Developer Mode
        developerMode: "Developer Mode",
        activateDeveloperMode: "Activate developer mode:",
        showTabsDesc: "Shows Cookies, LocalStorage and SessionStorage tabs in the extension",
        advancedCookieView: "Advanced cookie list view:",
        showAdvancedOptionsDesc: "Shows advanced options when editing cookies (SameSite, Secure, HttpOnly, etc.)",
        
        // Danger Zone
        dangerZone: "Danger Zone",
        deleteAllSessions: "Delete all sessions:",
        deleteAllSessionsDesc: "This will permanently delete all saved sessions.",
        deleteAll: "Delete All",
        
        // Language
        language: "Language",
        extensionLanguage: "Extension language:",
        selectLanguage: "Select the interface language",
        spanish: "Español",
        english: "English",
        
        // Modals
        setupPin: "Setup PIN",
        setupPinDesc: "Set a 4-6 digit PIN to protect your extension",
        newPin: "New PIN (4-6 digits)",
        confirmPin: "Confirm PIN",
        configure: "Configure",
        cancel: "Cancel",
        
        verifyPin: "Verify PIN",
        enterCurrentPin: "Enter your current PIN to disable PIN lock",
        currentPin: "Current PIN",
        deactivatePin: "Deactivate PIN",
        
        changePinTitle: "Change PIN",
        currentPinLabel: "Current PIN:",
        newPinLabel: "New PIN:",
        confirmNewPinLabel: "Confirm new PIN:",
        change: "Change",
        
        confirmAction: "Confirm action",
        deleteAllSessionsConfirm: "Are you sure you want to delete all saved sessions? This action cannot be undone.",
        confirm: "Confirm",
        
        // Messages
        pinConfigured: "PIN configured successfully",
        pinRemoved: "PIN lock disabled",
        pinChanged: "PIN changed successfully",
        incorrectPin: "Incorrect PIN",
        pinsDoNotMatch: "PINs do not match",
        pinMustBe4to6: "PIN must be between 4 and 6 digits",
        pinOnlyNumbers: "PIN can only contain numbers",
        allSessionsDeleted: "All sessions have been deleted",
        configUpdated: "✓ Configuration updated",
        languageChanged: "Language changed successfully"
    }
};

// Clase para manejar traducciones
class I18n {
    constructor() {
        this.currentLanguage = 'es';
        this.init();
    }

    async init() {
        // Cargar idioma guardado
        const result = await chrome.storage.local.get(['language']);
        
        if (result.language) {
            this.currentLanguage = result.language;
        } else {
            this.currentLanguage = this.detectBrowserLanguage();
            await chrome.storage.local.set({ language: this.currentLanguage });
        }
    }

    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        if (browserLang.startsWith('es')) {
            return 'es';
        } else if (browserLang.startsWith('en')) {
            return 'en';
        }
        
        return 'es';
    }

    async setLanguage(lang) {
        this.currentLanguage = lang;
        await chrome.storage.local.set({ language: lang });
    }

    t(key) {
        return translations[this.currentLanguage][key] || key;
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Instancia global
window.i18n = new I18n();
