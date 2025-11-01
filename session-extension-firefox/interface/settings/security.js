class SecurityManager {
    constructor() {
        this.isUnlocked = false;
    }

    generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async hashPin(pin, salt) {
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(pin);
        
        const saltData = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordData,
            'PBKDF2',
            false,
            ['deriveBits']
        );
        
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltData,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        
        const hashArray = Array.from(new Uint8Array(derivedBits));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async setupPin(pin) {
        if (pin.length < 4 || pin.length > 6) {
            throw new Error('El PIN debe tener entre 4 y 6 dígitos');
        }
        
        if (!/^\d+$/.test(pin)) {
            throw new Error('El PIN solo puede contener números');
        }

        const salt = this.generateSalt();
        const hashedPin = await this.hashPin(pin, salt);
        await chrome.storage.local.set({ 
            pinHash: hashedPin,
            pinSalt: salt,
            pinConfigured: true,
            autoLockTime: 900 // 15 minutos por defecto
        });
        
        this.isUnlocked = true;
    }

    async verifyPin(pin) {
        const result = await chrome.storage.local.get(['pinHash', 'pinSalt']);
        if (!result.pinHash || !result.pinSalt) {
            throw new Error('PIN no configurado');
        }

        const hashedPin = await this.hashPin(pin, result.pinSalt);
        const isValid = hashedPin === result.pinHash;
        
        if (isValid) {
            this.isUnlocked = true;
        }
        
        return isValid;
    }

    async isPinConfigured() {
        const result = await chrome.storage.local.get(['pinConfigured']);
        return result.pinConfigured || false;
    }

    async removePin() {
        await chrome.storage.local.remove(['pinHash', 'pinSalt', 'pinConfigured', 'autoLockTime']);
        this.isUnlocked = true;
    }

    async changePin(currentPin, newPin) {
        // Verify current PIN
        const isValid = await this.verifyPin(currentPin);
        if (!isValid) {
            throw new Error('PIN actual incorrecto');
        }

        // Set new PIN
        await this.setupPin(newPin);
    }
}

window.securityManager = new SecurityManager();
