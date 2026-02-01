'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { getAuditLogs, type AuditLog } from '../../services/auditService';
import { Key, RefreshCw } from 'lucide-react';

const ITEMS_PER_PAGE = 6;

const AKeyLogsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Load audit logs from API
    useEffect(() => {
        loadKeyLogs();
    }, []);

    const loadKeyLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getAuditLogs(
                undefined, undefined, undefined,
                undefined, undefined, undefined,
                false, true // keysOnly=true: only KEY/PAIRING events
            );
            setLogs(response.logs);
        } catch (err) {
            console.error('Failed to load key logs:', err);
            setError(err instanceof Error ? err.message : 'Failed to load key logs');
        } finally {
            setLoading(false);
        }
    };

    // Filter logs based on search query
    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.target.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

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
            <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
                {/* Header */}
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold mb-2 flex items-center gap-2">
                            <Key className="w-8 h-8 text-purple-600" />
                            Key Logs
                        </h1>
                        <p className="text-gray-600">Track Key Generation, Deletion, and Pairing Events</p>
                    </div>
                    <button
                        onClick={loadKeyLogs}
                        className="p-2 bg-white rounded-full shadow hover:shadow-md transition"
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
                    {/* Table Header with Search */}
                    <div className="p-4 border-b">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Search key logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
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
                                    {paginatedLogs.length > 0 ? (
                                        paginatedLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 text-sm text-gray-900">{log.timestamp}</td>
                                                <td className="px-4 py-4 text-sm text-gray-900 font-medium">{log.user}</td>
                                                <td className="px-4 py-4 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${log.action.includes('GENERATE') ? 'bg-blue-100 text-blue-700' :
                                                            log.action.includes('DELETE') ? 'bg-red-100 text-red-700' :
                                                                log.action.includes('PAIRING') ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600 font-mono text-xs">{log.target}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.result === 'OK'
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
                                                No key logs found.
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
                            Page {currentPage} of {totalPages} ({filteredLogs.length} total events)
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
        </div>
    );
};

export default AKeyLogsPage;
