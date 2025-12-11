// services/Files.ts - MERGED VERSION

const API_BASE_URL = 'http://localhost:5000/api/files';

// Interfaces from Code #1
export interface FileShare {
  shared_with: string;
  shared_at: string;
  access_level: string;
}

// Enhanced FileItem interface combining both versions
export interface FileItem {
  id: string;
  name: string;
  size: number; // Make required like Code #2
  uploaded_at: string;
  file_extension?: string;
  owner_id: string; // Required from Code #1
  is_owned?: boolean;
  is_shared?: boolean;
  shared_by?: string;
  shared_by_name?: string;
  shared_at?: string;
  last_accessed_at?: string;
  shares?: FileShare[]; // From Code #1 - for detailed sharing info
  shared_count?: number;
  owner_name?: string; // From Code #2
  owner_role?: string;
  
  // Legacy support
  file_size?: number;
}

export interface UploadResponse {
  message: string;
  file_id: string;
  filename: string;
}

export interface EncryptionMetadata {
  iv: string;
  authTag: string;
  algorithm: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse {
  success: boolean;
  data: FileItem[];
  count?: number;
  pagination?: PaginationInfo;
  message?: string;
  error?: string;
}

/* File Upload */
export const uploadFile = async (
  file: File, 
  userId: string, 
  encryptionMetadata?: EncryptionMetadata, 
  signal?: AbortSignal
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  if (encryptionMetadata) {
    formData.append('encryption_metadata', JSON.stringify(encryptionMetadata));
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

/* Get User Files - ENHANCED with pagination support (for MyFiles tab) */
export const getMyFiles = async (
  userId: string,
  search?: string,
  sortField?: string,
  sortOrder?: 'asc' | 'desc',
  filter?: string,
  page?: number,
  limit?: number
): Promise<{ files: FileItem[]; total: number; pagination?: PaginationInfo }> => {
  const params = new URLSearchParams();
  params.append('user_id', userId);
  if (search) params.append('search', search);
  if (sortField) params.append('sort', sortField);
  if(sortOrder) params.append('order', sortOrder);
  if (filter) params.append('filter', filter);
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/my-files?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch files' }));
    throw new Error(error.error || 'Failed to fetch files');
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.success && data.data) {
    // New format with pagination
    return {
      files: data.data,
      total: data.pagination?.total || data.count || data.data.length,
      pagination: data.pagination
    };
  } else if (data.files) {
    // Old format
    return {
      files: data.files,
      total: data.total || data.files.length
    };
  } else {
    // Fallback
    return {
      files: data,
      total: data.length
    };
  }
};

/* Format file size for display - From Code #1 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/* Download File */
export const downloadFile = async (fileId: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/download/${fileId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(error.error || 'Download failed');
  }

  const data = await response.json();

  // Convert hex string to byte
  const bytes = new Uint8Array(
    data.data.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
  );

  return new Blob([bytes]);
};

/* Delete File - Enhanced with better response */
export const deleteFile = async (
  fileId: string, 
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/delete/${fileId}?user_id=${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(error.error || 'Delete failed');
  }

  return response.json();
};

/* Share File - From Code #2 (missing in Code #1) */
export const shareFile = async (
  fileId: string, 
  sharedWith: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_id: fileId, shared_with: sharedWith }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Share failed' }));
    throw new Error(error.error || 'Share failed');
  }

  return response.json();
};

/* Decrypt File */
export interface DecryptFileParams {
  fileId: string;
  userId: string;
}

export interface DecryptionError {
  error: string;
  message: string;
  details?: string;
}

export const decryptFile = async ({ 
  fileId, 
  userId 
}: DecryptFileParams): Promise<Blob> => {
  const response = await fetch(
    `${API_BASE_URL}/decrypt/${fileId}?user_id=${userId}`
  );

  if (!response.ok) {
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

/* Get Recent Activity (from FileStorageService) */
export const getRecentActivity = async (
  userId: string, 
  limit: number = 10
): Promise<{ activities: any[] }> => {
  const response = await fetch(
    `${API_BASE_URL}/recent?user_id=${userId}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch recent activity');
  }

  return response.json();
};

/* Health Check */
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
};