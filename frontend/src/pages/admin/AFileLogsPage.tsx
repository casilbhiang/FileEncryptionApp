'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { RefreshCw } from 'lucide-react';

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

const AFileLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [logs, setLogs] = useState<FileLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Helper function to extract file extension
  const getFileExtension = (filename: string): string => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  };

  // Load file logs from API
  useEffect(() => {
    loadFileLogs();
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
            onClick={loadFileLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
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
                  {sortedLogs.length > 0 ? (
                    sortedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{log.timestamp}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={log.file_name}>
                          {log.file_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{log.owner_name}</td>
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

          {/* Results count */}
          <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
            Showing {sortedLogs.length} of {logs.length} file operation logs
          </div>
        </div>
      </div>
    </div>
  );
};

export default AFileLogsPage;
