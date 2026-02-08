'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Trash2, QrCode } from 'lucide-react';
import GenerateKeyPairDialog from '../../components/dialogs/GenerateKeyPairDialog';
import DeleteKeysDialog from '../../components/dialogs/DeletesKeysDialog';
import ViewQRDialog from '../../components/dialogs/ViewQRDialog';
import { generateKeyPair, listKeyPairs, deleteKeyPair, type KeyPair as APIKeyPair } from '../../services/keyService';
import { useNotifications } from '../../contexts/NotificationContext';

interface KeyPair {
  id: string;
  doctor: string;
  doctorId: string;
  patient: string;
  patientId: string;
  created: string;
  expires: string;
  status: 'Active' | 'Inactive' | 'Revoked';
  rawCreated: string; // For sorting
  rawExpires: string | null;
}

const ITEMS_PER_PAGE = 5;

const AKeyMgtPage: React.FC = () => {
  const { showSuccessToast, showErrorToast } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewQRDialog, setShowViewQRDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState<KeyPair | null>(null);
  const [keyPairs, setKeyPairs] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Load key pairs from API
  useEffect(() => {
    loadKeyPairs();
  }, []);

  const loadKeyPairs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listKeyPairs();

      // Transform API response to match UI format
      const transformedKeys: KeyPair[] = response.key_pairs.map((kp: APIKeyPair) => ({
        id: kp.key_id,
        doctor: `Doctor ${kp.doctor_id}`,
        doctorId: kp.doctor_id,
        patient: `Patient ${kp.patient_id}`,
        patientId: kp.patient_id,
        created: formatDate(kp.created_at),
        expires: kp.expires_at ? new Date(kp.expires_at).toLocaleDateString() : 'Never',
        rawCreated: kp.created_at,
        rawExpires: kp.expires_at,
        status: kp.status
      }));

      setKeyPairs(transformedKeys);
    } catch (err) {
      console.error('Failed to load key pairs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load key pairs');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to normalize timestamp format for cross-browser compatibility
  const normalizeTimestamp = (isoDate: string): string => {
    // Fix timestamps with more than 3 decimal places in milliseconds
    // e.g., '2026-01-13T10:27:48.0968+00:00' -> '2026-01-13T10:27:48.096+00:00'
    return isoDate.replace(/(\.\d{3})\d+([\+\-Z])/g, '$1$2');
  };

  const formatDate = (isoDate: string): string => {
    const normalizedDate = normalizeTimestamp(isoDate);
    const date = new Date(normalizedDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  // Filter and sort key pairs
  const filteredKeyPairs = keyPairs
    .filter((keyPair) => {
      // Search filter
      const matchesSearch =
        keyPair.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        keyPair.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        keyPair.doctorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        keyPair.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        keyPair.patientId.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        keyPair.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'doctor') {
        return a.doctor.localeCompare(b.doctor);
      } else if (sortBy === 'patient') {
        return a.patient.localeCompare(b.patient);
      } else if (sortBy === 'created') {
        return new Date(b.rawCreated).getTime() - new Date(a.rawCreated).getTime();
      }
      return 0;
    });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredKeyPairs.length / ITEMS_PER_PAGE));
  const paginatedKeyPairs = filteredKeyPairs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, statusFilter]);

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

  // Statistics
  const totalKeys = keyPairs.length;
  // Count keys expiring in next 7 days
  const expiringSoon = keyPairs.filter(k => {
    if (!k.rawExpires || k.status !== 'Active') return false;
    const days = Math.ceil((new Date(k.rawExpires).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days < 7;
  }).length;
  const generateToday = keyPairs.filter(k => {
    const date = new Date(k.rawCreated);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }).length;

  const handleGenerateKey = async (doctorUserId: string, patientUserId: string): Promise<string | null> => {
    try {
      setDialogError(null);
      console.log('Generating key for:', { doctorUserId, patientUserId });

      // Call API to generate key pair
      const response = await generateKeyPair(doctorUserId, patientUserId);
      console.log('Key generated successfully:', response);

      // Reload key pairs to show the new one
      await loadKeyPairs();
      await showSuccessToast('Key Generated', 'Encryption key pair created successfully');
      
      setShowGenerateDialog(false);

      return response.qr_code;
    } catch (err) {
      console.error('Failed to generate key:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate key pair';
      
      setDialogError(errorMessage);

      return null;
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      setError(null);
      await deleteKeyPair(selectedKey.id);

      // Reload key pairs
      await loadKeyPairs();

      setShowDeleteDialog(false);
      setSelectedKey(null);

      await showSuccessToast('Key Deleted', 'Encryption key pair has been removed');

    } catch (err) {
      console.error('Failed to delete key:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete key pair';
      setError(errorMessage);

      // Close the dialog even on error so the page doesn't freeze
      setShowDeleteDialog(false);
      setSelectedKey(null);

      await showErrorToast('Delete Failed', errorMessage);
    }
  };

  const handleDeleteClick = (keyPair: KeyPair) => {
    setSelectedKey(keyPair);
    setShowDeleteDialog(true);
  };

  const handleViewQRClick = (keyPair: KeyPair) => {
    setSelectedKey(keyPair);
    setShowViewQRDialog(true);
  };

  const handleOpenGenerateDialog = () => {
    setDialogError(null);
    setShowGenerateDialog(true);
  };

  const handleCloseGenerateDialog = () => {
    setDialogError(null);
    setShowGenerateDialog(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <Sidebar userRole="admin" currentPage="key-management" />

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-4 lg:p-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">Key Management</h1>
              <p className="text-gray-600">Generate, Distribute, Rotate, And Revoke AES-GCM Encryption Keys Securely</p>
            </div>
            <button
              onClick={handleOpenGenerateDialog}
              className="w-full sm:w-auto px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition flex flex-col items-center justify-center"
            >
              Generate Key Pair
              <div className="text-xs font-normal">Doctor ↔ Patient</div>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Statistics Cards */}
          <div className="bg-gray-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Active Key Pairs</h3>
                <p className="text-3xl font-bold text-green-600">{keyPairs.filter(k => k.status === 'Active').length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Expiring Soon</h3>
                <p className="text-3xl font-bold text-orange-500">{expiringSoon}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Generated Today</h3>
                <p className="text-3xl font-bold text-purple-600">{generateToday}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Total Keys</h3>
                <p className="text-3xl font-bold text-blue-600">{totalKeys}</p>
              </div>
            </div>
          </div>

          {/* Keys Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-4">Encryption Key Pairs ({totalKeys})</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by Key ID, Doctor, Patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created">Sort: Created</option>
                  <option value="doctor">Sort: Doctor</option>
                  <option value="patient">Sort: Patient</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>

              {/* Results counter */}
              {searchQuery || statusFilter !== 'all' ? (
                <div className="mt-3 text-sm text-gray-600">
                  Showing {filteredKeyPairs.length} of {keyPairs.length} key pairs
                </div>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  Loading key pairs...
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Key ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Doctor</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Expires</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedKeyPairs.length > 0 ? (
                      paginatedKeyPairs.map((keyPair) => (
                        <tr
                          key={keyPair.id}
                          className={`hover:bg-gray-50 ${keyPair.status === 'Inactive' ? 'bg-red-50' : ''}`}
                        >
                          <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{keyPair.id}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{keyPair.doctor}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{keyPair.patient}</td>
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {keyPair.created.includes('Just now') || keyPair.created.includes('minutes ago') ? (
                              <span className="text-green-600 font-medium">{keyPair.created}</span>
                            ) : (
                              keyPair.created
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {(() => {
                              if (!keyPair.rawExpires) return 'Never';
                              const diff = new Date(keyPair.rawExpires).getTime() - new Date().getTime();
                              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                              if (diff < 0) {
                                return <span className="text-red-500 font-medium">Expired</span>;
                              } else if (days <= 7) {
                                return <span className="text-orange-600 font-medium">In {days} days</span>;
                              } else {
                                return <span>In {days} days</span>;
                              }
                            })()}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              keyPair.status === 'Active' ? 'bg-green-100 text-green-700' :
                              keyPair.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                keyPair.status === 'Active' ? 'bg-green-500' :
                                keyPair.status === 'Inactive' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`}></div>
                              {keyPair.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewQRClick(keyPair)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition text-blue-600"
                                title="View QR Code"
                              >
                                <QrCode className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(keyPair)}
                                className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                                title="Delete key pair"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No key pairs found matching your search criteria.
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
                Page {currentPage} of {totalPages} ({filteredKeyPairs.length} total key pairs)
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
      
      {/* Pass error to dialog */}
      <GenerateKeyPairDialog
        isOpen={showGenerateDialog}
        onClose={handleCloseGenerateDialog}
        onGenerate={handleGenerateKey}
        error={dialogError} 
      />

      {/* Delete Keys Dialog */}
      <DeleteKeysDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteKey}
        keyPair={selectedKey}
      />

      {/* View QR Dialog */}
      <ViewQRDialog
        isOpen={showViewQRDialog}
        onClose={() => setShowViewQRDialog(false)}
        keyId={selectedKey?.id || null}
        doctor={selectedKey?.doctor || ''}
        patient={selectedKey?.patient || ''}
      />
    </>
  );
};

export default AKeyMgtPage;