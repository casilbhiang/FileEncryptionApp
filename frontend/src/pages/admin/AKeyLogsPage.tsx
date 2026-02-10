'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { getAuditLogs, type AuditLog } from '../../services/auditService';
import { Key, RefreshCw } from 'lucide-react';

// Helper function to format timestamp to local time
const formatTimestampToLocal = (timestamp: string): string => {
  if (!timestamp) return 'N/A';
  try {
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
    return timestamp; 
  }
};

const LOGS_PER_PAGE = 9;

const AKeyLogsPage: React.FC = () => {
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Load key logs from API
  useEffect(() => {
    loadKeyLogs();
  }, [currentPage, actionFilter, resultFilter]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [actionFilter, resultFilter, dateFilter]);

  const loadKeyLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAuditLogs(
        undefined,
        actionFilter !== 'all' ? actionFilter : undefined,
        resultFilter !== 'all' ? resultFilter : undefined,
        undefined, // No search query
        currentPage,
        LOGS_PER_PAGE,
        false,
        true // keysOnly=true
      );
      
      setLogs(response.logs);
      setTotalPages(response.total_pages || 1);
      setTotalLogs(response.total || 0);
    } catch (err) {
      console.error('Failed to load key logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load key logs');
    } finally {
      setLoading(false);
    }
  };

  // Date filter applied client-side on the current page
  const filteredLogs = dateFilter
    ? logs.filter(log => {
        if (!log.timestamp) return false;
        try {
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          return logDate === dateFilter;
        } catch {
          return false;
        }
      })
    : logs;

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
      <Sidebar userRole="admin" currentPage="key-logs" />

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2 flex items-center gap-2">
              <Key className="w-8 h-8 text-purple-600" />
              Key Logs
            </h1>
            <p className="text-gray-600">Track Key Generation, Deletion, and Pairing Events</p>
          </div>
          <button
            onClick={loadKeyLogs}
            disabled={loading}
            className="p-2 bg-white rounded-full shadow hover:shadow-md transition self-start sm:self-auto disabled:opacity-50"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Key Logs Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Table Header with Filters */}
          <div className="p-4 border-b">
            <div className="flex flex-col gap-3">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Filter by date"
                />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Actions</option>
                  <option value="KEY_GENERATE">Key Generate</option>
                  <option value="KEY_DELETE">Key Delete</option>
                  <option value="KEY_PAIRING">Key Pairing</option>
                </select>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Results</option>
                  <option value="ok">Success (OK)</option>
                  <option value="failed">Failed</option>
                </select>
                {/* Clear filters button */}
                {(actionFilter !== 'all' || resultFilter !== 'all' || dateFilter) && (
                  <button
                    onClick={() => {
                      setActionFilter('all');
                      setResultFilter('all');
                      setDateFilter('');
                    }}
                    className="px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              
              {/* Results counter */}
              {dateFilter && (
                <div className="text-sm text-gray-600">
                  Showing {filteredLogs.length} of {logs.length} logs on this page
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Loading key logs...
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User / Admin</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Event Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Target (Dr ↔ Pt)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {formatTimestampToLocal(log.timestamp)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{log.user}</td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.action.includes('GENERATE') ? 'bg-blue-100 text-blue-700' :
                            log.action.includes('DELETE') ? 'bg-red-100 text-red-700' :
                            log.action.includes('PAIRING') ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 font-mono text-xs whitespace-nowrap">{log.target}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            log.result === 'OK'
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
                        No key logs found matching your criteria.
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
              Page {currentPage} of {totalPages} ({totalLogs} total logs)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
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
                    disabled={loading}
                    className={`px-3 py-1 text-sm border rounded-lg transition ${
                      currentPage === page
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'hover:bg-gray-100'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AKeyLogsPage;