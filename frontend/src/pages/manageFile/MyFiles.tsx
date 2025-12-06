'use client';

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { getMyFiles, deleteFile, type FileItem } from '../../services/Files';
import { useFileDecryption } from '../../hooks/useFileDecryption';

const MyFiles: React.FC = () => {
  const location = useLocation();
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';
  // TODO: Get actual user ID from auth context
  const userId = userRole === 'doctor' ? 'DR001' : 'PT001';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDoctor, setSortDoctor] = useState('all');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { handleDecrypt, isDecrypting } = useFileDecryption();
  const [decryptingFileId, setDecryptingFileId] = useState<string | null>(null);

  // Fetch files from backend
  useEffect(() => {
    fetchFiles();
  }, [sortBy, sortDoctor]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await getMyFiles(searchQuery, sortBy, sortDoctor);
      setFiles(response.files);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      alert('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      setDecryptingFileId(file.id);

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
    } catch (error) {
      console.error('Download process failed:', error);
    } finally {
      setDecryptingFileId(null);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        await deleteFile(file.id);
        // Refresh file list
        fetchFiles();
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete file');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole={userRole} currentPage="my-files" />

      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">MY FILES</h1>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchFiles}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Search
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort: date</option>
              <option value="name">Sort: name</option>
              <option value="size">Sort: size</option>
            </select>
            <select
              value={sortDoctor}
              onChange={(e) => setSortDoctor(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Files</option>
              <option value="shared">Shared by me</option>
              <option value="received">Received</option>
            </select>
          </div>

          {searchQuery || sortDoctor !== 'all' ? (
            <div className="mt-3 text-sm text-gray-600">
              Showing {files.length} files
            </div>
          ) : null}
        </div>

        {/* Files List */}
        {loading ? (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <p className="text-gray-500">Loading files...</p>
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{file.name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(file.size)} • by {file.shared_by}
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  {file.is_shared && (
                    <span className="px-4 py-1 bg-cyan-400 text-white rounded-full text-sm font-medium whitespace-nowrap">
                      Shared
                    </span>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={isDecrypting && decryptingFileId === file.id}
                    className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                    title="Download"
                  >
                    {isDecrypting && decryptingFileId === file.id ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="hidden lg:block ml-4 min-w-[150px] text-right">
                  <span className="text-sm text-gray-500">
                    {formatDate(file.uploaded_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <p className="text-gray-500">No files found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFiles;