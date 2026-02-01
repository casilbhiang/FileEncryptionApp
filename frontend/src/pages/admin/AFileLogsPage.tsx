'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { RefreshCw, AlertTriangle, X, Trash2 } from 'lucide-react';

interface FileLog {
  id: string;
  type: 'upload' | 'share';
  timestamp: string;
  raw_timestamp: string;
  file_name: string;
  owner_id: string;
  owner_name: string;
  action: string;
  status: string;
}

interface OutdatedFile {
  id: string;
  file_name: string;
  owner_id: string;
  owner_name: string;
  uploaded_at: string;
  file_size: number;
  file_extension: string;
}

const ITEMS_PER_PAGE = 6;

const AFileLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [logs, setLogs] = useState<FileLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Outdated files state
  const [outdatedFiles, setOutdatedFiles] = useState<OutdatedFile[]>([]);
  const [outdatedCount, setOutdatedCount] = useState(0);
  const [showOutdatedModal, setShowOutdatedModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const OUTDATED_DAYS = 90; // Files older than 90 days

  // Helper function to extract file extension
  const getFileExtension = (filename: string): string => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load file logs from API
  useEffect(() => {
    loadFileLogs();
    loadOutdatedFiles();
  }, []);

  const loadFileLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all file operations (uploads + shares)
      const response = await fetch(`${API_URL}/api/files/operations/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file logs');
      }

      const data = await response.json();

      // Transform the data to match our FileLog interface
      const transformedLogs: FileLog[] = data.operations?.map((op: any) => ({
        id: op.id,
        type: op.type,
        timestamp: new Date(op.timestamp).toLocaleString(),
        raw_timestamp: op.timestamp,
        file_name: op.file_name || 'Unknown',
        owner_id: op.owner_id || 'Unknown',
        owner_name: op.owner_name || op.owner_id || 'Unknown',
        action: op.action || 'Unknown',
        status: op.status || 'Unknown',
      })) || [];

      setLogs(transformedLogs);
    } catch (err) {
      console.error('Failed to load file logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file logs');
    } finally {
      setLoading(false);
    }
  };

  const loadOutdatedFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/files/outdated?days=${OUTDATED_DAYS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch outdated files');
        return;
      }

      const data = await response.json();
      setOutdatedFiles(data.outdated_files || []);
      setOutdatedCount(data.count || 0);
    } catch (err) {
      console.error('Failed to load outdated files:', err);
    }
  };

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === outdatedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(outdatedFiles.map(f => f.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${selectedFiles.size} file(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      setDeleteSuccess(null);

      const response = await fetch(`${API_URL}/api/files/outdated/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_ids: Array.from(selectedFiles) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete files');
      }

      const data = await response.json();

      setDeleteSuccess(`Successfully deleted ${data.deleted_count} file(s)`);
      setSelectedFiles(new Set());

      // Reload outdated files and logs
      await loadOutdatedFiles();
      await loadFileLogs();

      // Close modal if no more outdated files
      if (outdatedCount - data.deleted_count === 0) {
        setTimeout(() => {
          setShowOutdatedModal(false);
          setDeleteSuccess(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to delete files:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setDeleting(false);
    }
  };

  // Get unique values from logs for filters
  const uniqueFileTypes = Array.from(new Set(logs.map(log => getFileExtension(log.file_name)).filter(ext => ext !== ''))).sort();

  // Filter logs based on current filters
  const filteredLogs = logs.filter((log) => {
    // Search by owner, file name, action, or file extension
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (log.owner_name || '').toLowerCase().includes(searchLower) ||
      (log.file_name || '').toLowerCase().includes(searchLower) ||
      (log.action || '').toLowerCase().includes(searchLower) ||
      getFileExtension(log.file_name).includes(searchLower);

    // File type filter
    const matchesFileType = fileTypeFilter === 'all' ||
      getFileExtension(log.file_name) === fileTypeFilter;

    // Action type filter (upload or share)
    const matchesActionType = actionTypeFilter === 'all' || log.type === actionTypeFilter;

    return matchesSearch && matchesFileType && matchesActionType;
  });

  // Sort logs by timestamp (newest first)
  const sortedLogs = [...filteredLogs].sort((a, b) =>
    new Date(b.raw_timestamp).getTime() - new Date(a.raw_timestamp).getTime()
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = sortedLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fileTypeFilter, actionTypeFilter]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="admin" currentPage="file-logs" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">File Operations Log</h1>
            <p className="text-gray-600">Track File Uploads And Sharing Events</p>
          </div>
          <button
            onClick={() => { loadFileLogs(); loadOutdatedFiles(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Outdated Files Section - Always visible */}
        <div className={`mb-6 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border ${
          outdatedCount > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${outdatedCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            <div>
              <p className={`font-semibold ${outdatedCount > 0 ? 'text-amber-800' : 'text-gray-700'}`}>
                Outdated Files: {outdatedCount}
              </p>
              <p className={`text-sm ${outdatedCount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                {outdatedCount > 0
                  ? `${outdatedCount} file${outdatedCount !== 1 ? 's' : ''} older than ${OUTDATED_DAYS} days need to be removed to reduce storage and security risks.`
                  : `No files older than ${OUTDATED_DAYS} days found.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOutdatedModal(true)}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              outdatedCount > 0
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {outdatedCount > 0 ? 'View & Delete' : 'View Details'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* File Logs Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Table Header with Filters */}
          <div className="p-4 border-b">
            <div className="flex flex-col gap-3 mb-4">
              {/* Search row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by owner, file name, action, or file type (e.g., pdf, jpg)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Filter dropdowns row */}
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <select
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  <option value="upload">Uploads Only</option>
                  <option value="share">Shares Only</option>
                </select>
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All File Types</option>
                  {uniqueFileTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
                {/* Clear filters button */}
                {(searchQuery || fileTypeFilter !== 'all' || actionTypeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFileTypeFilter('all');
                      setActionTypeFilter('all');
                    }}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Loading file logs...
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">File Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Owner</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{log.timestamp}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={log.file_name}>
                          {log.file_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {log.owner_name} ({log.owner_id})
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <span className={`inline-flex items-center gap-1 ${
                            log.type === 'upload' ? 'text-blue-600' : 'text-purple-600'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            log.status === 'completed' || log.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : log.status === 'revoked'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No file operation logs found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({sortedLogs.length} total logs)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Previous
              </button>
              {getPageNumbers().map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm border rounded-lg transition ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Outdated Files Modal */}
      {showOutdatedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Outdated Files</h2>
                <p className="text-sm text-gray-600">
                  Files older than {OUTDATED_DAYS} days ({outdatedFiles.length} files)
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOutdatedModal(false);
                  setSelectedFiles(new Set());
                  setDeleteSuccess(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Success Message */}
            {deleteSuccess && (
              <div className="mx-4 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {deleteSuccess}
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {outdatedFiles.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedFiles.size === outdatedFiles.length && outdatedFiles.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">File Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Owner</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Uploaded</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {outdatedFiles.map((file) => (
                      <tr key={file.id} className={`hover:bg-gray-50 ${selectedFiles.has(file.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={() => handleSelectFile(file.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={file.file_name}>
                          {file.file_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {file.owner_name} ({file.owner_id})
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatFileSize(file.file_size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No outdated files found.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedFiles.size > 0 ? (
                  <span>{selectedFiles.size} file(s) selected</span>
                ) : (
                  <span>Select files to delete</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOutdatedModal(false);
                    setSelectedFiles(new Set());
                    setDeleteSuccess(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedFiles.size === 0 || deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : `Delete Selected (${selectedFiles.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AFileLogsPage;
