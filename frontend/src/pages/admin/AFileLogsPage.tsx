'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';

interface FileLog {
  id: string;
  timestamp: string;
  owner_id: string;
  shared_with: string;
  file_name: string;
  access_level: string;
  status: string;
  shared_at: string;
}

const AFileLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [accessLevelFilter, setAccessLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [logs, setLogs] = useState<FileLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Load file logs from API
  useEffect(() => {
    loadFileLogs();
  }, []);

  const loadFileLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch file_shares data
      const response = await fetch(`${API_URL}/api/files/shares/all`, {
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
      const transformedLogs = data.shares?.map((share: any) => ({
        id: share.id,
        timestamp: new Date(share.shared_at).toLocaleString(),
        owner_id: share.owner_name || share.owner_id || 'Unknown',
        shared_with: `${share.shared_with_name || share.shared_with} (${share.shared_with})` || 'Unknown',
        file_name: share.file_name || 'Unknown',
        access_level: share.access_level || 'Unknown',
        status: share.share_status || 'Unknown',
        shared_at: share.shared_at,
      })) || [];

      setLogs(transformedLogs);
    } catch (err) {
      console.error('Failed to load file logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file logs');
    } finally {
      setLoading(false);
    }
  };

  // Get unique access levels and statuses from logs
  const uniqueAccessLevels = Array.from(new Set(logs.map(log => log.access_level))).sort();
  const uniqueStatuses = Array.from(new Set(logs.map(log => log.status))).sort();

  // Filter logs based on current filters
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.owner_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.shared_with.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.file_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUser = userFilter === 'all' ||
      log.owner_id.includes(userFilter) ||
      log.shared_with.includes(userFilter);

    const matchesAccessLevel = accessLevelFilter === 'all' || log.access_level === accessLevelFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesUser && matchesAccessLevel && matchesStatus;
  });

  // Sort logs by timestamp (newest first)
  const sortedLogs = [...filteredLogs].sort((a, b) =>
    new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="admin" currentPage="file-logs" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">File Operations Log</h1>
          <p className="text-gray-600">Track File Sharing And Access Events</p>
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
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Search by owner, recipient, or file name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="ADM">Admins</option>
                <option value="DOC">Doctors</option>
                <option value="PAT">Patients</option>
              </select>
              <select
                value={accessLevelFilter}
                onChange={(e) => setAccessLevelFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Access Levels</option>
                {uniqueAccessLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shared With</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Access Level</th>
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
                        <td className="px-4 py-4 text-sm text-gray-900">{log.owner_id}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{log.shared_with}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            log.access_level === 'Read'
                              ? 'bg-blue-100 text-blue-700'
                              : log.access_level === 'Write'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.access_level}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            log.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : log.status === 'Revoked'
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
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
