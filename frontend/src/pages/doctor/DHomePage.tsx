'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';

const DHomePage: React.FC = () => {
  const [userName, setUserName] = useState<string>('DR MIN HAN');
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Your Flask backend URL - change this if your backend uses different port
  const API_BASE_URL = 'http://localhost:5000';

  // Fetch data when component loads
  useEffect(() => {
    fetchRecentUploads();
  }, []);

  // Function to fetch data from Flask backend
  const fetchRecentUploads = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get user ID from localStorage (set by your login system)
      const userId = localStorage.getItem('user_id');
      
      if (!userId) {
        setError('Please log in to view your files.');
        setLoading(false);
        return;
      }

      // Call your Flask backend - UPDATED ENDPOINT
      const response = await fetch(`${API_BASE_URL}/api/file-storage?mode=recent&limit=10`, {
        headers: {
          'X-User-ID': userId,
        },
      });

      // Check response status
      if (!response.ok) {
        throw new Error(`Backend server returned error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Success! Use real data from backend
        setRecentUploads(data.data || []);
        
        // Update user name if available from backend
        if (data.user_name) {
          setUserName(data.user_name);
        }
      } else {
        // Backend returned success: false
        setError(data.error || 'Could not load files');
      }
      
    } catch (error: any) {
      console.error('Error fetching recent uploads:', error);
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh button handler
  const handleRefresh = () => {
    fetchRecentUploads();
  };

  // Get only the first 3 most recent files
  const displayFiles = recentUploads.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="doctor" currentPage="home" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold">Welcome Back, {userName} 👋</h1>
              {/* Show user ID for debugging (optional) */}
              <p className="text-xs text-gray-400 mt-1">
                User ID: {localStorage.getItem('user_id')?.substring(0, 8)}...
              </p>
            </div>
            <div className="flex gap-3">
              {/* Refresh button */}
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Refresh data"
              >
                <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    '↻'
                  )}
                </div>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </button>
            </div>
          </div>
          <p className="text-gray-600">Your Data Is Securely Encrypted And Accessible Only To You.</p>
          
          {/* Error message - only shows if there's an actual error */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-600 rounded text-sm">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <span>{error}</span>
              </div>
              <button 
                onClick={handleRefresh} 
                className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Recent Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
              <h2 className="text-xl font-bold">Recent Activity</h2>
              {/* Show file count - updated to show limited count */}
              {!loading && (
                <span className="text-sm text-gray-500 ml-2">
                  ({displayFiles.length} of {recentUploads.length} files)
                </span>
              )}
            </div>
            
            {/* Refresh button */}
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
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

          {/* No user logged in */}
          {!loading && !localStorage.getItem('user_id') && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">Please log in to view your files</div>
            </div>
          )}

          {/* User logged in but no files */}
          {!loading && localStorage.getItem('user_id') && recentUploads.length === 0 && !error && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">No recent uploads found</div>
              <p className="text-gray-400 text-sm">
                Files you upload or are shared with you will appear here
              </p>
            </div>
          )}

          {/* File List - shows only 3 most recent files */}
          {!loading && displayFiles.length > 0 && (
            <div className="space-y-4">
              {displayFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{file.name}</h3>
                    <p className="text-sm text-gray-600">Uploaded by {file.sharedBy}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {file.status && (
                      <span className="px-4 py-2 bg-cyan-400 text-white rounded-full text-sm font-medium">
                        {file.status}
                      </span>
                    )}
                    <span className="text-sm text-gray-500 min-w-[150px] text-right">
                      {file.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show "View All" button if there are more than 3 files */}
          {!loading && recentUploads.length > 3 && (
            <div className="mt-6 text-center">
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                View All Files ({recentUploads.length})
              </button>
            </div>
          )}

          {/* Connection status (minimal, for debugging) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-gray-500">
              <div>Backend: {API_BASE_URL}</div>
              <div>Endpoint: /api/file-storage</div>
              <div>Status: {error ? 'Disconnected' : 'Connected'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DHomePage;