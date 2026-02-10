import React from 'react';
import { X, CheckCircle, Info, XCircle, Clock } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationToast: React.FC = () => {
  const { activeToasts, dismissToast } = useNotifications();

  if (activeToasts.length === 0) return null;

  const getIcon = (notification_type: string) => {
    switch (notification_type) {
      case 'file_shared':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      case 'system':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-white border rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.notification_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {toast.title}
                </h4>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(toast.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {toast.message}
              </p>
              {toast.metadata?.file_name && (
                <p className="text-xs text-gray-500">
                  {toast.metadata.file_name}
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