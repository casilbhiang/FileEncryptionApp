import React from 'react';
import { X, AlertCircle, CheckCircle, Info, XCircle, Clock } from 'lucide-react';
import { useNotifications, type Notification } from '../contexts/NotificationContext';

const NotificationToast: React.FC = () => {
  // Use the context instead of custom events
  const { activeToasts, dismissToast } = useNotifications();

  if (activeToasts.length === 0) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'decryption_failed':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'file_uploaded':
      case 'file_shared':
      case 'key_generated':
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'file_received':
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type: Notification['type']) => {
    switch (type) {
      case 'decryption_failed':
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'file_uploaded':
      case 'file_shared':
      case 'key_generated':
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'file_received':
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getBackgroundColor(toast.type)} border rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {toast.title}
                </h4>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(toast.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {toast.message}
              </p>
              
              {/* Show metadata if available */}
              {toast.metadata?.fileName && (
                <p className="text-xs text-gray-500">
                  📁 {toast.metadata.fileName}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;