
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/files`;

// Interfaces from Code #1
export interface FileShare {
  shared_with: string;
  shared_at: string;
  access_level: string;
}

// Enhanced FileItem interface combining both versions
// services/Files.ts - PROPER VERSION
export interface FileItem {
  id: string;
  name: string;
  size: number; 
  uploaded_at: string;
  file_extension?: string;
  owner_id: string; 
  owner_uuid?: string;
  
  // Ownership and sharing status
  is_owned?: boolean;
  is_shared?: boolean;
  
  // For files shared WITH you
  shared_by?: string;
  shared_by_name?: string;
  shared_by_uuid?: string;
  
  // For files you've shared
  shared_with_names?: string[];  // This should exist
  shared_count?: number;
  
  // Timestamps
  shared_at?: string;
  last_accessed_at?: string;
  
  // Owner information
  owner_name?: string;
  owner_role?: string;
  
  // Additional file info
  file_size?: number;
  
  // Legacy/optional
  shares?: FileShare[];
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
  originalSize?: number;
  encryptedSize?: number;
}

export interface FileMetadata {
  original_filename: string;
  encryption_metadata: EncryptionMetadata;
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

export interface ShareFileParams {
  file_id: string;
  shared_by: string;
  shared_by_uuid: string;
  shared_with: string;
  access_level: 'read' | 'write';
  message?: string;
}

export interface ShareResponse {
  message: string;
  share_id: string;
  file_name: string;
  shared_with: string;
  access_level: string;
}

export interface DecryptFileParams {
    fileId: string;
    encryptedData: ArrayBuffer;
    encryptionMetadata: {
        iv: string;
        authTag: string;
        [key: string]: any;
    };
}

/* File Upload */
export const uploadFile = async (
  file: File, 
  userId: string, 
  userUuid: string,
  encryptionMetadata?: EncryptionMetadata, 
  signal?: AbortSignal
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  formData.append('user_uuid', userUuid);

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
  params.append('user_uuid', userId);
  if (search) params.append('search', search);
  if (sortField) params.append('sort', sortField);
  if (sortOrder) params.append('order', sortOrder);
  if (filter) params.append('filter', filter);
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/my-files?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch files' }));
    throw new Error(error.error || 'Failed to fetch files');
  }

  const data = await response.json();
  
  // DEBUG: Log what we're receiving
  console.log('=== BACKEND RESPONSE STRUCTURE ===');
  console.log('Full response keys:', Object.keys(data));
  console.log('Files array length:', data.files?.length);
  if (data.files && data.files.length > 0) {
    console.log('First file object:', data.files[0]);
    console.log('First file keys:', Object.keys(data.files[0]));
  }
  
  // Handle different response formats
  if (data.success && data.data) {
    // New format with pagination
    return {
      files: data.data,
      total: data.pagination?.total || data.count || data.data.length,
      pagination: data.pagination
    };
  } else if (data.files) {
    // Old format - THIS IS WHAT YOUR BACKEND RETURNS (from files.py line 338)
    // The backend returns { files: [...], total: X, page: Y, ... }
    return {
      files: data.files as FileItem[], // Cast to ensure TypeScript knows the structure
      total: data.total || data.files.length,
      pagination: data.pagination || {
        page: data.page || 1,
        limit: data.limit || limit || 20,
        total: data.total || data.files.length,
        pages: data.total_pages || Math.ceil((data.total || data.files.length) / (data.limit || limit || 20))
      }
    };
  } else {
    // Fallback
    return {
      files: data as FileItem[],
      total: data.length
    };
  }
};


/* Format file size for display */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/* Get File Metadata (including encryption IV) */
export const getFileMetadata = async (
  fileId: string, 
  userUuid: string
): Promise<FileMetadata> => {
  const response = await fetch(
    `${API_BASE_URL}/metadata/${fileId}?user_uuid=${userUuid}`
  );
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch metadata' }));
    throw new Error(error.error || 'Failed to fetch metadata');
  }
  
  return response.json();
};

/* Download File */
export const downloadFile = async (fileId: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/download/${fileId}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(error.error || 'Download failed');
  }
  
  const data = await response.json();
  
  // Convert hex string to bytes
  const bytes = new Uint8Array(
    data.data.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
  );
  
  return new Blob([bytes]);
};

/* Complete Download & Decrypt */
export interface DownloadAndDecryptParams {
  fileId: string;
  userUuid: string;
  decryptionKey: CryptoKey;
}

export const downloadAndDecryptFile = async ({
  fileId,
  userUuid,
  decryptionKey
}: DownloadAndDecryptParams): Promise<{ blob: Blob; filename: string }> => {
  console.log('=== Starting download and decrypt ===');
  console.log('File ID:', fileId);
  
  try {
    // Step 1: Get file metadata (including IV)
    console.log('Fetching metadata...');
    const metadata = await getFileMetadata(fileId, userUuid);
    console.log('Metadata retrieved:', {
      filename: metadata.original_filename,
      iv: metadata.encryption_metadata.iv
    });
    
    if (!metadata.encryption_metadata || !metadata.encryption_metadata.iv) {
      throw new Error('Encryption metadata not found. File may not be encrypted.');
    }
    
    // Step 2: Download encrypted file
    console.log('Downloading encrypted file...');
    const encryptedBlob = await downloadFile(fileId);
    console.log('Downloaded, size:', encryptedBlob.size);
    
    // Step 3: Decrypt using Web Crypto API
    console.log('Decrypting file...');
    const encryptedData = await encryptedBlob.arrayBuffer();
    
    // Convert IV from base64
    const ivString = metadata.encryption_metadata.iv;
    const ivBinary = atob(ivString);
    const ivArray = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) {
      ivArray[i] = ivBinary.charCodeAt(i);
    }
    
    console.log('IV length:', ivArray.length);
    console.log('Encrypted data size:', encryptedData.byteLength);
    
    // Decrypt with AES-GCM
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivArray
      },
      decryptionKey,
      encryptedData
    );
    
    console.log('Decrypted successfully, size:', decryptedData.byteLength);
    
    const decryptedBlob = new Blob([decryptedData]);
    
    return {
      blob: decryptedBlob,
      filename: metadata.original_filename
    };
    
  } catch (error) {
    console.error('Download/decrypt error:', error);
    
    if (error instanceof Error && error.name === 'OperationError') {
      throw new Error('Decryption failed: Wrong encryption key or corrupted file');
    }
    
    throw error;
  }
};

/* Delete File */
export const deleteFile = async (
  fileId: string, 
  userUuid: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/delete/${fileId}?user_uuid=${userUuid}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(error.error || 'Delete failed');
  }

  return response.json();
};

/* Share File */
export const shareFile = async (
  params: ShareFileParams
): Promise<{ success: boolean; data?: ShareResponse; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/shares/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: params.file_id,
        shared_by: params.shared_by,
        shared_by_uuid: params.shared_by_uuid,
        shared_with: params.shared_with,
        access_level: params.access_level,
        message: params.message
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Share failed' }));
      return {
        success: false,
        error: error.error || 'Share failed'
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share failed'
    };
  }
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

/* Get Recent Activity */
export const getRecentActivity = async (
  userId: string, 
  limit: number = 10
): Promise<{ activities: any[] }> => {
  const response = await fetch(
    `${API_BASE_URL}/recent?user_uuid=${userId}&limit=${limit}`
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