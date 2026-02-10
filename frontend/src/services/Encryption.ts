/* Web Crypto API for AES-GCM-256 Encryption */

interface EncryptionResult {
    encryptedBlob: Blob;
    iv: string;
    authTag: string;
    algorithm: string;
}

interface DecryptionParams {
    encryptedBlob: Blob;
    iv: string;
    key: CryptoKey;
}

// ===== Key Management =====
export async function importKeyFromQRCode(keyBytes: Uint8Array): Promise<CryptoKey> {
    if (keyBytes.length !== 32) {
        throw new Error('Invalid key length. Expected 32 bytes for AES-256.');
    }

    const key = await crypto.subtle.importKey(
        'raw',
        keyBytes as BufferSource,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    console.log('Key imported from QR code successfully');
    return key;
}

// Import key from base64 string
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
    const keyBytes = base64ToArrayBuffer(base64Key);
    return await importKeyFromQRCode(keyBytes);
}

// Import key from hex string (alternative)
export async function importKeyFromHex(hexKey: string): Promise<CryptoKey> {
    const keyBytes = hexToUint8Array(hexKey);
    return await importKeyFromQRCode(keyBytes);
}

import { storage } from '../utils/storage';

// Store Encryption Key in Browser
export async function storeEncryptionKey(key: CryptoKey, userId: string): Promise<void> {
    try {
        const exported = await crypto.subtle.exportKey('raw', key);
        const base64Key = arrayBufferToBase64(exported);
        storage.setItem(`encryptionKey_${userId}`, base64Key);
        console.log('Encryption key stored for user: ', userId);
        window.dispatchEvent(new CustomEvent('encryption-key-updated', { detail: { userId } }));
    } catch (error) {
        console.error('Failed to store encryption key: ', error);
        throw new Error('Failed to store encryption key');
    }
}


// Retrieve Encryption Key
export async function getStoredEncryptionKey(userId: string): Promise<CryptoKey | null> {
    try {
        const base64Key = storage.getItem(`encryptionKey_${userId}`);
        if (!base64Key) {
            console.log('No stored key found for user: ', userId);
            return null;
        }

        const keyBytes = base64ToArrayBuffer(base64Key);
        const key = await crypto.subtle.importKey(
            'raw',
            keyBytes as BufferSource,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        console.log('Retrieved stored encryption key for user: ', userId);
        return key;
    } catch (error) {
        console.error('Failed to retrieve encryption key: ', error);
        return null;
    }
}

// Check if encryption key is stored
export function hasEncryptionKey(userId: string): boolean {
    return storage.getItem(`encryptionKey_${userId}`) !== null;
}

// Check if encryption key is cleared (logout)
export function clearEncryptionKey(userId: string): void {
    storage.removeItem(`encryptionKey_${userId}`);
    console.log('Cleared encryption key for user: ', userId);
}

// ===== File Encryption =====

// Encrypt file before upload
export async function encryptFile(file: File, key: CryptoKey): Promise<EncryptionResult> {
    try {
        console.log('Starting encryption for file: ', file.name);

        // Read file as ArrayBuffer
        const fileData = await file.arrayBuffer();
        // Generate random IV (AES-GCM -> 12 bytes)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        // Encrypt with AES-GCM
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv as BufferSource,
            },
            key,
            fileData
        );
        // Convert to Blob
        const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
        // GCM includes auth tag in encrypted data (last 16 bytes)
        const encryptedArray = new Uint8Array(encryptedData);
        const authTag = encryptedArray.slice(-16);

        console.log('File encrypted successfully');
        console.log(`- Original Size: ${fileData.byteLength} bytes`);
        console.log(`- Encrypted Size: ${encryptedData.byteLength} bytes`);

        return { encryptedBlob, iv: arrayBufferToBase64(iv), authTag: arrayBufferToBase64(authTag), algorithm: 'AES-GCM-256' };

    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt file');
    }
}

// Decrypt file after download
export async function decryptFile(params: DecryptionParams): Promise<Blob> {
    try {
        const { encryptedBlob, iv, key } = params;
        console.log('Starting decryption of file');

        // Read encrypted Blob as ArrayBuffer
        const encryptedData = await encryptedBlob.arrayBuffer();
        // Convert IV from base64
        const ivArray = base64ToArrayBuffer(iv);
        // Decrypt with AES-GCM
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivArray as BufferSource,
            },
            key,
            encryptedData
        );

        console.log('File decrypted successfully');
        console.log(`- Encrypted Size: ${encryptedData.byteLength} bytes`);
        console.log(`- Decrypted Size: ${decryptedData.byteLength} bytes`);

        // Return as Blob
        return new Blob([decryptedData]);
    } catch (error) {
        console.error('Decryption failed: ', error);
        if (error instanceof Error && error.name === 'OperationError') {
            throw new Error('Decryption failed: Wrong encryption key or corrupted file)');
        }
        throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// ===== Utility Functions =====
// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Convert Base 64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Convert Hex String to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
    // Remove spaces or separators
    hex = hex.replace(/[\s:-]/g, '');

    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// Convert Uint8Array to hex string
export function uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

