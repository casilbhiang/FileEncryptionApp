'use client';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ChevronDown, Loader2, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { getAvailableUsers, shareFile, getFilesSharedWithRecipient } from '../../services/sharesService';
import { getMyFiles } from '../../services/Files';
import type { ShareFileParams } from '../../services/sharesService';
import type { FileItem } from '../../services/Files';
import { useNotifications } from '../../contexts/NotificationContext';
import { storage } from '../../utils/storage';

interface User {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  role?: string;
}

interface CurrentUser {
  id: string;
  uuid: string;
  role: string;
  email: string;
  name: string;
}

const ShareFiles: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';
  const { addNotification } = useNotifications();

  const getCurrentUser = (): CurrentUser | null => {
    try {
      const userData = storage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id || user.userId;
        const uuid = user.uuid || user.userUuid;
        if (id && uuid) {
          return {
            id: id,
            uuid: uuid,
            role: user.role || user.userRole,
            email: user.email || user.userEmail,
            name: user.name || user.username || user.email || `User ${id}`
          };
        }
      }
      const userId = storage.getItem('user_id');
      const userUuid = storage.getItem('user_uuid');
      const userRoleFromStorage = storage.getItem('user_role');
      const userEmail = storage.getItem('user_email');
      if (userId && userUuid) {
        return {
          id: userId,
          uuid: userUuid,
          role: userRoleFromStorage || 'patient',
          email: userEmail || `${userId}@clinic.com`,
          name: `User ${userId}`
        };
      }
    } catch (error) {
      console.error('Error getting user from storage:', error);
    }
    return null;
  };

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<FileItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [filesSharedWithRecipient, setFilesSharedWithRecipient] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    files: false,
    users: false,
    sharing: false,
    initializing: true
  });
  const [shareResult, setShareResult] = useState<{ success: boolean; message: string; share_id?: string } | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(prev => ({ ...prev, initializing: false }));
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      fetchUserFiles();
      fetchAvailableUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    setSelectedFile('');
    setShowFileDropdown(false);
  }, [selectedRecipient]);

  const fetchUserFiles = async () => {
    if (!currentUser?.uuid) return;
    setLoading(prev => ({ ...prev, files: true }));
    setErrors(prev => ({ ...prev, files: '' }));
    try {
      const result = await getMyFiles(
        currentUser.uuid,
        '',
        'uploaded_at',
        'desc',
        'all',
        1,
        100
      );
      const files = result.files || [];
      const userOwnedFiles = files.filter(file => {
        return (
          file.is_owned === true ||
          file.owner_id === currentUser.id ||
          !file.shared_by
        );
      });
      setAvailableFiles(userOwnedFiles);
      if (userOwnedFiles.length === 0) {
        setErrors(prev => ({
          ...prev,
          files: 'No files available to share. Please upload files first.'
        }));
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setErrors(prev => ({
        ...prev,
        files: 'Error loading files. Please try again.'
      }));
    } finally {
      setLoading(prev => ({ ...prev, files: false }));
    }
  };

  const fetchAvailableUsers = async () => {
    if (!currentUser?.uuid) return;
    setLoading(prev => ({ ...prev, users: true }));
    setErrors(prev => ({ ...prev, users: '' }));
    try {
      const result = await getAvailableUsers(currentUser.id);
      if (result.success) {
        const users = Array.isArray(result.data) ? result.data : [];
        setAvailableUsers(users);
        if (users.length === 0) {
          setErrors(prev => ({
            ...prev,
            users: 'No recipients found. Make sure other users are registered in the system.'
          }));
        }
      } else {
        setErrors(prev => ({
          ...prev,
          users: result.error || 'Failed to load recipients. Please try again.'
        }));
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      setErrors(prev => ({
        ...prev,
        users: 'Network error. Please check if the backend server is running.'
      }));
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const fetchFilesSharedWithRecipient = async (recipientId: string) => {
    if (!currentUser || !currentUser.id) return;
    try {
      const result = await getFilesSharedWithRecipient(currentUser.id, recipientId);
      if (result.success) {
        const sharedFileIds = Array.isArray(result.data) ? result.data : [];
        setFilesSharedWithRecipient(sharedFileIds);
      } else {
        setFilesSharedWithRecipient([]);
      }
    } catch (error) {
      console.error('Error fetching shared files with recipient:', error);
      setFilesSharedWithRecipient([]);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId === selectedFile ? '' : fileId);
    setErrors(prev => ({ ...prev, files: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!selectedRecipient) {
      newErrors.recipient = 'Please select a recipient';
    }
    if (!selectedFile) {
      newErrors.files = 'Please select a file to share';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShare = async () => {
    if (!currentUser || !currentUser.id || !currentUser.uuid) {
      setShareResult({
        success: false,
        message: 'No user information found. Please log in again.'
      });
      return;
    }
    if (!validateForm()) return;

    setLoading(prev => ({ ...prev, sharing: true }));
    setShareResult(null);

    try {
      const recipientUser = availableUsers.find(u => u.id === selectedRecipient);
      const recipientStringId = recipientUser?.user_id || recipientUser?.email || selectedRecipient;

      if (!recipientUser) {
        setShareResult({
          success: false,
          message: 'Selected recipient not found'
        });
        setLoading(prev => ({ ...prev, sharing: false }));
        return;
      }

      const shareParams: ShareFileParams = {
        file_id: selectedFile,
        shared_by: currentUser.id,
        shared_by_uuid: currentUser.uuid,
        shared_with: recipientUser.id,
        access_level: 'read',
        message: undefined
      };

      const result = await shareFile(shareParams);

      if (result.success) {
        const recipientName = availableUsers.find(u => u.id === selectedRecipient)?.name || 'Recipient';
        const sharerName = currentUser?.name || 'You';
        const sharedFileName = availableFiles.find(f => f.id === selectedFile)?.name || 'file';

        addNotification({
          user_id: currentUser.id,
          title: 'Files Shared',
          message: `Shared "${sharedFileName}" with ${recipientName} (ID: ${selectedRecipient})`,
          type: 'file_shared',
          metadata: {
            recipientName: recipientName,
            recipientId: selectedRecipient,
            fileName: sharedFileName,
            fileCount: 1,
            fileNames: [sharedFileName],
            action: 'share_success',
            share_id: result.data?.share_id
          },
          showAsToast: true,
          persistToSidebar: false
        });

        addNotification({
          user_id: recipientStringId,
          title: 'Files Received',
          message: `Received "${sharedFileName}" from ${sharerName} (ID: ${currentUser.id})`,
          type: 'file_received',
          metadata: {
            sharerName: sharerName,
            sharerId: currentUser.id,
            fileName: sharedFileName,
            fileCount: 1,
            fileNames: [sharedFileName],
            action: 'file_received',
            share_id: result.data?.share_id
          },
          showAsToast: false,
          persistToSidebar: true
        });

        setShareResult({
          success: true,
          message: `"${sharedFileName}" shared successfully with ${recipientName} (ID: ${selectedRecipient})!`,
          share_id: result.data?.share_id
        });

        setSelectedFile('');
        setSelectedRecipient('');
        setShowFileDropdown(false);
        setTimeout(() => fetchUserFiles(), 1000);
      } else {
        addNotification({
          user_id: currentUser.id,
          title: 'Share Failed',
          message: `Failed to share file with ${recipientUser.name}`,
          type: 'error',
          metadata: {
            recipientName: recipientUser.name,
            recipientId: selectedRecipient,
            fileCount: 1,
            action: 'share_error',
            error: result.error
          },
          showAsToast: true,
          persistToSidebar: false
        });
        setShareResult({
          success: false,
          message: result.error || 'Failed to share file. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      addNotification({
        user_id: currentUser?.id || 'unknown',
        title: 'Network Error',
        message: 'Failed to share files due to network connection',
        type: 'error',
        metadata: {
          action: 'network_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        showAsToast: true,
        persistToSidebar: false
      });
      setShareResult({
        success: false,
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setLoading(prev => ({ ...prev, sharing: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileType = (file: FileItem): string => {
    if (file.file_extension) return file.file_extension.replace('.', '').toUpperCase();
    if (file.name.includes('.')) {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      return ext;
    }
    return 'FILE';
  };

  const getFilterableFiles = () => {
    if (!selectedRecipient) return [];
    return availableFiles.filter(file => !filesSharedWithRecipient.includes(file.id));
  };

  if (loading.initializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access the Share Files page.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition w-full"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const filterableFiles = getFilterableFiles();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole={userRole} currentPage="share" />
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Share Files</h1>
          <p className="text-gray-600">Securely share files with other users.</p>
        </div>

        {/* Share Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          {/* Recipient Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {userRole === 'doctor' ? 'Select Patient' : 'Select Doctor'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedRecipient}
                onChange={(e) => {
                  const recipientId = e.target.value;
                  setSelectedRecipient(recipientId);
                  setErrors(prev => ({ ...prev, recipient: '' }));
                  if (recipientId) {
                    fetchFilesSharedWithRecipient(recipientId);
                  } else {
                    setFilesSharedWithRecipient([]);
                  }
                }}
                disabled={loading.users || availableUsers.length === 0}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${errors.recipient ? 'border-red-300' : 'border-gray-300'} ${(loading.users || availableUsers.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {loading.users
                    ? 'Loading recipients...'
                    : availableUsers.length === 0
                      ? 'No recipients available'
                      : `Select a ${userRole === 'doctor' ? 'patient' : 'doctor'}`
                  }
                </option>
                {availableUsers.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name}
                    {recipient.email ? ` (${recipient.email})` : ''}
                    {recipient.role ? ` - ${recipient.role}` : ''}
                  </option>
                ))}
              </select>
              {loading.users ? (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              )}
            </div>
            {errors.recipient && (
              <p className="mt-1 text-sm text-red-600">{errors.recipient}</p>
            )}
            {errors.users && !loading.users && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-700 text-xs">{errors.users}</p>
                <button
                  onClick={fetchAvailableUsers}
                  className="text-yellow-600 text-xs hover:text-yellow-800 mt-1"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Choose File */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select a File to Share
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="mb-4">
              {selectedRecipient ? (
                <>
                  <button
                    onClick={() => setShowFileDropdown(!showFileDropdown)}
                    disabled={loading.files || filterableFiles.length === 0}
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.files ? 'border-red-300' : 'border-gray-300'} ${(loading.files || filterableFiles.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-gray-600">
                      {loading.files
                        ? 'Loading your files...'
                        : selectedFile
                          ? availableFiles.find(f => f.id === selectedFile)?.name || 'File selected'
                          : filterableFiles.length === 0
                            ? 'No files available to share with this recipient'
                            : 'Click to select a file'
                      }
                    </span>
                    {loading.files ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showFileDropdown ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {errors.files && (
                    <p className="mt-1 text-sm text-red-600">{errors.files}</p>
                  )}

                  {/* Files Dropdown List */}
                  {showFileDropdown && !loading.files && filterableFiles.length > 0 && (
                    <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-sm max-h-80 overflow-y-auto">
                      <div className="p-2">
                        <div className="space-y-1">
                          {filterableFiles.map((file) => (
                            <div
                              key={file.id}
                              className={`flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer rounded-md ${selectedFile === file.id ? 'bg-blue-50 border border-blue-100' : ''}`}
                              onClick={() => handleFileSelect(file.id)}
                            >
                              <div className={`w-5 h-5 border rounded-full flex items-center justify-center mt-0.5 ${selectedFile === file.id ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {selectedFile === file.id && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                                    {getFileType(file)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(file.size || file.file_size || 0)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    • {new Date(file.uploaded_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All files already shared */}
                  {showFileDropdown && !loading.files && filterableFiles.length === 0 && (
                    <div className="mt-2 border border-gray-300 rounded-lg bg-gray-50 p-4 text-center">
                      <p className="text-gray-700">All your files are already shared with this recipient.</p>
                      <p className="text-gray-500 text-sm mt-1">Upload new files to share more.</p>
                    </div>
                  )}

                  {/* Already shared files list */}
                  {filesSharedWithRecipient.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-700 text-sm font-medium mb-2">
                        Files already shared with recipient:
                      </p>
                      <div className="space-y-1">
                        {filesSharedWithRecipient.map(fileId => {
                          const file = availableFiles.find(f => f.id === fileId);
                          return file ? (
                            <div key={fileId} className="flex items-center gap-2 px-2 py-1">
                              <span className="text-blue-600 text-xs font-medium">•</span>
                              <span className="text-blue-600 text-xs truncate">{file.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* No files at all */}
                  {!loading.files && filterableFiles.length === 0 && filesSharedWithRecipient.length === 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-yellow-700 text-sm">
                            You don't have any sharable files.
                          </p>
                          <p className="text-yellow-600 text-xs mt-1">
                            Upload new files or check if your existing files are already shared.
                          </p>
                          <button
                            onClick={() => navigate(userRole === 'doctor' ? '/doctor/my-files' : '/patient/my-files')}
                            className="text-yellow-600 text-sm hover:text-yellow-800 mt-2 font-medium"
                          >
                            Go to My Files →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  disabled={true}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-left flex items-center justify-between focus:outline-none opacity-50 cursor-not-allowed"
                >
                  <span className="text-gray-500">
                    Select a recipient first to view available files
                  </span>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Share Button */}
          <div className="flex justify-center">
            <button
              onClick={handleShare}
              disabled={!selectedRecipient || !selectedFile || loading.sharing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading.sharing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Share File
                </>
              )}
            </button>
          </div>

          {/* Success/Error Message */}
          {shareResult && (
            <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${shareResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {shareResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${shareResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {shareResult.message}
                </p>
                {shareResult.success && (
                  <div className="mt-2">
                    <button
                      onClick={() => navigate(userRole === 'doctor' ? '/doctor/my-files' : '/patient/my-files')}
                      className="text-green-600 text-sm hover:text-green-800 underline"
                    >
                      View in My Files
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShareResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Files are securely encrypted during sharing. Only the recipient can decrypt them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareFiles;