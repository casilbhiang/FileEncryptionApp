'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Download, Trash2 } from 'lucide-react';

interface FileItem {
  id: number;
  name: string;
  sharedBy: string;
  status: string;
  date: string;
}

const DMyFiles: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDoctor, setSortDoctor] = useState('all');

  // Sample files data
  const [files] = useState<FileItem[]>([
    { id: 1, name: 'Blood_Test_Result.Pdf', sharedBy: 'mrTan (patient)', status: 'Shared', date: 'Last Edit May 3rd 2025' },
    { id: 2, name: 'Xray_image_8322.Png', sharedBy: 'you', status: '', date: 'Last Edit May 3rd 2025' },
    { id: 3, name: 'Referral_Letter_001.Pdf', sharedBy: 'mrTan (patient)', status: 'Shared', date: 'Last Edit May 3rd 2025' },
    { id: 4, name: 'Blood_Test_Result.Pdf', sharedBy: 'mrTan (patient)', status: 'Shared', date: 'Last Edit May 3rd 2025' },
    { id: 5, name: 'Xray_image_8322.Png', sharedBy: 'you', status: '', date: 'Last Edit May 3rd 2025' },
    { id: 6, name: 'Referral_Letter_001.Pdf', sharedBy: 'you', status: 'Shared', date: 'Last Edit May 3rd 2025' },
  ]);

  // Filter and sort files
  const filteredFiles = files
    .filter((file) => {
      // Search filter - searches file name and shared by
      const matchesSearch = 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.sharedBy.toLowerCase().includes(searchQuery.toLowerCase());

      // Sort by doctor/source filter
      const matchesSource = 
        sortDoctor === 'all' ||
        (sortDoctor === 'shared' && file.sharedBy === 'you') ||
        (sortDoctor === 'received' && file.sharedBy !== 'you');

      return matchesSearch && matchesSource;
    })
    .sort((a, b) => {
      // Sorting
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        // For now, all have same date, but this is where date sorting would go
        return a.date.localeCompare(b.date);
      } else if (sortBy === 'size') {
        // Size sorting would require file size data
        return 0;
      }
      return 0;
    });

  const handleDownload = (file: FileItem) => {
    console.log('Download file:', file);
    alert(`Downloading: ${file.name}`);
  };

  const handleDelete = (file: FileItem) => {
    console.log('Delete file:', file);
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      console.log('File deleted:', file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="doctor" currentPage="my-files" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">MY FILES</h1>
          
          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by file name or shared by..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort: date</option>
              <option value="name">Sort: name</option>
              <option value="size">Sort: size</option>
            </select>
            <select
              value={sortDoctor}
              onChange={(e) => setSortDoctor(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Files</option>
              <option value="shared">Shared by me</option>
              <option value="received">Received</option>
            </select>
          </div>

          {/* Results counter */}
          {searchQuery || sortDoctor !== 'all' ? (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredFiles.length} of {files.length} files
            </div>
          ) : null}
        </div>

        {/* Files List */}
        <div className="space-y-3">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{file.name}</h3>
                  <p className="text-sm text-gray-600">by {file.sharedBy}</p>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  {file.status && (
                    <span className="px-4 py-1 bg-cyan-400 text-white rounded-full text-sm font-medium whitespace-nowrap">
                      {file.status}
                    </span>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Download"
                  >
                    <Download className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                
                <div className="hidden lg:block ml-4 min-w-[150px] text-right">
                  <span className="text-sm text-gray-500">{file.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg p-8 shadow-sm text-center">
              <p className="text-gray-500">No files found matching your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DMyFiles;