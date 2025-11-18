'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  result: 'OK' | 'FAILED';
}

const AAuditLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  // Sample audit logs data
  const [logs] = useState<AuditLog[]>([
    { id: '1', timestamp: '25/10/2025, 15:30', user: 'ADMIN HO (#A-001)', action: 'PAIRING_EXPIRE', target: 'Dr Min Han (#U-001) → Jan Doe (#U-034)', result: 'OK' },
    { id: '2', timestamp: '25/10/2025, 15:28', user: 'ADMIN HO (#A-001)', action: 'PAIRING_VERIFY_PIN', target: 'Dr Min Han (#U-001) → Jan Doe (#U-034)', result: 'OK' },
    { id: '3', timestamp: '25/10/2025, 15:22', user: 'ADMIN HO (#A-001)', action: 'PAIRING_SCAN', target: 'Dr Min Han (#U-001) → Jan Doe (#U-034)', result: 'OK' },
    { id: '4', timestamp: '25/10/2025, 15:20', user: 'ADMIN HO (#A-001)', action: 'PAIRING_CREATE', target: 'Dr Min Han (#U-001) → Jan Doe (#U-034)', result: 'OK' },
    { id: '5', timestamp: '24/10/2025, 15:30', user: 'Dr Basil Chiang Cheng Xun (#U-034)', action: 'FILE_UPLOAD', target: 'Blood_Test.pdf', result: 'OK' },
    { id: '6', timestamp: '23/10/2025, 15:28', user: 'Dr Basil Chiang Cheng Xun (#U-034)', action: 'FILE_DELETE', target: 'Blood_Test.pdf', result: 'FAILED' },
    { id: '7', timestamp: '23/10/2025, 23:25', user: 'ADMIN Wong (#A-002)', action: 'KEY_BACKUP', target: 'bckp_2025-10-23_T23:25', result: 'OK' },
    { id: '8', timestamp: '25/10/2025, 15:28', user: 'Dr Nathania Christabella (#U-035)', action: 'FILE_UPLOAD', target: 'Xray_Result.pdf', result: 'FAILED' },
    { id: '9', timestamp: '25/10/2025, 15:28', user: 'Mrs Chow Jia Yi (#U-012)', action: 'FILE_SHARE', target: 'blood_test_results.pdf → Dr Tan', result: 'OK' },
  ]);

  // Filter logs based on current filters
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUser = userFilter === 'all' || log.user.includes(userFilter);
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter.toUpperCase());
    const matchesResult = resultFilter === 'all' || log.result === resultFilter.toUpperCase();

    return matchesSearch && matchesUser && matchesAction && matchesResult;
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

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Table Header with Filters */}
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Search"
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
                <option value="ADMIN">Admin Users</option>
                <option value="Dr">Doctors</option>
                <option value="Mrs">Patients</option>
              </select>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="pairing">Pairing</option>
                <option value="file">File Operations</option>
                <option value="key">Key Management</option>
                <option value="user">User Management</option>
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
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
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
                      <td className="px-4 py-4 text-sm text-gray-900">{log.timestamp}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{log.user}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{log.action}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">{log.target}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                      No audit logs found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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