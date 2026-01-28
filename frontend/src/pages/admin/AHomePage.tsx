'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { CheckCircle, XCircle, Loader2, RefreshCw, Activity, Database, Cloud, Lock, Eye } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'user' | 'file' | 'key' | 'share' | 'system';
}

interface SystemHealthItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  status: 'operational' | 'checking' | 'error';
  statusText: string;
  statusColor: string;
  bgColor: string;
}

const AHomePage: React.FC = () => {
  const [userName, setUserName] = useState<string>('Admin');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealthItem[]>([
    {
      id: 'encryption',
      icon: <Lock className="w-6 h-6" />,
      title: 'Encryption Status',
      status: 'checking',
      statusText: 'Checking...',
      statusColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      id: 'database',
      icon: <Database className="w-6 h-6" />,
      title: 'Database',
      status: 'checking',
      statusText: 'Checking...',
      statusColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      id: 'cloud',
      icon: <Cloud className="w-6 h-6" />,
      title: 'Cloud Sync',
      status: 'checking',
      statusText: 'Checking...',
      statusColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
  ]);

  useEffect(() => {
    // Fetch user name with multiple fallback methods
    let displayName = 'Admin'; // default fallback
    
    // Method 1: Try getting from 'user' JSON object
    const userDataStr = localStorage.getItem('user');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData.name) {
          displayName = userData.name;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    // Method 2: Try direct keys as backup
    if (displayName === 'Admin') {
      const directName = localStorage.getItem('full_name') || 
                        localStorage.getItem('user_name') || 
                        localStorage.getItem('name');
      if (directName) {
        displayName = directName;
      }
    }
    
    // Method 3: Extract from email as last resort
    if (displayName === 'Admin') {
      const email = localStorage.getItem('user_email') || localStorage.getItem('email');
      if (email) {
        displayName = email.split('@')[0];
      }
    }
    
    console.log('Final display name:', displayName); // Debug log
    setUserName(displayName);

    checkSystemHealth();
    fetchRecentActivities();
  }, []);

  const checkSystemHealth = async () => {
    try {
      // Check database/API health
      const healthResponse = await fetch(`${API_URL}/health`);
      const dbHealthy = healthResponse.ok;

      // Check if we can reach Supabase (via any API endpoint)
      const statusResponse = await fetch(`${API_URL}/api/status`);
      const cloudHealthy = statusResponse.ok;

      setSystemHealth([
        {
          id: 'encryption',
          icon: <Lock className="w-6 h-6" />,
          title: 'Encryption Status',
          status: dbHealthy ? 'operational' : 'error',
          statusText: dbHealthy ? 'Operational' : 'Error',
          statusColor: dbHealthy ? 'text-green-600' : 'text-red-600',
          bgColor: dbHealthy ? 'bg-green-50' : 'bg-red-50'
        },
        {
          id: 'database',
          icon: <Database className="w-6 h-6" />,
          title: 'Database',
          status: dbHealthy ? 'operational' : 'error',
          statusText: dbHealthy ? 'Operational' : 'Disconnected',
          statusColor: dbHealthy ? 'text-green-600' : 'text-red-600',
          bgColor: dbHealthy ? 'bg-green-50' : 'bg-red-50'
        },
        {
          id: 'cloud',
          icon: <Cloud className="w-6 h-6" />,
          title: 'Cloud Sync',
          status: cloudHealthy ? 'operational' : 'error',
          statusText: cloudHealthy ? 'Synced' : 'Error',
          statusColor: cloudHealthy ? 'text-blue-600' : 'text-red-600',
          bgColor: cloudHealthy ? 'bg-blue-50' : 'bg-red-50'
        },
      ]);
    } catch (error) {
      console.error('Error checking system health:', error);
      setSystemHealth(prev => prev.map(item => ({
        ...item,
        status: 'error',
        statusText: 'Error',
        statusColor: 'text-red-600',
        bgColor: 'bg-red-50'
      })));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `Today at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffHours < 48) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles = {
      user: 'bg-purple-100 text-purple-800',
      file: 'bg-blue-100 text-blue-800',
      key: 'bg-green-100 text-green-800',
      share: 'bg-orange-100 text-orange-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return styles[category as keyof typeof styles] || styles.system;
  };

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      
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
      
      const activities: ActivityItem[] = (data.logs || []).slice(0, 5).map((log: any) => {
        let title = '';
        let description = '';
        let category: ActivityItem['category'] = 'system';

        switch (log.action) {
          case 'user_created':
            title = 'New User Created';
            description = `User account created for ${log.target || log.user_id}`;
            category = 'user';
            break;
          case 'login_success':
            title = 'User Login';
            description = `${log.user_id} logged in successfully`;
            category = 'user';
            break;
          case 'file_uploaded':
            title = 'File Uploaded';
            description = `New file uploaded by ${log.user_id}`;
            category = 'file';
            break;
          case 'file_shared':
            title = 'File Shared';
            description = log.details || `File shared by ${log.user_id}`;
            category = 'share';
            break;
          case 'key_generated':
            title = 'Encryption Key Generated';
            description = log.details || `Key generated for ${log.target}`;
            category = 'key';
            break;
          default:
            title = log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            description = log.details || log.target || `Action performed by ${log.user_id}`;
            category = 'system';
        }

        return {
          id: log.id,
          title,
          description,
          timestamp: formatTimestamp(log.timestamp),
          category
        };
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    checkSystemHealth();
    fetchRecentActivities();
  };

  const displayActivities = recentActivities.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar userRole="admin" currentPage="home" />
      
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Welcome Back, {userName}</h1>
              <p className="text-gray-600 mt-2">Monitor system health, manage users, and secure encryption keys.</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">System Health Overview</h2>
              <p className="text-sm text-gray-500">Real-time system status monitoring</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemHealth.map((item) => (
              <div key={item.id} className={`${item.bgColor} rounded-lg p-5 border shadow-sm transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={item.statusColor}>
                    {item.icon}
                  </div>
                  {item.status === 'checking' && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <div className="flex items-center gap-2">
                  {item.status === 'operational' && (
                    <CheckCircle className={`w-4 h-4 ${item.statusColor}`} />
                  )}
                  {item.status === 'error' && (
                    <XCircle className={`w-4 h-4 ${item.statusColor}`} />
                  )}
                  {item.status === 'checking' && (
                    <Loader2 className={`w-4 h-4 ${item.statusColor} animate-spin`} />
                  )}
                  <span className={`text-sm font-medium ${item.statusColor}`}>
                    {item.statusText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
                <p className="text-sm text-gray-500">Latest system events and actions</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => window.location.href = '/admin/audit-logs'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View All Logs
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* No activities */}
          {!loading && recentActivities.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2 text-lg">No recent activities found</div>
              <p className="text-gray-400">
                System activity will appear here as events occur
              </p>
            </div>
          )}

          {/* Activity List */}
          {!loading && displayActivities.length > 0 && (
            <div className="space-y-4">
              {displayActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-gray-800">{activity.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(activity.category)}`}>
                        {activity.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  </div>
                  
                  <div className="text-sm text-gray-500 whitespace-nowrap ml-4">
                    {activity.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show "View More" if there are more activities */}
          {!loading && recentActivities.length > 5 && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => window.location.href = '/admin/audit-logs'}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View all {recentActivities.length} activities →
              </button>
            </div>
          )}
        </div>

        {/* Quick Tips Section */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Admin Quick Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Monitor system health regularly to ensure all services are operational</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Review audit logs frequently to track system activities and user actions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>All encryption keys and sensitive data are automatically protected</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AHomePage;