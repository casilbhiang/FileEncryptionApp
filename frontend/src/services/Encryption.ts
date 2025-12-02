/* PLACEHOLDER FOR NOW */

export async function encryptFileBeforeUpload(file: File): Promise<Blob> {
    console.log('Mock Encryption!');
    return file;
}

export async function decryptFileAfterDownload(encryptedBlob: Blob): Promise<Blob> {
    console.log('Mock Decryption!');
    return encryptedBlob;
}