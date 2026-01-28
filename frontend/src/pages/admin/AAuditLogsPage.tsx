'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { getAuditLogs, type AuditLog } from '../../services/auditService';

// Helper function to format timestamp to local time
const formatTimestampToLocal = (timestamp: string): string => {
  if (!timestamp) return 'N/A';
  try {
    // Parse the UTC timestamp and convert to local time
    const date = new Date(timestamp + (timestamp.includes('Z') || timestamp.includes('+') ? '' : 'Z'));
    return date.toLocaleString('en-SG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return timestamp; // Return original if parsing fails
  }
};

const AAuditLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load audit logs from API
  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAuditLogs();
      // Filter OUT Key and Pairing events (they have their own tab)
      const auditOnlyLogs = response.logs.filter(log =>
        !log.action.toUpperCase().includes('KEY') &&
        !log.action.toUpperCase().includes('PAIRING')
      );
      setLogs(auditOnlyLogs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Get unique action types from logs
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  // Filter logs based on current filters
  const filteredLogs = logs.filter((log) => {
    // Search by user, action, target, details, or timestamp/date
    // Use optional chaining and nullish coalescing to prevent errors
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (log.user || '').toLowerCase().includes(searchLower) ||
      (log.action || '').toLowerCase().includes(searchLower) ||
      (log.target || '').toLowerCase().includes(searchLower) ||
      (log.details || '').toLowerCase().includes(searchLower) ||
      (log.timestamp || '').toLowerCase().includes(searchLower);

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResult = resultFilter === 'all' || log.result === resultFilter.toUpperCase();

    // Date filter - raw timestamp from API is in YYYY-MM-DD format
    // dateFilter from date picker is also YYYY-MM-DD, so compare directly
    const matchesDate = !dateFilter || (log.timestamp || '').includes(dateFilter);

    return matchesSearch && matchesAction && matchesResult && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="admin" currentPage="audit-logs" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Audit Logs</h1>
          <p className="text-gray-600">Track User Activity And System Events</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Table Header with Filters */}
          <div className="p-4 border-b">
            <div className="flex flex-col gap-3 mb-4">
              {/* Search and Date filter row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by user, action, target, details, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Filter by date"
                />
              </div>
              {/* Dropdown filters row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Results</option>
                  <option value="ok">Success (OK)</option>
                  <option value="failed">Failed</option>
                </select>
                {/* Clear filters button */}
                {(searchQuery || actionFilter !== 'all' || resultFilter !== 'all' || dateFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActionFilter('all');
                      setResultFilter('all');
                      setDateFilter('');
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
                Loading audit logs...
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Target</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{formatTimestampToLocal(log.timestamp)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{log.user}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{log.action}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">{log.target}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${log.result === 'OK'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No audit logs found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Results count */}
          <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} audit logs
          </div>
        </div>
      </div>
    </div>
  );
};

export default AAuditLogsPage;