import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, Upload, Share2, Users, UserPlus, Key, LogOut, Menu, X, Bell, FolderOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import simncryptLogo from '../../images/simncrypt.jpg';
import { useNotifications } from '../../contexts/NotificationContext';
import { storage } from '../../utils/storage';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarProps {
  userRole: 'doctor' | 'patient' | 'admin';
  currentPage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, currentPage = 'home' }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Use notification context
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  // Helper to format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Role-specific navigation items
  const navigationItems: Record<string, NavItem[]> = {
    doctor: [
      { id: 'home', label: 'Home', icon: Home, path: '/doctor/home' },
      { id: 'my-files', label: 'My Files', icon: FileText, path: '/doctor/my-files' },
      { id: 'upload', label: 'Upload Files', icon: Upload, path: '/doctor/upload' },
      { id: 'share', label: 'Share Files', icon: Share2, path: '/doctor/share' },
      { id: 'patients', label: 'View My Patients', icon: Users, path: '/doctor/patients' },
      { id: 'connect', label: 'Connect to Patient', icon: UserPlus, path: '/doctor/connect' },
    ],
    patient: [
      { id: 'home', label: 'Home', icon: Home, path: '/patient/home' },
      { id: 'my-files', label: 'My Files', icon: FileText, path: '/patient/my-files' },
      { id: 'upload', label: 'Upload Files', icon: Upload, path: '/patient/upload' },
      { id: 'share', label: 'Share Files', icon: Share2, path: '/patient/share' },
      { id: 'profile', label: 'My Profile', icon: Users, path: '/patient/profile' },
      { id: 'connect', label: 'Connect to Doctor', icon: UserPlus, path: '/patient/connect' },
    ],
    admin: [
      { id: 'home', label: 'Home', icon: Home, path: '/admin/home' },
      { id: 'user-management', label: 'User Management', icon: Users, path: '/admin/user-management' },
      { id: 'key-management', label: 'Key Management', icon: Key, path: '/admin/key-management' },
      { id: 'audit-logs', label: 'Audit Logs', icon: FileText, path: '/admin/audit-logs' },
      { id: 'key-logs', label: 'Key Logs', icon: Key, path: '/admin/key-logs' },
      { id: 'file-logs', label: 'File Logs', icon: FolderOpen, path: '/admin/file-logs' },
      //{ id: 'cloud-storage', label: 'Cloud Storage', icon: Cloud, path: '/admin/cloud-storage' },
    ],
  };

  // Role-specific badge labels
  const roleBadgeLabel: Record<string, string> = {
    doctor: 'DOCTOR',
    patient: 'Patient',
    admin: 'Admin',
  };

  const navItems = navigationItems[userRole];

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to log the event
      const API_URL = import.meta.env.VITE_API_URL;
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: storage.getItem('user_id'),
        }),
      });
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear all local storage data
      storage.clear();
      // Clear session storage as well
      sessionStorage.clear();
      // Navigate to login page
      navigate('/login');
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close menu after navigation on mobile
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed at top */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Backdrop/Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Notification Popup - Rendered outside sidebar */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowNotifications(false)}
          />
          {/* Notification Panel - Fixed position */}
          <div className="fixed top-20 left-4 lg:left-72 w-80 lg:w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-lg">Recent Upload</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${!notif.is_read ? 'bg-cyan-50' : 'bg-white'
                      }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          {notif.title}
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mb-1">{notif.message}</p>
                        <p className="text-xs text-gray-400">{formatTime(notif.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notif.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white shadow-lg flex flex-col
          transform transition-transform duration-300 ease-in-out
          h-screen overflow-hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={simncryptLogo} alt="SIM NCRYPT" className="w-10 h-10 rounded-lg" />
              <div>
                <h2 className="font-bold text-lg">SIM</h2>
                <p className="text-sm text-gray-600">NCRYPT</p>
              </div>
            </div>
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-lg relative transition"
            >
              <Bell className="w-6 h-6 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* User Badge */}
        <div className="px-6 py-4 flex-shrink-0">
          <div className="bg-purple-600 text-white px-4 py-2 rounded-lg text-center font-semibold">
            {roleBadgeLabel[userRole]}
          </div>
        </div>

        {/* Navigation - Only this section scrolls */}
        <nav className="flex-1 px-4 py-2 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium mb-2 transition ${isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-700'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout Button - Always visible at bottom */}
        <div className="p-4 border-t flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;