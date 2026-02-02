import { useState } from 'react';
import { decryptFile } from '../services/Encryption';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * Hook for handling file decryption with automatic error notifications
 * Implements User Stories DR#17 & PT#14
 */

interface DecryptionParams {
  encryptedBlob: Blob;
  iv: string;
  key: CryptoKey;
}

interface DecryptFileParams {
  encryptedBlob: Blob;
  iv: string;
  key: CryptoKey;
  userId: string; 
}

export const useFileDecryption = () => {
    const [isDecrypting, setIsDecrypting] = useState(false);
    const { addNotification } = useNotifications();

    const handleDecrypt = async (params: DecryptFileParams, filename?: string): Promise<Blob | null> => {
        setIsDecrypting(true);
        
        try {
            const decryptParams: DecryptionParams = {
                encryptedBlob: params.encryptedBlob,
                iv: params.iv,
                key: params.key
            };
            
            const decryptedBlob = await decryptFile(decryptParams);
            
            // Success notification (toast-only, not in sidebar)
            addNotification({
                user_id: params.userId,
                title: 'File Decrypted Successfully',
                message: filename ? `${filename} has been decrypted and is ready to download.` : 'File decrypted successfully.',
                type: 'system',
                showAsToast: true,
                persistToSidebar: false // Toast-only notification
            });
            
            return decryptedBlob;
        } catch (error: any) {
            // Check if it's a decryption error (422 from backend)
            if (error.isDecryptionError) {
                // User Story DR#17 & PT#14: Notify user of decryption failure (toast-only)
                addNotification({
                    user_id: params.userId,
                    title: 'Decryption Failed',
                    message: error.message || 'The file could not be decrypted. The encryption key may be incorrect or the file may be corrupted.',
                    type: 'decryption_failed',
                    showAsToast: true,
                    persistToSidebar: false // Toast-only notification
                });
            } else {
                // Other errors (toast-only)
                addNotification({
                    user_id: params.userId,
                    title: 'Error',
                    message: error.message || 'An error occurred while processing the file.',
                    type: 'error',
                    showAsToast: true,
                    persistToSidebar: false // Toast-only notification
                });
            }
            
            console.error('Decryption error:', error);
            return null;
        } finally {
            setIsDecrypting(false);
        }
    };

    return {
        handleDecrypt,
        isDecrypting
    };
};