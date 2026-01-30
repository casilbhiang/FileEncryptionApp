import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_STORAGE_KEY || 'default-secure-key-change-this';

const encrypt = (text: string): string => {
    try {
        if (!text) return text;
        return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    } catch (error) {
        console.error('Encryption failed:', error);
        return text;
    }
};

const decrypt = (ciphertext: string): string => {
    try {
        if (!ciphertext) return ciphertext;
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || ciphertext;
    } catch (error) {
        // If decryption fails, it might be plaintext (legacy)
        return ciphertext;
    }
};

export const storage = {
    setItem: (key: string, value: string, options?: Cookies.CookieAttributes) => {
        const encryptedValue = encrypt(value);
        Cookies.set(key, encryptedValue, {
            expires: 7, // Default to 7 days
            sameSite: 'Strict',
            // secure: window.location.protocol === 'https:', 
            ...options
        });
    },

    getItem: (key: string): string | null => {
        const value = Cookies.get(key);
        if (value === undefined) return null;
        return decrypt(value);
    },

    removeItem: (key: string, options?: Cookies.CookieAttributes) => {
        Cookies.remove(key, options);
    },

    clear: () => {
        const allCookies = Cookies.get();
        Object.keys(allCookies).forEach(key => {
            Cookies.remove(key);
        });
    }
};
