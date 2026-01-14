'use client';

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ChevronDown, Loader2, AlertCircle, CheckCircle2, UserPlus, RefreshCw } from 'lucide-react';

// Import services - these should match your sharesService.ts
import { getAvailableUsers, shareFile } from '../../services/sharesService';
import { getMyFiles } from '../../services/Files';

// Import types
import type { ShareFileParams } from '../../services/sharesService';
import type { FileItem } from '../../services/Files';

// Define User interface matching your backend
interface User {
  id: string;
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
  
  // Get user role from URL
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';
  
  // Get current user from localStorage
  const getCurrentUser = (): CurrentUser | null => {
    try {
      // Try to get from 'user' object
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const id = user.id || user.userId;
        const uuid = user.uuid || user.userUuid;
        
        // Only return if we have both id AND uuid
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
      
      // Fallback to separate keys
      const userId = localStorage.getItem('user_id');
      const userUuid = localStorage.getItem('user_uuid');
      const userRoleFromStorage = localStorage.getItem('user_role');
      const userEmail = localStorage.getItem('user_email');
      
      // Only return if we have BOTH userId and userUuid
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
      console.error('Error getting user from localStorage:', error);
    }
    
    return null;
  };
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<FileItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState({
    files: false,
    users: false,
    sharing: false,
    initializing: true
  });
  const [shareResult, setShareResult] = useState<{ success: boolean; message: string; share_id?: string } | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Get current user on component mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      console.log('Setting current user:', user);
      setCurrentUser(user);
    } else {
      console.log('No user found in localStorage');
    }
    setLoading(prev => ({ ...prev, initializing: false }));
  }, []);

  // Fetch user's files and available recipients when user is set
  useEffect(() => {
    if (currentUser && currentUser.id) {
      console.log('Fetching data for user:', currentUser.id);
      fetchUserFiles();
      fetchAvailableUsers();
    }
  }, [currentUser]);

  const fetchUserFiles = async () => {
    if (!currentUser?.uuid) return;
    
    setLoading(prev => ({ ...prev, files: true }));
    setErrors(prev => ({ ...prev, files: '' }));
    
    try {
      console.log('Fetching files for user:', currentUser.id);
      
      const result = await getMyFiles(
        currentUser.uuid,
        '', // search
        'uploaded_at', // sort
        'desc', // order
        'all',
        1, // page
        100 // limit
      );
      
      console.log('Files API result:', result);
      
      const files = result.files || [];
      console.log('Number of files received:', files.length);
      
      // Filter to show only files owned by the user
      const ownedFiles = files.filter(file => 
        file.is_owned === true || 
        file.owner_id === currentUser.id ||
        !file.shared_by // If no shared_by, it's owned
      );
      
      setAvailableFiles(ownedFiles);
      
      if (ownedFiles.length === 0) {
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
    setDebugInfo('');
    
    try {
      console.log('Fetching available users for user ID:', currentUser.id);
      console.log('Endpoint: http://localhost:5000/api/shares/available-users');
      
      // Call the getAvailableUsers function from your service
      const result = await getAvailableUsers(currentUser.id);
      
      console.log('Available users API result:', result);
      
      if (result.success) {
        const users = Array.isArray(result.data) ? result.data : [];
        setAvailableUsers(users);
        setDebugInfo(`Loaded ${users.length} users from API`);
        console.log('Available users loaded:', users);
        
        if (users.length === 0) {
          setErrors(prev => ({ 
            ...prev, 
            users: 'No recipients found. Make sure other users are registered in the system.' 
          }));
        }
      } else {
        console.error('API returned error:', result.error);
        setDebugInfo(`API error: ${result.error}`);
        setErrors(prev => ({ 
          ...prev, 
          users: result.error || 'Failed to load recipients. Please try again.' 
        }));
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      setDebugInfo(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setErrors(prev => ({ 
        ...prev, 
        users: 'Network error. Please check if the backend server is running.' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const handleFileToggle = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
    setErrors(prev => ({ ...prev, files: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!selectedRecipient) {
      newErrors.recipient = 'Please select a recipient';
    }
    
    if (selectedFiles.length === 0) {
      newErrors.files = 'Please select at least one file to share';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShare = async () => {
    if (!currentUser || !currentUser.id || !currentUser.uuid) {
      console.error('No user ID or UUID found');
      setShareResult({
        success: false,
        message: 'No user information found. Please log in again.'
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(prev => ({ ...prev, sharing: true }));
    setShareResult(null);
    
    try {
      // Find the recipient's UUID
      const recipientUser = availableUsers.find(u => u.id === selectedRecipient);
      
      if (!recipientUser) {
        setShareResult({
          success: false,
          message: 'Selected recipient not found'
        });
        setLoading(prev => ({ ...prev, sharing: false }));
        return;
      }
      
      // Need to get recipient UUID - update User interface first
      const shareParams: ShareFileParams = {
        file_id: selectedFiles[0],
        shared_by: currentUser.id,
        shared_by_uuid: currentUser.uuid!,
        shared_with: recipientUser.id,  // This might need to be UUID
        access_level: 'read',
        message: message.trim() || undefined
      };

      console.log('Selected recipient ID:', selectedRecipient);
      console.log('Available users:', availableUsers);
      console.log('Selected recipient details:', availableUsers.find(u => u.id === selectedRecipient));
    
      console.log('Sharing file with params:', shareParams);
    
      const result = await shareFile(shareParams);
      
      console.log('Share result:', result);
      
      if (result.success) {
        const recipientName = availableUsers.find(u => u.id === selectedRecipient)?.name || 'Recipient';
        setShareResult({
          success: true,
          message: `File shared successfully with ${recipientName}!`,
          share_id: result.data?.share_id
        });
        
        // Reset form
        setSelectedFiles([]);
        setMessage('');
        setSelectedRecipient('');
        setShowFileDropdown(false);
        
        // Refresh files list
        setTimeout(() => fetchUserFiles(), 1000);
        
      } else {
        setShareResult({
          success: false,
          message: result.error || 'Failed to share file. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
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

  // Show loading while checking for user
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

  // Show login prompt if no user is found
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

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole={userRole} currentPage="share" />

      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Share Files</h1>
          <p className="text-gray-600">Securely share files with other users.</p>
        </div>

        {/* Debug Info */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm">
                <strong>User:</strong> {currentUser.name} | 
                <strong> ID:</strong> {currentUser.id} | 
                <strong> Role:</strong> {currentUser.role}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                <strong>Files:</strong> {availableFiles.length} available | 
                <strong> Recipients:</strong> {availableUsers.length} available
              </p>
              {debugInfo && (
                <p className="text-xs text-purple-600 mt-1">
                  <strong>Debug:</strong> {debugInfo}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAvailableUsers}
                disabled={loading.users}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                title="Refresh recipients"
              >
                <RefreshCw className={`w-3 h-3 ${loading.users ? 'animate-spin' : ''}`} />
                {loading.users ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Share Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          {/* Recipient Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {userRole === 'doctor' ? 'Select Patient' : 'Select Recipient'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedRecipient}
                onChange={(e) => {
                  setSelectedRecipient(e.target.value);
                  setErrors(prev => ({ ...prev, recipient: '' }));
                }}
                disabled={loading.users || availableUsers.length === 0}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white ${
                  errors.recipient ? 'border-red-300' : 'border-gray-300'
                } ${(loading.users || availableUsers.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {loading.users 
                    ? 'Loading recipients...' 
                    : availableUsers.length === 0
                    ? 'No recipients available'
                    : `Select a ${userRole === 'doctor' ? 'patient' : 'recipient'}`
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
          {/* Choose Files */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Files to Share
              <span className="text-red-500 ml-1">*</span>
            </label>
            
            {/* File Selection Button */}
            <div className="mb-4">
              <button
                onClick={() => setShowFileDropdown(!showFileDropdown)}
                disabled={loading.files || availableFiles.length === 0}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.files ? 'border-red-300' : 'border-gray-300'
                } ${(loading.files || availableFiles.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-gray-600">
                  {loading.files 
                    ? 'Loading your files...' 
                    : selectedFiles.length > 0
                      ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                      : availableFiles.length === 0
                      ? 'No files available to share'
                      : 'Click to select files'
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
            </div>

            {/* Files Dropdown List */}
            {showFileDropdown && !loading.files && availableFiles.length > 0 && (
              <div className="border border-gray-300 rounded-lg bg-white shadow-sm max-h-64 overflow-y-auto mb-4">
                {availableFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 ${
                      selectedFiles.includes(file.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleFileToggle(file.id)}
                  >
                    <div className={`w-5 h-5 border rounded flex items-center justify-center mt-1 ${
                      selectedFiles.includes(file.id) 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'border-gray-300'
                    }`}>
                      {selectedFiles.includes(file.id) && '✓'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {getFileType(file)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.size || file.file_size || 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Files:</h4>
                <div className="space-y-2">
                  {selectedFiles.map((fileId) => {
                    const file = availableFiles.find(f => f.id === fileId);
                    return file ? (
                      <div
                        key={fileId}
                        className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-600">
                            {getFileType(file)} • {formatFileSize(file.size || file.file_size || 0)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleFileToggle(fileId)}
                          className="text-gray-500 hover:text-red-600 ml-4"
                          aria-label={`Remove ${file.name} from selection`}
                        >
                          ✕
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            {/* No files message */}
            {!loading.files && availableFiles.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-700 text-sm">
                      You don't have any files to share.
                    </p>
                    <p className="text-yellow-600 text-xs mt-1">
                      Upload files first from the My Files page.
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
          </div>

          {/* Share Button */}
          <div className="flex justify-center">
            <button
              onClick={handleShare}
              disabled={!selectedRecipient || selectedFiles.length === 0 || loading.sharing}
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
                  Share {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}` : 'Files'}
                </>
              )}
            </button>
          </div>

          {/* Success/Error Message */}
          {shareResult && (
            <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
              shareResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
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