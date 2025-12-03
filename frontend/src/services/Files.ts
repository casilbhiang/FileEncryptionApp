const API_BASE_URL = 'http://localhost:5000/api/files';

export interface FileItem {
    id: string;
    name: string;
    size: number;
    uploaded_at: string;
    shared_by: string;
    is_shared?: boolean;
}

export interface UploadResponse {
    message: string;
    file_id: string;
    filename: string;
}

/* File Upload */
export const uploadFile = async (file: File, sharedWith?: string, signal?: AbortSignal, userId?: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    if (sharedWith) {
        formData.append('shared_with', sharedWith);
    }

    if (userId) {
        formData.append('user_id', userId);
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        signal,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    return response.json();
};

/* Get User Files */
export const getMyFiles = async (
    search?: string,
    sortBy?: string,
    filter?: string,
): Promise<{ files: FileItem[]; total: number }> => {

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (filter) params.append('filter', filter);

    const response = await fetch(`${API_BASE_URL}/my-files?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch files');
    }

    return response.json();
};

/* Download File */
export const downloadFile = async (fileId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/download/${fileId}`);

    if (!response.ok) {
        throw new Error('Download failed');
    }

    const data = await response.json();

    // Convert hex string to byte
    const bytes = new Uint8Array(
        data.data.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
    );

    return new Blob([bytes]);
};

/* Delete File */
export const deleteFile = async (fileId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/delete/${fileId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Delete failed');
    }
};

/* Share File */
export const shareFile = async (fileId: string, sharedWith: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: fileId, shared_with: sharedWith }),
    });

    if (!response.ok) {
        throw new Error('Share failed');
    }
};

/* Decrypt File - User Stories DR#17 & PT#14 */
export interface DecryptFileParams {
    fileId: string;
    userId: string;
}

export interface DecryptionError {
    error: string;
    message: string;
    details?: string;
}

export const decryptFile = async ({ fileId, userId }: DecryptFileParams): Promise<Blob> => {
    const response = await fetch(`http://localhost:5000/api/files/decrypt/${fileId}?user_id=${userId}`);

    if (!response.ok) {
        // Handle decryption failure (422) or other errors
        if (response.status === 422) {
            const errorData: DecryptionError = await response.json();
            const error = new Error(errorData.message || 'Decryption failed');
            (error as any).isDecryptionError = true;
            (error as any).details = errorData.details;
            throw error;
        }

        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to decrypt file');
    }

    return response.blob();
};

/* Confirm Upload */
export const confirmUpload = async (fileId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/confirm/${fileId}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm upload');
    }
};

