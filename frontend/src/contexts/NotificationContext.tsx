import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type NotificationType = 
  | 'file_received' | 'file_uploaded' | 'file_shared' 
  | 'key_generated' | 'user_created' | 'system' 
  | 'decryption_failed' | 'error' | 'info' | 'warning' | 'success';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
  isToast?: boolean; // Mark if this should show as toast
}

interface NotificationContextType {
  // Permanent notifications (sidebar)
  notifications: Notification[];
  unreadCount: number;
  
  // For toast display
  activeToasts: Notification[]; // Notifications that should show as toasts
  
  // Core methods
  addNotification: (
    notification: Omit<Notification, 'id' | 'read' | 'created_at'> & {
      showAsToast?: boolean; // Whether to also show as toast
    }
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Toast actions
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  
  // Convenience methods
  showToast: (
    title: string, 
    message: string, 
    type: NotificationType,
    metadata?: Record<string, any>
  ) => void;
  showSuccessToast: (title: string, message: string, metadata?: Record<string, any>) => void;
  showErrorToast: (title: string, message: string, metadata?: Record<string, any>) => void;
  showWarningToast: (title: string, message: string, metadata?: Record<string, any>) => void;
  showInfoToast: (title: string, message: string, metadata?: Record<string, any>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const MAX_NOTIFICATIONS = 5;
  const MAX_TOASTS = 3;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Helper to get user ID
  const getUserId = (): string => {
    return localStorage.getItem('user_id') || localStorage.getItem('user_uuid') || 'unknown';
  };

  // Add notification with FIFO behavior
  const addNotification = (
    notificationData: Omit<Notification, 'id' | 'read' | 'created_at'> & {
      showAsToast?: boolean;
    }
  ) => {
    const { showAsToast = true, ...notification } = notificationData;
    
    // 🔥 GET CURRENT USER ID FOR COMPARISON
    const currentUserId = getUserId();
    
    const newNotif: Notification = {
      ...notification,
      // 🔥 CRITICAL: Use provided user_id OR fallback to current user
      user_id: notification.user_id || currentUserId,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      read: false,
      created_at: new Date().toISOString(),
      isToast: showAsToast
    };

    console.log('📢 Adding notification:', {
      forUser: newNotif.user_id,
      currentUser: currentUserId,
      title: newNotif.title,
      willShowToast: newNotif.user_id === currentUserId && showAsToast,
      showAsToast: showAsToast
    });

    // Add to permanent notifications (FIFO)
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      if (updated.length > MAX_NOTIFICATIONS) {
        return updated.slice(0, MAX_NOTIFICATIONS);
      }
      return updated;
    });

    // 🔥 CRITICAL: Only add to active toasts if:
    // 1. showAsToast is true
    // 2. The notification is for the CURRENT user (not someone else)
    if (showAsToast && newNotif.user_id === currentUserId) {
      setActiveToasts(prev => {
        const updated = [newNotif, ...prev];
        if (updated.length > MAX_TOASTS) {
          return updated.slice(0, MAX_TOASTS);
        }
        return updated;
      });

      // Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        dismissToast(newNotif.id);
      }, 5000);
    }
  };

  // Toast actions
  const dismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const dismissAllToasts = () => {
    setActiveToasts([]);
  };

  // Convenience methods
  const showToast = (
    title: string,
    message: string,
    type: NotificationType = 'info',
    metadata?: Record<string, any>
  ) => {
    addNotification({
      user_id: getUserId(), // Auto-fill with current user
      title,
      message,
      type,
      metadata,
      showAsToast: true
    });
  };

  const showSuccessToast = (title: string, message: string, metadata?: Record<string, any>) => 
    showToast(title, message, 'success', metadata);

  const showErrorToast = (title: string, message: string, metadata?: Record<string, any>) => 
    showToast(title, message, 'error', metadata);

  const showWarningToast = (title: string, message: string, metadata?: Record<string, any>) => 
    showToast(title, message, 'warning', metadata);

  const showInfoToast = (title: string, message: string, metadata?: Record<string, any>) => 
    showToast(title, message, 'info', metadata);

  // Mark as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    dismissToast(id); // Also remove from toasts if present
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setActiveToasts([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToasts,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        dismissToast,
        dismissAllToasts,
        showToast,
        showSuccessToast,
        showErrorToast,
        showWarningToast,
        showInfoToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};