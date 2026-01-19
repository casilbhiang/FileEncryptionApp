import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useNotifications, type Notification } from '../contexts/NotificationContext';

const NotificationToast: React.FC = () => {
    const { notifications, clearNotification } = useNotifications();

    // Only show unread notifications as toasts
    const unreadNotifications = notifications.filter(n => !n.read).slice(0, 3);

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        const timers = unreadNotifications.map(notif => {
            return setTimeout(() => {
                clearNotification(notif.id);
            }, 5000);
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [unreadNotifications.length]);

    if (unreadNotifications.length === 0) return null;

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'decryption_failed':
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'file_uploaded':
            case 'file_shared':
            case 'key_generated':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'file_received':
                return <Info className="w-5 h-5 text-blue-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
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
                return 'bg-green-50 border-green-200';
            case 'file_received':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {unreadNotifications.map((notif) => (
                <div
                    key={notif.id}
                    className={`${getBackgroundColor(notif.type)} border rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300`}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                {notif.title}
                            </h4>
                            <p className="text-sm text-gray-700">
                                {notif.message}
                            </p>
                        </div>
                        <button
                            onClick={() => clearNotification(notif.id)}
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
