'use client';

import React from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { CheckCircle } from 'lucide-react';

const AHomePage: React.FC = () => {
  const userName = localStorage.getItem('user_id') || 'Admin Ho';

  // System health data
  const systemHealth = [
    { 
      id: 1, 
      icon: '🔐', 
      title: 'Encryption Status', 
      status: 'Operational',
      statusColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      id: 2, 
      icon: '📊', 
      title: 'Database', 
      status: 'Operational',
      statusColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      id: 3, 
      icon: '☁️', 
      title: 'Cloud Sync', 
      status: 'Synced',
      statusColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
  ];

  // Recent activity data
  const recentActivities = [
    { 
      id: 1, 
      title: 'Key Generated', 
      description: 'for DR.Smith #UserID05 <---> Mrs.Wil (Patient) #UserID80',
      timestamp: '21/10/2025 - 10.23AM'
    },
    { 
      id: 2, 
      title: 'New User Created', 
      description: 'for DR.Smith #UserID05',
      timestamp: '21/10/2025 - 10.20AM'
    },
    { 
      id: 3, 
      title: 'New User Created', 
      description: 'for Mrs.Wil (Patient) #UserID80',
      timestamp: '21/10/2025 - 10.20AM'
    },
    { 
      id: 4, 
      title: 'File Accessed', 
      description: 'by DR.Min Han #UserID12 - Blood_Test_Result.pdf',
      timestamp: '20/10/2025 - 08.43PM'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="admin" currentPage="home" />

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
          <p className="text-gray-600">Monitor System Health, Manage Users, And Secure Encryption Keys.</p>
        </div>

        {/* System Health Overview */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">System Health Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemHealth.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${item.statusColor}`} />
                  <span className={`text-sm font-medium ${item.statusColor}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Recent Activity</h2>

          {/* Activity List */}
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{activity.title}</h3>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  </div>
                  <span className="text-sm text-gray-500 ml-4 whitespace-nowrap">{activity.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AHomePage;