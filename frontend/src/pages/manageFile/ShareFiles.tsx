'use client';

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ChevronDown } from 'lucide-react';

const ShareFiles: React.FC = () => {
  const location = useLocation();
  const userRole = location.pathname.includes('/doctor') ? 'doctor' : 'patient';

  const [selectedPatient, setSelectedPatient] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  // Sample files available for sharing
  const availableFiles = [
    { id: '1', name: 'Blood_Test_Result.Pdf', owner: 'DR.Smith (Orthopaedics)' },
    { id: '2', name: 'Blood_Test_Result.Pdf', owner: 'DR.Smith (Orthopaedics)' },
    { id: '3', name: 'Blood_Test_Result.Pdf', owner: 'DR.Smith (Orthopaedics)' },
    { id: '4', name: 'Blood_Test_Result.Pdf', owner: 'DR.Smith (Orthopaedics)' },
    { id: '5', name: 'Blood_Test_Result.Pdf', owner: 'DR.Smith (Orthopaedics)' },
  ];

  const handleFileToggle = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleShare = () => {
    console.log('Sharing files:', selectedFiles, 'to patient:', selectedPatient);
    // Handle share logic here
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole={userRole} currentPage="share" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Share Files</h1>
          <p className="text-gray-600">Your Data Is Securely Encrypted And Accessible Only To You.</p>
        </div>

        {/* Share Form */}
        <div className="bg-purple-50 rounded-lg p-6 lg:p-8 max-w-3xl">
          {/* Patient Name Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {userRole === 'doctor' ? 'Patient name' : 'Recipient name'}
            </label>
            <div className="relative">
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a {userRole === 'doctor' ? 'patient' : 'recipient'}</option>
                <option value="jenifer">Miss. Jenifer</option>
                <option value="harris">Mr. Harris</option>
                <option value="jack">Mr. Jack Ma</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Message (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a message (e.g. Please review my results)"
              rows={4}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Choose Files Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Choose Files
            </label>
            <div className="relative">
              <button
                onClick={() => setShowFileDropdown(!showFileDropdown)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <span className="text-gray-600">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Select files to share'}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {/* Files Dropdown List */}
              {showFileDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {availableFiles.map((file) => (
                    <label
                      key={file.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => handleFileToggle(file.id)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">by {file.owner}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedFiles.map((fileId) => {
                  const file = availableFiles.find(f => f.id === fileId);
                  return file ? (
                    <div
                      key={fileId}
                      className="bg-purple-200 rounded-lg px-4 py-3 flex items-start justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">by {file.owner}</p>
                      </div>
                      <button
                        onClick={() => handleFileToggle(fileId)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Share Button */}
          <div className="flex justify-center">
            <button
              onClick={handleShare}
              disabled={!selectedPatient || selectedFiles.length === 0}
              className="px-8 py-3 bg-white border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareFiles;