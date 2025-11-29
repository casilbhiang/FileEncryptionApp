'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Trash2 } from 'lucide-react';
import GenerateKeyPairDialog from '../../components/dialogs/GenerateKeyPairDialog';
import DeleteKeysDialog from '../../components/dialogs/DeletesKeysDialog';

interface KeyPair {
  id: string;
  doctor: string;
  doctorId: string;
  patient: string;
  patientId: string;
  created: string;
  status: 'Active' | 'Inactive' | 'Revoked';
}

const AKeyMgtPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState<KeyPair | null>(null);

  // Sample key pairs data
  const [keyPairs, setKeyPairs] = useState<KeyPair[]>([
    { id: 'k-1234', doctor: 'Dr Min Han', doctorId: '#U-001', patient: 'Jan Doe', patientId: '#U-034', created: '2 days ago', status: 'Active' },
    { id: 'k-0233', doctor: 'Dr Ian Yan Yi', doctorId: '#U-023', patient: 'Jeslyn ho', patientId: '#U-024', created: '120 days ago', status: 'Active' },
    { id: 'k-0555', doctor: 'Dr Chan Jackie', doctorId: '#U-031', patient: 'Jan Doe', patientId: '#U-014', created: '65 days ago', status: 'Active' },
    { id: 'k-1222', doctor: 'Dr Min Han', doctorId: '#U-001', patient: 'Johon baru', patientId: '#U-034', created: 'Today, 10:23Am', status: 'Active' },
    { id: 'k-1111', doctor: 'Dr Min Han', doctorId: '#U-001', patient: 'Biever Flow', patientId: '#U-054', created: '380 days ago', status: 'Inactive' },
  ]);

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
        // Simple date sorting (you can improve this)
        return a.created.localeCompare(b.created);
      }
      return 0;
    });

  // Statistics - calculated from actual data
  const totalKeys = keyPairs.length;
  const expiringSoon = 14; // Mock data
  const generateToday = 32; // Mock data

  const handleGenerateKey = (doctorUserId: string, patientUserId: string) => {
    console.log('Generating key for:', { doctorUserId, patientUserId });
    
    // Generate new key
    const newKey: KeyPair = {
      id: `k-${Math.floor(Math.random() * 9999)}`,
      doctor: `Doctor ${doctorUserId}`,
      doctorId: doctorUserId,
      patient: `Patient ${patientUserId}`,
      patientId: patientUserId,
      created: 'Just now',
      status: 'Active'
    };
    
    setKeyPairs(prev => [newKey, ...prev]);
    
    // DON'T close the dialog here - let the dialog handle it
    // setShowGenerateDialog(false);
  };

  const handleDeleteKey = () => {
    if (selectedKey) {
      setKeyPairs(prev => prev.filter(key => key.id !== selectedKey.id));
    }
    setShowDeleteDialog(false);
    setSelectedKey(null);
  };

  const handleDeleteClick = (keyPair: KeyPair) => {
    setSelectedKey(keyPair);
    setShowDeleteDialog(true);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <Sidebar userRole="admin" currentPage="key-management" />

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">Key Management</h1>
              <p className="text-gray-600">Generate, Distribute, Rotate, And Revoke AES-GCM Encryption Keys Securely</p>
            </div>
            <button
              onClick={() => setShowGenerateDialog(true)}
              className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              Generate Key Pair
              <div className="text-xs font-normal">Doctor ↔ Patient</div>
            </button>
          </div>

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
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Generate Today</h3>
                <p className="text-3xl font-bold text-purple-600">{generateToday}</p>
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Key ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Doctor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredKeyPairs.length > 0 ? (
                    filteredKeyPairs.map((keyPair) => (
                      <tr 
                        key={keyPair.id} 
                        className={`hover:bg-gray-50 ${keyPair.status === 'Inactive' ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{keyPair.id}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{keyPair.doctor} ({keyPair.doctorId})</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{keyPair.patient} ({keyPair.patientId})</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {keyPair.created.includes('Today') || keyPair.created.includes('Just now') ? (
                            <span className="text-green-600 font-medium">{keyPair.created}</span>
                          ) : (
                            keyPair.created
                          )}
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
                          <button
                            onClick={() => handleDeleteClick(keyPair)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition"
                            title="Delete key pair"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No key pairs found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Key Pair Dialog */}
      <GenerateKeyPairDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onGenerate={handleGenerateKey}
      />

      {/* Delete Keys Dialog */}
      <DeleteKeysDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteKey}
        keyPair={selectedKey}
      />
    </>
  );
};

export default AKeyMgtPage;