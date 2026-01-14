'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { CheckCircle } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

const AHomePage: React.FC = () => {
  const userName = localStorage.getItem('user_name') || 'Admin';
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Fetch recent activities from audit logs
  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' -');
  };

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);

      // Fetch recent audit logs
      const response = await fetch(`${API_URL}/api/audit/logs?limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();

      // Transform audit logs into activities
      const activities: Activity[] = (data.logs || []).slice(0, 5).map((log: any) => {
        let title = '';
        let description = '';

        switch (log.action) {
          case 'user_created':
            title = 'New User Created';
            description = `for ${log.target || log.user_id}`;
            break;
          case 'login_success':
            title = 'User Login';
            description = `by ${log.target || log.user_id}`;
            break;
          case 'file_uploaded':
            title = 'File Uploaded';
            description = `by ${log.user_id}`;
            break;
          case 'file_shared':
            title = 'File Shared';
            description = log.details || `by ${log.user_id}`;
            break;
          case 'key_generated':
            title = 'Key Generated';
            description = log.details || `for ${log.target}`;
            break;
          default:
            title = log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            description = log.details || log.target || '';
        }

        return {
          id: log.id,
          title,
          description,
          timestamp: formatTimestamp(log.timestamp)
        };
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // Fallback to empty array if fetch fails
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

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
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading recent activities...
            </div>
          ) : recentActivities.length > 0 ? (
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
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activities found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AHomePage;