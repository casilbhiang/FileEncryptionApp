'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Upload, X, Folder, Check, Trash2, Lock } from 'lucide-react';
import { uploadFile, deleteFile } from '../../services/Files';
import { encryptFile, getStoredEncryptionKey, hasEncryptionKey } from '../../services/Encryption(JY)';

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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [keyAvailable, setKeyAvailable] = useState(false);

  // HARDCODED USER:
  const TEST_USER_ID = '0ae915b0-8b94-453a-abcb-d83e26264463';

  useEffect(() => { loadEncryptionKey(); }, []);

  const loadEncryptionKey = async () => {
    try {
      setIsLoadingKey(true);

      // Check if key exists
      const hasKey = hasEncryptionKey(TEST_USER_ID);
      setKeyAvailable(hasKey);

      if (hasKey) {
        console.log('Encryption key found in storage, retrieving...');
        const key = await getStoredEncryptionKey(TEST_USER_ID);

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
      alert('No encryption key found!\n\nPlease scan the QR code provided by the System Administrator to set up encryption before uploading files.');
      return;
    }

    for (const file of files) {
      const tempId = Date.now() + Math.random();
      const abortController = new AbortController();
      let uploadedFileId: string | null = null;

      // Add file to list with encrypting status
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
            await deleteFile(uploadedFileId);
          } catch (error) {
            console.error('Failed to remove cancelled file:', error);
          }
          setUploadedFiles((prev) => prev.filter((f) => f.id !== tempId));
          return;
        }

        // STEP 3: Confirm Upload
        try {
          await fetch(`http://localhost:5000/api/files/confirm/${uploadedFileId}`, {
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
      } catch (error) {
        // Handle cancellation
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Upload cancelled by user');
          if (uploadedFileId) {
            try {
              await deleteFile(uploadedFileId);
            } catch (deleteError) {
              console.error('Failed to delete cancelled file:', deleteError);
            }
          }
          setUploadedFiles((prev) => prev.filter((f) => f.id !== tempId));
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
    }
  };

  const handleRemoveFile = async (id: number | string) => {
    const file = uploadedFiles.find(f => f.id === id);
    
    // If it's a completed file with a backend ID, delete from backend
    if (file && file.backendFileId) {
      try {
        console.log('Deleting file from backend:', file.backendFileId);
        await deleteFile(file.backendFileId);
        console.log('File removed from backend:', file.backendFileId);
      } catch (error) {
        console.error('Failed to remove file from backend:', error);
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
      <Sidebar userRole="doctor" currentPage="upload" />
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">UPLOAD FILES</h1>
              <p className="text-gray-600">Your Data Is Securely Encrypted And Accessible Only To You.</p>
            </div>
            <button className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition">
              <Upload className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg p-8 mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose a file or drag & drop it here
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                PDF, PNG, JPEG, and JPG formats, up to 50MB
              </p>
              <label className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition cursor-pointer">
                Browse File
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
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
                    file.status === 'uploading'
                    ? handleCancelUpload(file)
                    : handleRemoveFile(file.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                  title={file.status === 'uploading' ? 'Cancel upload' : 'Remove file'}
                >
                  {file.status === 'uploading' ? (
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