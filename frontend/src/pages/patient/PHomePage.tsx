'use client';

import React from 'react';
import Sidebar from '../../components/layout/Sidebar';

const PHomePage: React.FC = () => {
  const userName = localStorage.getItem('user_name') || 'Patient';

  // Sample recent uploads data
  const recentUploads = [
    { id: 1, name: 'Blood_Test_Result.Pdf', sharedBy: 'DR.Smith (Orthopaedics)', status: 'Shared', date: 'Last Edit May 3rd 2025' },
    { id: 2, name: 'Xray_image_8322.Png', sharedBy: 'you', status: 'Shared', date: 'Last Edit May 3rd 2025' },
    { id: 3, name: 'Referral_Letter_001.Pdf', sharedBy: 'DR.Tan (Orthopaedics)', status: 'Shared', date: 'Last Edit May 3rd 2025' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="patient" currentPage="home" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl lg:text-3xl font-bold">Welcome Back, {userName} 👋</h1>
            <div className="flex gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </button>
            </div>
          </div>
          <p className="text-gray-600">Your Data Is Securely Encrypted And Accessible Only To You.</p>
        </div>

        {/* Recent Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
            <h2 className="text-xl font-bold">Recent Upload</h2>
          </div>

          {/* File List */}
          <div className="space-y-4">
            {recentUploads.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{file.name}</h3>
                  <p className="text-sm text-gray-600">by {file.sharedBy}</p>
                </div>
                <div className="flex items-center gap-4">
                  {file.status && (
                    <span className="px-4 py-2 bg-cyan-400 text-white rounded-full text-sm font-medium">
                      {file.status}
                    </span>
                  )}
                  <span className="text-sm text-gray-500 min-w-[150px] text-right">{file.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PHomePage;