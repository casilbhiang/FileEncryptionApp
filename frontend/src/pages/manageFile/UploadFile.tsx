'use client';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { Upload, X, Folder, Check, Trash2, Lock } from 'lucide-react';
import { uploadFile, deleteFile } from '../../services/Files';
import { encryptFile, getStoredEncryptionKey, hasEncryptionKey } from '../../services/Encryption';
import { storage } from '../../utils/storage';
import { useNotifications } from '../../contexts/NotificationContext';

interface UploadedFile {
  id: number | string;
  name: string;
  size: string;
  status: 'encrypting' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  errorMessage?: string;
  abortController?: AbortController;
  backendFileId?: string;
}

const UploadFilePage: React.FC = () => {
  const location = useLocation();
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';
  const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [keyAvailable, setKeyAvailable] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userUuid, setUserUuid] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = storage.getItem('user_id');
    const storedUserUuid = storage.getItem('user_uuid');
    if (storedUserId && storedUserUuid) {
      setUserId(storedUserId);
      setUserUuid(storedUserUuid);
      loadEncryptionKey(storedUserId);
    } else {
      setKeyAvailable(false);
      setIsLoadingKey(false);
    }
  }, []);

  const loadEncryptionKey = async (activeUserId: string) => {
    try {
      setIsLoadingKey(true);
      const hasKey = hasEncryptionKey(activeUserId);
      setKeyAvailable(hasKey);
      if (hasKey) {
        console.log('Encryption key found in storage, retrieving...');
        const key = await getStoredEncryptionKey(activeUserId);
        if (key) {
          setEncryptionKey(key);
          console.log('Encryption key loaded successfully');
        } else {
          console.log('Failed to retrieve encryption key from storage');
          setKeyAvailable(false);
        }
      } else {
        console.log('No encryption key found for user, need to scan QR code');
      }
    } catch (error) {
      console.error('Error loading encryption key: ', error);
      setKeyAvailable(false);
    } finally {
      setIsLoadingKey(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await handleFiles(Array.from(files));
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    // Check if encryption key is available
    if (!encryptionKey || !keyAvailable) {
      showWarningToast(
        'Encryption Key Required',
        'Please scan the QR code from System Administrator to set up encryption before uploading files.'
      );
      return;
    }

    for (const file of files) {
      const tempId = Date.now() + Math.random();
      const abortController = new AbortController();
      let uploadedFileId: string | null = null;

      const newFile: UploadedFile = {
        id: tempId,
        name: file.name,
        size: `0 KB of ${formatFileSize(file.size)}`,
        status: 'encrypting',
        progress: 0,
        abortController,
      };

      setUploadedFiles((prev) => [...prev, newFile]);

      try {
        // STEP 1: Encrypt File (Client-side)
        console.log('Encrypting file:', file.name);
        const encryptionResult = await encryptFile(file, encryptionKey);

        // Check if cancelled during encryption
        if (abortController.signal.aborted) {
          console.log('Cancelled during encryption');
          setUploadedFiles((prev) => prev.filter((f) => f.id !== tempId));
          return;
        }

        // Update status to uploading
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: 'uploading' as const } : f
          )
        );

        // STEP 2: Upload Encrypted Blob
        console.log('Uploading encrypted file to server...');

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === tempId && f.progress !== undefined && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 200);

        // Create encrypted file blob with original filename
        const encryptedFile = new File([encryptionResult.encryptedBlob], file.name, {
          type: 'application/octet-stream',
        });

        // Upload with encryption metadata
        const response = await uploadFile(
          encryptedFile,
          userId!,
          userUuid!,
          {
            iv: encryptionResult.iv,
            authTag: encryptionResult.authTag,
            algorithm: encryptionResult.algorithm,
          },
          abortController.signal
        );

        uploadedFileId = response.file_id;
        clearInterval(progressInterval);

        // Check if cancelled after upload completes
        if (abortController.signal.aborted) {
          console.log('Upload cancelled, cleaning up:', uploadedFileId);
          try {
            if (userUuid) await deleteFile(uploadedFileId, userUuid);
          } catch (error) {
            console.error('Failed to remove cancelled file:', error);
          }
          setUploadedFiles((prev) => prev.filter((f) => f.id !== tempId));
          return;
        }

        // STEP 3: Confirm Upload
        try {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/files/confirm/${uploadedFileId}`, {
            method: 'POST',
          });
          console.log('Upload confirmed:', uploadedFileId);
        } catch (error) {
          console.error('Failed to confirm upload:', error);
        }

        // Update to completed
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                ...f,
                id: uploadedFileId!,
                backendFileId: uploadedFileId!,
                status: 'completed',
                progress: 100,
                size: formatFileSize(file.size),
                abortController: undefined,
              }
              : f
          )
        );

        showSuccessToast('Upload Successful', `${file.name} uploaded successfully`);

      } catch (error) {
        // Handle cancellation
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Upload cancelled by user');
          if (uploadedFileId) {
            try {
              if (userUuid) await deleteFile(uploadedFileId, userUuid);
            } catch (deleteError) {
              console.error('Failed to delete cancelled file:', deleteError);
            }
          }
          setUploadedFiles((prev) => prev.filter((f) => f.id !== tempId));
          showWarningToast('Upload Cancelled', `Upload of ${file.name} was cancelled`);
          return;
        }

        // Handle encryption/upload errors
        console.error('Upload error:', error);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                ...f,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Upload failed',
                abortController: undefined,
              }
              : f
          )
        );

        showErrorToast(
          'Upload Failed',
          `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  };

  const handleCancelUpload = async (file: UploadedFile) => {
    if ((file.status === 'uploading' || file.status === 'encrypting') && file.abortController) {
      console.log(`Cancelling upload: ${file.name}`);
      
      // Abort the fetch request
      file.abortController.abort();
      
      // Update UI to show cancelled
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: 'cancelled', progress: 0 }
            : f
        )
      );

      showWarningToast('Upload Cancelled', `Upload of ${file.name} has been cancelled`);
    }
  };

  const handleRemoveFile = async (id: number | string) => {
    const file = uploadedFiles.find(f => f.id === id);
    
    if (file && file.backendFileId && userUuid) {
      try {
        console.log('Deleting file from backend:', file.backendFileId);
        await deleteFile(file.backendFileId, userUuid);
        console.log('File removed from backend:', file.backendFileId);
        showSuccessToast('File Removed', `${file.name} removed successfully`);
      } catch (error) {
        console.error('Failed to remove file from backend:', error);
        showErrorToast('Delete Failed', `Failed to remove ${file.name} from server`);
        return;
      }
    }

    // Remove from UI
    setUploadedFiles(files => files.filter(file => file.id !== id));
  };

  if (isLoadingKey) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-700">Loading encryption key...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole={userRole} currentPage="upload" />
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Upload Files</h1>
            <p className="text-gray-600">Your Data Is Securely Encrypted And Accessible Only To You.</p>
            {/* Warning banner when key is not available */}
            {!keyAvailable && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Encryption key not available.</strong> Please scan the QR code from System Administrator before uploading.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg p-8 mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            } ${!keyAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDrop={keyAvailable ? handleDrop : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              if (keyAvailable) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {keyAvailable ? (
                  <Upload className="w-8 h-8 text-gray-400" />
                ) : (
                  <Lock className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {keyAvailable ? 'Choose a file or drag & drop it here' : 'Encryption key required'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {keyAvailable
                  ? 'PDF, PNG, JPEG, and JPG formats, up to 50MB'
                  : 'Please set up encryption before uploading files'}
              </p>
              <label
                className={`px-6 py-2 border-2 border-gray-300 rounded-lg font-medium transition ${
                  keyAvailable ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                Browse File
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  disabled={!keyAvailable}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Folder className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{file.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">{file.size}</p>
                    {file.status === 'encrypting' && (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-purple-600 animate-pulse" />
                        <span className="text-xs text-purple-600 font-medium">Encrypting...</span>
                      </div>
                    )}
                    {file.status === 'uploading' && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">Uploading...</span>
                      </div>
                    )}
                    {file.status === 'cancelled' && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">Cancelled</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    )}
                    {file.status === 'failed' && (
                      <div className="flex items-center gap-1 text-red-600">
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">Failed: {file.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    file.status === 'uploading' || file.status === 'encrypting'
                      ? handleCancelUpload(file)
                      : handleRemoveFile(file.id)
                  }
                  className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                  title={file.status === 'uploading' || file.status === 'encrypting' ? 'Cancel upload' : 'Remove file'}
                >
                  {file.status === 'uploading' || file.status === 'encrypting' ? (
                    <X className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadFilePage;
