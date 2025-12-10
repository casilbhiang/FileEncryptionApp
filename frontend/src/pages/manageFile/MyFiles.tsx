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
  Eye, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { getMyFiles, deleteFile, type FileItem } from '../../services/Files';
import { useFileDecryption } from '../../hooks/useFileDecryption';

const MyFiles: React.FC = () => {
  const location = useLocation();
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';
  // Get userId from localStorage
  const [userId] = useState<string | null>(() => localStorage.getItem('user_id'));

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [filterType, setFilterType] = useState('all'); // Changed from sortDoctor
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const filesPerPage = 5;

  const { handleDecrypt, isDecrypting } = useFileDecryption();
  const [decryptingFileId, setDecryptingFileId] = useState<string | null>(null);

  // Fetch files from backend
  useEffect(() => {
    fetchFiles();
  }, [currentPage, sortBy, filterType, searchQuery]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      if (userId) {
        const response = await getMyFiles(
          userId, 
          searchQuery, 
          sortBy, 
          filterType, 
          currentPage, 
          filesPerPage
        );
        setFiles(response.files);
        setTotalFiles(response.total);
        
        // Calculate total pages from response
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
        } else {
          // Fallback calculation
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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchFiles();
  };

  const handleDownload = async (file: FileItem) => {
    try {
      setDecryptingFileId(file.id);

      if (userId) {
        // Use the hook to decrypt (handles notifications automatically)
        const blob = await handleDecrypt({ fileId: file.id, userId }, file.name);

        if (blob) {
          // Create download link if decryption succeeded
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Download process failed:', error);
    } finally {
      setDecryptingFileId(null);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (window.confirm(`Delete ${file.name}?`)) {
      try {
        if (userId) {
          await deleteFile(file.id, userId);
          // Refresh file list
          fetchFiles();
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete file');
      }
    }
  };

  // Keep all your existing helper functions (formatFileSize, formatDetailedTimestamp, etc.)
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
      
      // Format: "Jan 15, 2024 at 2:30 PM"
      const dateString = date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
      });
      
      const timeString = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        hour12: true 
      });
      
      return `${dateString} at ${timeString}`;
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
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
    setSortBy('uploaded_at');
    setCurrentPage(1);
    fetchFiles();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole={userRole} currentPage="my-files" />

      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">MY FILES</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
              <span>⚠️ {error}</span>
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
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border rounded-lg bg-white"
              disabled={loading}
            >
              <option value="uploaded_at">Newest first</option>
              <option value="name">A to Z</option>
              <option value="-name">Z to A</option>
              <option value="size">Smallest</option>
              <option value="-size">Largest</option>
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
                  {/* File Header */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{file.name}</h3>
                        {file.is_shared && (
                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                            Shared
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(file.size || file.file_size)} • by {file.shared_by || file.owner_name || 'You'}
                        {file.file_extension && ` • ${file.file_extension}`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={isDecrypting && decryptingFileId === file.id}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Download"
                      >
                        {isDecrypting && decryptingFileId === file.id ? (
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

                  {/* Timestamps Section */}
                  <div className="border-t pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {/* Uploaded */}
                      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <Upload className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Uploaded</div>
                          <div className="text-gray-700 font-mono text-xs">
                            {formatDetailedTimestamp(file.uploaded_at)}
                          </div>
                        </div>
                      </div>

                      {/* Shared */}
                      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <Share2 className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Shared At</div>
                          <div className="text-gray-700 font-mono text-xs">
                            {file.shared_at ? formatDetailedTimestamp(file.shared_at) : 'Not shared'}
                          </div>
                        </div>
                      </div>

                      {/* Last Accessed */}
                      <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <Eye className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-gray-500 font-medium mb-1">Last Accessed</div>
                          <div className="text-gray-700 font-mono text-xs">
                            {file.last_accessed_at ? formatDetailedTimestamp(file.last_accessed_at) : 'Never accessed'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
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
                    title="Previous page"
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
                    title="Next page"
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
                    onKeyDown={(e) => e.key === 'Enter' && goToPage(currentPage)}
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
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFiles;