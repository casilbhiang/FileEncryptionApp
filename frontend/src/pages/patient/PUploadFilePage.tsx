'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Upload, X, Folder, Check, Trash2 } from 'lucide-react';

interface UploadedFile {
  id: number;
  name: string;
  size: string;
  status: 'uploading' | 'completed';
  progress?: number;
}

const PUploadFilePage: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { id: 1, name: 'Blood_Test_Result.Pdf', size: '60 KB of 120 KB', status: 'uploading', progress: 50 },
    { id: 2, name: 'Blood_Test_Result.Pdf', size: '84 KB of 94 KB', status: 'completed' },
  ]);

  const handleFileSelect = () => {
    // File selection logic would go here
    console.log('Browse file clicked');
  };

  const handleRemoveFile = (id: number) => {
    setUploadedFiles(files => files.filter(file => file.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="patient" currentPage="upload" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">UPLOAD FILES</h1>
              <p className="text-gray-600">Your Data Is Securely Encrypted And Accessible Only To You.</p>
            </div>
            <button className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition">
              <Upload className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg p-8 mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose a file or drag & drop it here
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                JPEG, PNG, PDG, and MP4 formats, up to 50MB
              </p>
              <button
                onClick={handleFileSelect}
                className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Browse File
              </button>
            </div>
          </div>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Folder className="w-6 h-6 text-purple-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{file.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">{file.size}</p>
                    {file.status === 'uploading' && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">Uploading...</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                  title={file.status === 'uploading' ? 'Cancel upload' : 'Remove file'}
                >
                  {file.status === 'uploading' ? (
                    <X className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PUploadFilePage;