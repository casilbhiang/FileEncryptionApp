'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Loader2, RefreshCw, Eye, Download, User, FileText, Share2, Inbox, CheckCircle } from 'lucide-react';
import { getMyFiles, type FileItem, formatFileSize } from '../../services/Files';

const PHomePage: React.FC = () => {
  const userRole = 'patient'; 
  
  const [userName, setUserName] = useState<string>('Patient');
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    totalFiles: 0,
    sharedFiles: 0,
    receivedFiles: 0
  });

  // Fetch data when component loads
  useEffect(() => {
    fetchRecentFiles();
  }, []);

  // Function to fetch recent files using the same endpoint as MyFiles
  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get user ID from localStorage
      const userUuid = localStorage.getItem('user_uuid');
      
      if (!userUuid) {
        setError('Please log in to view your files.');
        setLoading(false);
        return;
      }

      // Try to get user name from localStorage
      const storedName = localStorage.getItem('user_name') || localStorage.getItem('email') || 'Patient';
      setUserName(storedName);

      // Call the same endpoint as MyFiles page with recent files filter
      // Using page=1, limit=10 for recent files
      const response = await getMyFiles(
        userUuid, 
        '', // No search query
        'uploaded_at', // Sort by newest first
        'desc',
        'all', // Show all files
        1, // Page 1
        10 // Limit to 10 most recent
      );
      
      setRecentFiles(response.files);
      updateStats(response.files);
      
    } catch (error: any) {
      console.error('Error fetching recent files:', error);
      setError(error.message || 'Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from files
  const updateStats = (files: FileItem[]) => {
    const total = files.length;
    const shared = files.filter(f => f.is_owned && f.shared_count && f.shared_count > 0).length;
    const received = files.filter(f => !f.is_owned).length;
    
    setStats({
      totalFiles: total,
      sharedFiles: shared,
      receivedFiles: received
    });
  };

  // Format date for display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      // Today
      return `Today at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffHours < 48) {
      // Yesterday
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      // Older dates
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  // Get only the first 3 most recent files for homepage
  const displayFiles = recentFiles.slice(0, 3);

  // Refresh button handler
  const handleRefresh = () => {
    fetchRecentFiles();
  };

  // Quick action functions
  const handleViewAllFiles = () => {
    window.location.href = '/patient/my-files';
  };

  const handleViewShared = () => {
    window.location.href = '/patient/my-files';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole={userRole} currentPage="home" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Welcome Back, {userName}</h1>
              <p className="text-gray-600 mt-2">Your health data is securely encrypted and protected.</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Refresh button */}
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                title="Refresh data"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                )}
              </button>
              
              {/* User profile placeholder */}
              <div className="p-2 bg-gray-100 rounded-lg border">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 p-4 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Files</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalFiles}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Shared by You</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.sharedFiles}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Received</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.receivedFiles}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <span className="text-red-600">{error}</span>
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

        {/* Recent Activity Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
                <p className="text-sm text-gray-500">Your latest file uploads and shares</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleViewAllFiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View All Files
              </button>
              <button 
                onClick={handleViewShared}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                View Shared
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

          {/* No user logged in */}
          {!loading && !localStorage.getItem('user_id') && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2 text-lg">Please log in to view your files</div>
              <p className="text-gray-400">
                Login to access your secure health records
              </p>
            </div>
          )}

          {/* User logged in but no files */}
          {!loading && localStorage.getItem('user_id') && recentFiles.length === 0 && !error && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2 text-lg">No files found</div>
              <p className="text-gray-400 mb-4">
                Upload your first file to get started
              </p>
              <button 
                onClick={handleViewAllFiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to My Files
              </button>
            </div>
          )}

          {/* File List - shows real data from backend */}
          {!loading && displayFiles.length > 0 && (
            <div className="space-y-4">
              {displayFiles.map((file) => (
                <div key={file.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-gray-800">{file.name}</h3>
                      {file.is_shared && (
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                          Shared
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span>{formatFileSize(file.size || 0)}</span>
                      <span>•</span>
                      <span>
                        {file.is_owned ? 'Owned by you' : `Shared by ${file.shared_by || 'Unknown'}`}
                      </span>
                      <span>•</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => window.location.href = `/patient/my-files`}
                      className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                    >
                      View
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show "View More" if there are more files */}
          {!loading && recentFiles.length > 3 && (
            <div className="mt-6 text-center">
              <button 
                onClick={handleViewAllFiles}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View all {recentFiles.length} files →
              </button>
            </div>
          )}
        </div>

        {/* Quick Tips Section */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>All files are automatically encrypted for your security</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>You can share files with your doctors from the My Files page</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Only you and authorized recipients can decrypt your files</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PHomePage;