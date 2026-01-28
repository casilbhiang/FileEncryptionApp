'use client';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { 
  Download, 
  Trash2, 
  Loader2, 
  Upload, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Lock,
  Unlock,
  X
} from 'lucide-react';
import { getMyFiles, deleteFile, downloadFile, downloadAndDecryptFile, type FileItem } from '../../services/Files';
import { getStoredEncryptionKey } from '../../services/Encryption';
// REPLACE the custom hook with NotificationContext
import { useNotifications } from '../../contexts/NotificationContext';
const MyFiles: React.FC = () => {
  const location = useLocation();
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';
  
  // USE NotificationContext instead of multiple hooks
  const { showSuccessToast, showErrorToast, showWarningToast } = useNotifications();
  
  // Get userId from localStorage
  const [userId] = useState<string | null>(() => localStorage.getItem('user_id'));
  const [userUuid] = useState<string | null>(() => localStorage.getItem('user_uuid'));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState('all');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const filesPerPage = 5;
  
  // Download state
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  
  // Modal states
  const [downloadOptionsModal, setDownloadOptionsModal] = useState<{
    isOpen: boolean;
    file: FileItem | null;
  }>({ isOpen: false, file: null });
  
  // REMOVED: Local toast state and functions
  // REMOVED: Import of CheckCircle, AlertCircle, Info
  // REMOVED: showToast, showAlert, ToastNotification function
  
  const getShareType = (file: FileItem): 'shared-by-me' | 'shared-with-me' | 'owned' | 'unknown' => {
    if (!userId) return 'unknown';
    
    if (file.is_owned === true) {
      if (file.is_shared === true || (file.shared_count && file.shared_count > 0)) {
        return 'shared-by-me';
      }
      return 'owned';
    }
    
    if (file.shared_by && file.shared_by !== userId) {
      return 'shared-with-me';
    }
    
    if (file.is_shared === true && !file.is_owned) {
      return 'shared-with-me';
    }
    
    return 'unknown';
  };
  
  const getShareBadge = (file: FileItem) => {
    const shareType = getShareType(file);
    
    if (shareType === 'shared-by-me') {
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          Shared by me
        </span>
      );
    }
    
    if (shareType === 'shared-with-me') {
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
          Shared with me
        </span>
      );
    }
    
    if (shareType === 'owned') {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          Your file
        </span>
      );
    }
    
    if (file.is_shared) {
      return (
        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
          Shared
        </span>
      );
    }
    
    return null;
  };
  
const getFileSourceInfo = (file: FileItem) => {
  const shareType = getShareType(file);
  const userId = localStorage.getItem('user_id');
  
  // For files shared WITH me, show who shared it
  if (shareType === 'shared-with-me' && file.shared_by_name) {
    return `Shared by: ${file.shared_by_name}`;
  }
  
  // For files I OWN but shared with others, show who I shared with
  if (shareType === 'shared-by-me') {
    // Use type assertion to satisfy TypeScript
    const fileWithSharedNames = file as FileItem & { shared_with_names?: string[] };
    
    if (fileWithSharedNames.shared_with_names && fileWithSharedNames.shared_with_names.length > 0) {
      if (fileWithSharedNames.shared_with_names.length === 1) {
        return `Shared with: ${fileWithSharedNames.shared_with_names[0]}`;
      } else {
        return `Shared with: ${fileWithSharedNames.shared_with_names.join(', ')}`;
      }
    }
    
    // Fallback: show count if names aren't available
    const fileWithCount = file as FileItem & { shared_count?: number };
    if (fileWithCount.shared_count && fileWithCount.shared_count > 0) {
      return `Shared with ${fileWithCount.shared_count} ${fileWithCount.shared_count === 1 ? 'person' : 'people'}`;
    }
  }
  
  const fileWithOwnerName = file as FileItem & { owner_name?: string };
  if (fileWithOwnerName.owner_name && file.owner_id !== userId) {
    return `Owner: ${fileWithOwnerName.owner_name}`;
  }
  
  if (shareType === 'owned') {
    return 'Your file';
  }
  
  return '';
};

  useEffect(() => {
    fetchFiles();
  }, [currentPage, sortField, sortOrder, filterType, searchQuery]);
  
  const fetchFiles = async () => {
    try {
      setLoading(true);
      if (userUuid) {
        const response = await getMyFiles(
          userUuid, 
          searchQuery, 
          sortField,
          sortOrder, 
          filterType, 
          currentPage, 
          filesPerPage
        );
        setFiles(response.files);
        setTotalFiles(response.total);
        
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
        } else {
          setTotalPages(Math.ceil(response.total / filesPerPage));
        }
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSortChange = (value: string) => {
    let field: string;
    let order: 'asc' | 'desc';
    
    if (value.startsWith('-')) {
      field = value.substring(1);
      order = field === 'uploaded_at' ? 'asc' : 'desc';
    } else {
      field = value;
      order = field === 'uploaded_at' ? 'desc' : 'asc';
    }
    
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  };
  
  const getCurrentSortValue = () => {
    if (sortField === 'uploaded_at' && sortOrder === 'desc') return 'uploaded_at';
    if (sortField === 'uploaded_at' && sortOrder === 'asc') return '-uploaded_at';
    if (sortField === 'name' && sortOrder === 'asc') return 'name';
    if (sortField === 'name' && sortOrder === 'desc') return '-name';
    if (sortField === 'size' && sortOrder === 'asc') return 'size';
    if (sortField === 'size' && sortOrder === 'desc') return '-size';
    return 'uploaded_at';
  };
  
  const handleSearch = () => {
    setCurrentPage(1);
    fetchFiles();
  };
  
  const handleDownloadClick = (file: FileItem) => {
    setDownloadOptionsModal({ isOpen: true, file });
  };
  
  const handleDownloadEncrypted = async (file: FileItem) => {
    try {
      setDownloadingFileId(file.id);
      setDownloadOptionsModal({ isOpen: false, file: null });
      
      const encryptedBlob = await downloadFile(file.id);
      
      const url = window.URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.enc`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // UNIFIED NOTIFICATION: Shows toast AND adds to sidebar
      showSuccessToast(
        'File Downloaded',
        `${file.name}.enc downloaded successfully`,
        {
          fileName: `${file.name}.enc`,
          fileId: file.id,
          isShared: getShareType(file) === 'shared-with-me',
          action: 'download_encrypted'
        }
      );
      
    } catch (error) {
      console.error('Download failed:', error);
      
      showErrorToast(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to download file.',
        {
          fileName: `${file.name}.enc`,
          action: 'download_error'
        }
      );
    } finally {
      setDownloadingFileId(null);
    }
  };
  
  const handleDownloadDecrypted = async (file: FileItem) => {
    if (!userId || !userUuid) {
      showErrorToast(
        'Authentication Error',
        'User information not found. Please log in again.'
      );
      return;
    }
    
    try {
      setDownloadingFileId(file.id);
      setDownloadOptionsModal({ isOpen: false, file: null });
      
      const key = await getStoredEncryptionKey(userId);
      
      if (!key) {
        showWarningToast(
          'Encryption Key Not Found',
          'Your encryption key is not available. Please scan the QR code to restore access.',
          {
            fileName: file.name,
            action: 'key_missing'
          }
        );
        return;
      }
      
      const { blob, filename } = await downloadAndDecryptFile({
        fileId: file.id,
        userUuid: userUuid,
        decryptionKey: key
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccessToast(
        'File Downloaded',
        `${file.name} downloaded and decrypted successfully`,
        {
          fileName: file.name,
          fileId: file.id,
          isShared: getShareType(file) === 'shared-with-me',
          action: 'download_decrypted'
        }
      );
      
    } catch (error) {
      console.error('Download failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Decryption failed')) {
          showErrorToast(
            'Decryption Failed',
            'Failed to decrypt the file. Your encryption key may be incorrect or the file may be corrupted.',
            {
              fileName: file.name,
              action: 'decryption_error'
            }
          );
        } else if (error.message.includes('metadata not found')) {
          showErrorToast(
            'Encryption Error',
            'This file was not properly encrypted or the encryption information is missing.',
            {
              fileName: file.name,
              action: 'encryption_error'
            }
          );
        } else {
          showErrorToast(
            'Download Failed', 
            error.message,
            {
              fileName: file.name,
              action: 'download_error'
            }
          );
        }
      } else {
        showErrorToast(
          'Download Failed', 
          'An unexpected error occurred during download.',
          {
            fileName: file.name,
            action: 'download_error'
          }
        );
      }
    } finally {
      setDownloadingFileId(null);
    }
  };
  
  const handleDelete = async (file: FileItem) => {
    if (window.confirm(`Delete ${file.name}?`)) {
      try {
        if (userUuid) {
          await deleteFile(file.id, userUuid);
          fetchFiles();
          
          showSuccessToast(
            'File Deleted', 
            `${file.name} has been deleted`,
            {
              fileName: file.name,
              fileId: file.id,
              isShared: getShareType(file) === 'shared-by-me' || getShareType(file) === 'shared-with-me',
              sharedBy: file.shared_by_name || undefined,
              action: 'delete'
            }
          );
        }
      } catch (error) {
        console.error('Delete failed:', error);
        
        showErrorToast(
          'Delete Failed', 
          'Failed to delete file.',
          {
            fileName: file.name,
            action: 'delete_error'
          }
        );
      }
    }
  };
  
  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const formatDetailedTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      
      const dateString = date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Singapore'
      });
      
      const timeString = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Singapore',
        hour12: true 
      });
      
      return `${dateString} at ${timeString}`;
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;
      
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSortField('uploaded_at');
    setSortOrder('desc');
    setCurrentPage(1);
    fetchFiles();
  };
  
  // REMOVED: ToastNotification component
  
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole={userRole} currentPage="my-files" />
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* REMOVED: <ToastNotification /> - Now handled globally by NotificationToast component */}
        
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">My Files</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
              <button onClick={fetchFiles} className="ml-2 text-blue-600 underline">
                Try again
              </button>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <select
              value={getCurrentSortValue()}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
              disabled={loading}
            >
              <option value="uploaded_at">Newest</option>
              <option value="-uploaded_at">Oldest</option>
              <option value="name">A to Z</option>
              <option value="-name">Z to A</option>
              <option value="size">Smallest File Size</option>
              <option value="-size">Largest File Size</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border rounded-lg bg-white"
              disabled={loading}
            >
              <option value="all">All Files</option>
              <option value="shared">Shared by me</option>
              <option value="received">Received</option>
              <option value="my_uploads">My Uploads</option>
            </select>
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            Showing {((currentPage - 1) * filesPerPage) + 1} - {Math.min(currentPage * filesPerPage, totalFiles)} of {totalFiles} files
          </div>
        </div>
        
        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading files...</p>
          </div>
        ) : files.length > 0 ? (
          <div>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{file.name}</h3>
                        {getShareBadge(file)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(file.size || file.file_size)}
                        {file.file_extension && ` • ${file.file_extension}`}
                        {getFileSourceInfo(file) && ` • ${getFileSourceInfo(file)}`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadClick(file)}
                        disabled={downloadingFileId === file.id}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Download options"
                      >
                        {downloadingFileId === file.id ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <Upload className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Uploaded</div>
                          <div className="text-gray-700 font-mono text-xs">
                            {formatDetailedTimestamp(file.uploaded_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <Share2 className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Shared At</div>
                          <div className="text-gray-700 font-mono text-xs">
                            {file.shared_at ? formatDetailedTimestamp(file.shared_at) : 'Not shared'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      disabled={loading}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === page ? 'bg-blue-500 text-white' : 'border hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 border rounded text-center"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">No files found</p>
            {(searchQuery || filterType !== 'all') && (
              <button onClick={handleClearFilters} className="mt-2 text-blue-600 underline">
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Download Options Modal - Inline */}
      {downloadOptionsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setDownloadOptionsModal({ isOpen: false, file: null })}
          />
          
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Download Options</h3>
              <button
                onClick={() => setDownloadOptionsModal({ isOpen: false, file: null })}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Choose how you want to download: <strong>{downloadOptionsModal.file?.name}</strong>
              </p>
              
              <button
                onClick={() => downloadOptionsModal.file && handleDownloadDecrypted(downloadOptionsModal.file)}
                className="w-full flex items-center gap-3 p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200">
                  <Unlock className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">Download & Decrypt</div>
                  <div className="text-sm text-gray-600">Download and decrypt the file for viewing</div>
                </div>
              </button>
              
              <button
                onClick={() => downloadOptionsModal.file && handleDownloadEncrypted(downloadOptionsModal.file)}
                className="w-full flex items-center gap-3 p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">Download Encrypted</div>
                  <div className="text-sm text-gray-600">Download the encrypted file (.enc)</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MyFiles;