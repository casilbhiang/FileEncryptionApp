'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Trash2 } from 'lucide-react';
import DeleteFileDialog from '../../components/dialogs/DeleteFileDialog';
import DeleteOutdatedFilesDialog from '../../components/dialogs/DeleteOutdatedFilesDialog';
import CloudStorageCredsDialog from '../../components/dialogs/CloudStorageCredsDialog';

interface EncryptedFile {
  id: string;
  date: string;
  userRole: 'Patient' | 'Doctor';
  owner: string;
  fileName: string;
  type: 'PDF' | 'JPG/PNG' | 'DOCX' | 'MP4';
  size: string;
}

const ACloudStoragePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteOutdatedDialog, setShowDeleteOutdatedDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<EncryptedFile | null>(null);

  // Sample encrypted files data
  const [files, setFiles] = useState<EncryptedFile[]>([
    { id: '1', date: '24/10/2025', userRole: 'Patient', owner: 'Jan Doe (#U-034)', fileName: 'Blood_Test_Result.pdf', type: 'PDF', size: '2.4 MB' },
    { id: '2', date: '23/10/2025', userRole: 'Patient', owner: 'Jan Doe (#U-034)', fileName: 'Skin_Allergy_Test.jpg', type: 'JPG/PNG', size: '2.4 MB' },
    { id: '3', date: '22/10/2025', userRole: 'Doctor', owner: 'Dr Min Han (#U-001)', fileName: 'MRI_Report_2025.pdf', type: 'PDF', size: '3.5 MB' },
    { id: '4', date: '21/10/2025', userRole: 'Patient', owner: 'Mrs Chow Jia Yi (#U-012)', fileName: 'Patient_Diagnosis_Report.docx', type: 'DOCX', size: '7.4 MB' },
    { id: '5', date: '21/10/2025', userRole: 'Doctor', owner: 'Dr Basil Chiang Cheng Xun (#U-034)', fileName: 'Heart_Scan_Video.mp4', type: 'MP4', size: '5.6 MB' },
    { id: '6', date: '21/10/2025', userRole: 'Patient', owner: 'Jan Doe (#U-034)', fileName: 'Blood_Test_Result.pdf', type: 'PDF', size: '2.4 MB' },
  ]);

  // Statistics
  const totalUsed = '78.5';
  const encryptedFiles = files.length;
  const outdatedFiles = 187;
  const outdatedSize = '12.5GB';

  const handleDeleteFile = () => {
    if (selectedFile) {
      setFiles(prev => prev.filter(file => file.id !== selectedFile.id));
    }
    setShowDeleteDialog(false);
    setSelectedFile(null);
  };

  const handleDeleteOutdated = () => {
    console.log('Deleting outdated files...');
    setShowDeleteOutdatedDialog(false);
  };

  const handleDeleteClick = (file: EncryptedFile) => {
    setSelectedFile(file);
    setShowDeleteDialog(true);
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || file.userRole.toLowerCase() === roleFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || file.type.toLowerCase().includes(typeFilter.toLowerCase());
    
    return matchesSearch && matchesRole && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="admin" currentPage="cloud-storage" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Cloud Storage Management</h1>
            <p className="text-gray-600">Monitor Encrypted Files, Verify Cloud Sync, And Manage Storage.</p>
          </div>
          <button
            onClick={() => setShowCredentialsDialog(true)}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition"
          >
            Cloud Credentials
          </button>
        </div>

        {/* Storage Overview */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Storage Overview</h3>
          <p className="text-blue-800 mb-4">Total used: {totalUsed}% | Encrypted Files: {encryptedFiles}</p>
          <div className="w-full bg-blue-200 rounded-full h-4 mb-2">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${totalUsed}%` }}
            ></div>
          </div>
          <div className="text-center text-blue-800 font-semibold">{totalUsed}%</div>
        </div>

        {/* Storage Cleanup Alert */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div>
              <h3 className="font-bold text-red-600">Storage Cleanup Recommended</h3>
              <p className="text-gray-800">
                {outdatedFiles} files older than 3 years detected ({outdatedSize}) - consider deleting them
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteOutdatedDialog(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Delete Files
          </button>
        </div>

        {/* Files Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-4">Encryption Files ({encryptedFiles})</h2>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All User Role</option>
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Type</option>
                <option value="pdf">PDF</option>
                <option value="jpg">JPG/PNG</option>
                <option value="docx">DOCX</option>
                <option value="mp4">MP4</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Owner</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">File Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">{file.date}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        file.userRole === 'Doctor' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {file.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{file.owner}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{file.fileName}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        file.type === 'PDF' ? 'bg-yellow-100 text-yellow-700' :
                        file.type === 'JPG/PNG' ? 'bg-green-100 text-green-700' :
                        file.type === 'DOCX' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {file.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{file.size}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDeleteClick(file)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                        title="Delete file"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete File Dialog */}
      <DeleteFileDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteFile}
        file={selectedFile}
      />

      {/* Delete Outdated Files Dialog */}
      <DeleteOutdatedFilesDialog
        isOpen={showDeleteOutdatedDialog}
        onClose={() => setShowDeleteOutdatedDialog(false)}
        onConfirm={handleDeleteOutdated}
        fileCount={outdatedFiles}
        totalSize={outdatedSize}
      />

      {/* Cloud Storage Credentials Dialog */}
      <CloudStorageCredsDialog
        isOpen={showCredentialsDialog}
        onClose={() => setShowCredentialsDialog(false)}
      />
    </div>
  );
};

export default ACloudStoragePage;