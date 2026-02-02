import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { storage } from '../utils/storage';

export type NotificationType = 'file_shared' | 'error' | 'info' | 'system' | 'file_received' | 'success' | 'warning';

export interface Notification {
  id: string;
  user_id: string; // This is UUID in the database
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_file_id: string | null;
  related_user_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  read_at: string | null;
  persistToSidebar?: boolean; // NEW: Controls if notification appears in sidebar
}

// NEW: Interface for creating notifications
export interface NotificationInput {
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, any>;
  showAsToast?: boolean;
  persistToSidebar?: boolean; // NEW: Controls if notification appears in sidebar (defaults to true)
  related_file_id?: string | null;
  related_user_id?: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  activeToasts: Notification[];
  isLoading: boolean;
  error: string | null;

  // Methods
  fetchNotifications: (showToasts?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  dismissToast: (id: string) => void;

  // NEW: Add notification method
  addNotification: (notification: NotificationInput) => Promise<void>;

  // Manual refresh (no auto-polling for now)
  refreshNotifications: () => Promise<void>;

  // NEW: Toast helper methods
  showSuccessToast: (title: string, message: string, metadata?: Record<string, any>) => Promise<void>;
  showErrorToast: (title: string, message: string, metadata?: Record<string, any>) => Promise<void>;
  showWarningToast: (title: string, message: string, metadata?: Record<string, any>) => Promise<void>;
  showInfoToast: (title: string, message: string, metadata?: Record<string, any>) => Promise<void>;
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
  console.log(' NotificationProvider rendering'); // Debug log

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track fetch state and prevent rapid calls
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const hasInitialFetchRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLLING_INTERVAL = 5000; // Poll every 5 seconds for real-time updates

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Get auth token - memoize properly
  const getAuthHeaders = useCallback(() => {
    const token = storage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }, []);

  // Get current user string ID (for API calls - backend expects string user_id)
  const getCurrentUserStringId = useCallback((): string => {
    return storage.getItem('user_id') || '';
  }, []);

  // Get current user UUID (for comparison with notification.user_id which is UUID)
  const getCurrentUserUuid = useCallback((): string => {
    return storage.getItem('user_uuid') || '';
  }, []);

  // Ensure we have the user's UUID cached; if not, resolve via backend and store it
  const ensureUserUuid = useCallback(async (): Promise<string> => {
    const existing = storage.getItem('user_uuid');
    if (existing) return existing;

    const userString = getCurrentUserStringId();
    if (!userString) return '';

    try {
      const resp = await fetch(`${API_URL}/api/notifications/resolve-user?user_id=${encodeURIComponent(userString)}`, {
        headers: getAuthHeaders(),
      });

      if (!resp.ok) return '';
      const data = await resp.json();
      if (data && data.success && data.found && data.user && data.user.id) {
        storage.setItem('user_uuid', data.user.id);
        console.log('Resolved and cached user_uuid:', data.user.id);
        return data.user.id;
      }
    } catch (err) {
      console.warn('Could not resolve user UUID:', err);
    }

    return '';
  }, [API_URL, getAuthHeaders, getCurrentUserStringId]);

  // Toast management - remove from both activeToasts and notifications if toast-only
  const dismissToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(toast => toast.id !== id));
    // Also remove from notifications if it's a toast-only notification (persistToSidebar: false)
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && notification.persistToSidebar === false) {
        return prev.filter(n => n.id !== id);
      }
      return prev;
    });
  }, []);

  // NEW: Add notification method
  const addNotification = useCallback(async (notificationInput: NotificationInput) => {
    const currentUserStringId = getCurrentUserStringId();

    if (!currentUserStringId) {
      console.error('Cannot add notification: No user ID found');
      return;
    }

    try {
      // Create a unique temporary ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a new notification object
      const newNotification: Notification = {
        id: tempId,
        user_id: notificationInput.user_id, // This should be UUID when saving to backend
        notification_type: notificationInput.type || 'info',
        title: notificationInput.title,
        message: notificationInput.message,
        is_read: false,
        related_file_id: notificationInput.related_file_id || null,
        related_user_id: notificationInput.related_user_id || null,
        metadata: notificationInput.metadata || null,
        created_at: new Date().toISOString(),
        read_at: null,
        persistToSidebar: notificationInput.persistToSidebar !== false, // Defaults to true
      };

      console.log(' Adding notification:', {
        title: notificationInput.title,
        forUser: notificationInput.user_id,
        showAsToast: notificationInput.showAsToast,
        persistToSidebar: notificationInput.persistToSidebar,
        type: notificationInput.type
      });

      // OPTIMISTIC UPDATE: Add to notifications list ONLY if it should persist to sidebar
      if (notificationInput.persistToSidebar !== false) {
        setNotifications(prev => [newNotification, ...prev]);
      }

      // Show as toast if requested
      if (notificationInput.showAsToast) {
        setActiveToasts(prev => {
          // Limit to 3 toasts max
          const updated = [newNotification, ...prev].slice(0, 3);

          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setActiveToasts(current => current.filter(toast => toast.id !== tempId));
            // Remove from notifications if it was a toast-only notification
            if (notificationInput.persistToSidebar === false) {
              setNotifications(current => current.filter(n => n.id !== tempId));
            }
          }, 5000);

          return updated;
        });
      }

      // Send to backend to persist ONLY if notification type is 'file_received'
      if (notificationInput.type === 'file_received') {
        try {
          const response = await fetch(`${API_URL}/api/notifications`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              user_id: notificationInput.user_id, // Backend expects string user_id
              notification_type: notificationInput.type || 'info',
              title: notificationInput.title,
              message: notificationInput.message,
              is_read: false,
              related_file_id: notificationInput.related_file_id || null,
              related_user_id: notificationInput.related_user_id || null,
              metadata: notificationInput.metadata || null,
            }),
          });

          if (response.ok) {
            const result = await response.json();

            // If backend returns the actual notification with real ID
            if (result.success && result.notification) {
              setNotifications(prev =>
                prev.map(notif =>
                  notif.id === tempId
                    ? {
                      ...result.notification,
                      // Ensure all required fields are present
                      id: result.notification.id || tempId,
                      user_id: result.notification.user_id || notificationInput.user_id,
                      notification_type: result.notification.notification_type || notificationInput.type || 'info',
                      title: result.notification.title || notificationInput.title,
                      message: result.notification.message || notificationInput.message,
                      is_read: result.notification.is_read || false,
                      related_file_id: result.notification.related_file_id || notificationInput.related_file_id || null,
                      related_user_id: result.notification.related_user_id || notificationInput.related_user_id || null,
                      metadata: result.notification.metadata || notificationInput.metadata || null,
                      created_at: result.notification.created_at || new Date().toISOString(),
                      read_at: result.notification.read_at || null,
                      persistToSidebar: notificationInput.persistToSidebar !== false, // Preserve the flag
                    }
                    : notif
                )
              );

              console.log(` Notification saved to backend: ${result.notification.id}`);
            }
          } else {
            console.warn(' Could not save notification to backend, but showing locally');
            // Keep the optimistic update even if backend fails
          }
        } catch (backendError) {
          console.warn(' Backend notification save failed, showing locally only:', backendError);
          // Keep the optimistic update
        }
      } else {
        console.log(` Notification type '${notificationInput.type}' not persisted to database (local toast only)`);
      }

    } catch (error) {
      console.error('Error in addNotification:', error);
    }
  }, [getCurrentUserStringId, getAuthHeaders, API_URL]);

  // FIXED: fetchNotifications with throttling and proper dependencies
  const fetchNotifications = useCallback(async (showToasts: boolean = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Already fetching, skipping...');
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;

    // Throttle: don't fetch more than once every 5 seconds
    if (timeSinceLastFetch < 5000 && hasInitialFetchRef.current) {
      console.log(`⏸️ Throttled: ${timeSinceLastFetch}ms since last fetch`);
      return;
    }

    const userStringId = getCurrentUserStringId();
    let userUuid = getCurrentUserUuid();
    // If UUID is not cached locally, try to resolve and cache it
    if (!userUuid) {
      userUuid = await ensureUserUuid();
    }

    if (!userStringId) {
      console.log('No user ID, skipping fetch');
      return
    }

    console.log(` [${new Date().toLocaleTimeString()}] Fetching notifications...`);
    console.log(` User string ID: ${userStringId}`);
    console.log(` User UUID: ${userUuid}`);

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/notifications?user_id=${userStringId}`, // Use string ID for API
        {
          headers: getAuthHeaders(),
        }
      );

      console.log(` Response status: ${response.status}`);

      if (!response.ok) {
        console.error(` Fetch failed: ${response.statusText}`);
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(` Got ${data.notifications?.length || 0} notifications`);

        const transformed: Notification[] = data.notifications.map((n: any) => ({
          id: n.id || '',
          user_id: n.user_id || '', // This is UUID from database
          notification_type: n.notification_type || 'info',
          title: n.title || '',
          message: n.message || '',
          is_read: n.is_read || false,
          related_file_id: n.related_file_id || null,
          related_user_id: n.related_user_id || null,
          metadata: n.metadata || null,
          created_at: n.created_at || new Date().toISOString(),
          read_at: n.read_at || null,
        }));

        console.log(' Sample notification user_id (UUID):', transformed[0]?.user_id);
        console.log(' Current user UUID for comparison:', userUuid);

        setNotifications(transformed);

        // FIXED: Only show toasts for new notifications if explicitly requested (not on initial load)
        if (showToasts) {
          setActiveToasts(prevToasts => {
            const newNotifications = transformed.filter((n: Notification) =>
              !n.is_read &&
              !prevToasts.some(toast => toast.id === n.id)
            );

            if (newNotifications.length > 0) {
              console.log(`Showing ${newNotifications.length} new toasts`);
              const updated = [...newNotifications, ...prevToasts].slice(0, 3);

              // Auto-dismiss toasts after 5 seconds
              newNotifications.forEach((notif: Notification) => {
                setTimeout(() => {
                  setActiveToasts(current => current.filter(toast => toast.id !== notif.id));
                }, 5000);
              });

              return updated;
            }

            return prevToasts;
          });
        }

        hasInitialFetchRef.current = true;
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [getCurrentUserStringId, getCurrentUserUuid, getAuthHeaders, API_URL, ensureUserUuid]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    const userStringId = getCurrentUserStringId();

    try {
      const response = await fetch(`${API_URL}/api/notifications/${id}/read?user_id=${userStringId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === id
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        dismissToast(id);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      dismissToast(id);
    }
  }, [getCurrentUserStringId, getAuthHeaders, API_URL, dismissToast]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const userStringId = getCurrentUserStringId();
    const userUuid = getCurrentUserUuid();

    try {
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userStringId }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.user_id === userUuid || notif.user_id === 'all'
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setActiveToasts([]);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      setNotifications(prev =>
        prev.map(notif =>
          notif.user_id === userUuid || notif.user_id === 'all'
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setActiveToasts([]);
    }
  }, [getCurrentUserStringId, getCurrentUserUuid, getAuthHeaders, API_URL]);

  // Delete notification
  const clearNotification = useCallback(async (id: string) => {
    const userStringId = getCurrentUserStringId();

    try {
      const response = await fetch(`${API_URL}/api/notifications/${id}?user_id=${userStringId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        dismissToast(id);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      dismissToast(id);
    }
  }, [getCurrentUserStringId, getAuthHeaders, API_URL, dismissToast]);

  // Delete all notifications
  const clearAllNotifications = useCallback(async () => {
    const userStringId = getCurrentUserStringId();
    const userUuid = getCurrentUserUuid();

    try {
      const response = await fetch(`${API_URL}/api/notifications/clear-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userStringId }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif =>
          notif.user_id !== userUuid && notif.user_id !== 'all'
        ));
        setActiveToasts([]);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      setNotifications(prev => prev.filter(notif =>
        notif.user_id !== userUuid && notif.user_id !== 'all'
      ));
      setActiveToasts([]);
    }
  }, [getCurrentUserStringId, getCurrentUserUuid, getAuthHeaders, API_URL]);

  // Manual refresh (same as fetch but public - shows toasts)
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(true); // Show toasts on manual refresh
  }, [fetchNotifications]);

  // Start auto-polling for real-time notifications
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log(' Polling already active');
      return; // Already polling
    }

    console.log(` Starting auto-polling every ${POLLING_INTERVAL}ms`);

    // Fetch immediately, then set up interval
    fetchNotifications(false); // Fetch without showing toasts initially

    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications(false); // Poll silently without showing toasts
    }, POLLING_INTERVAL);
  }, [fetchNotifications, POLLING_INTERVAL]);

  // Stop auto-polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log(' Stopping auto-polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // NEW: Helper to show success toast
  const showSuccessToast = useCallback(async (title: string, message: string, metadata?: Record<string, any>) => {
    const currentUserUuid = getCurrentUserUuid();
    if (!currentUserUuid) {
      console.warn('No user UUID for toast');
      return;
    }

    await addNotification({
      user_id: currentUserUuid,
      title,
      message,
      type: 'success',
      metadata,
      showAsToast: true,
      persistToSidebar: false // Toast-only notification
    });
  }, [addNotification, getCurrentUserUuid]);

  // NEW: Helper to show error toast
  const showErrorToast = useCallback(async (title: string, message: string, metadata?: Record<string, any>) => {
    const currentUserUuid = getCurrentUserUuid();
    if (!currentUserUuid) {
      console.warn('No user UUID for toast');
      return;
    }

    await addNotification({
      user_id: currentUserUuid,
      title,
      message,
      type: 'error',
      metadata,
      showAsToast: true,
      persistToSidebar: false // Toast-only notification
    });
  }, [addNotification, getCurrentUserUuid]);

  // NEW: Helper to show warning toast
  const showWarningToast = useCallback(async (title: string, message: string, metadata?: Record<string, any>) => {
    const currentUserUuid = getCurrentUserUuid();
    if (!currentUserUuid) {
      console.warn('No user UUID for toast');
      return;
    }

    await addNotification({
      user_id: currentUserUuid,
      title,
      message,
      type: 'warning',
      metadata,
      showAsToast: true,
      persistToSidebar: false // Toast-only notification
    });
  }, [addNotification, getCurrentUserUuid]);

  // NEW: Helper to show info toast
  const showInfoToast = useCallback(async (title: string, message: string, metadata?: Record<string, any>) => {
    const currentUserUuid = getCurrentUserUuid();
    if (!currentUserUuid) {
      console.warn('No user UUID for toast');
      return;
    }

    await addNotification({
      user_id: currentUserUuid,
      title,
      message,
      type: 'info',
      metadata,
      showAsToast: true,
      persistToSidebar: false // Toast-only notification
    });
  }, [addNotification, getCurrentUserUuid]);

  // Calculate unread count for current user - ONLY file_received notifications
  const unreadCount = notifications.filter(n => {
    const currentUserUuid = getCurrentUserUuid();
    return (n.user_id === currentUserUuid || n.user_id === 'all') && !n.is_read && n.notification_type === 'file_received';
  }).length;

  // Debug effect to log current state
  useEffect(() => {
    console.log(' Notification state updated:');
    console.log('  Total notifications:', notifications.length);
    console.log('  Current user UUID:', getCurrentUserUuid());
    console.log('  Current user string ID:', getCurrentUserStringId());
    console.log('  Unread count:', unreadCount);
    if (notifications.length > 0) {
      console.log('  First notification user_id (UUID):', notifications[0].user_id);
      console.log('  First notification matches current user?',
        notifications[0].user_id === getCurrentUserUuid() || notifications[0].user_id === 'all');
    }
  }, [notifications, unreadCount, getCurrentUserUuid, getCurrentUserStringId]);

  // FIXED: Initialize on mount with proper cleanup
  useEffect(() => {
    console.log(' NotificationProvider useEffect running');

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const performInitialFetch = async () => {
      const userStringId = getCurrentUserStringId();
      if (userStringId && isMounted && !hasInitialFetchRef.current) {
        console.log(' Performing initial fetch for user:', userStringId);
        // Ensure we have the user's UUID cached for client-side filtering
        await ensureUserUuid();
        await fetchNotifications();

        // Start auto-polling for real-time updates after initial fetch
        if (isMounted) {
          startPolling();
        }
      }
    };

    // Small delay to ensure component is fully mounted
    timeoutId = setTimeout(performInitialFetch, 100);

    return () => {
      console.log(' NotificationProvider cleanup');
      isMounted = false;
      clearTimeout(timeoutId);
      stopPolling(); // Stop polling when component unmounts
    };
  }, [getCurrentUserStringId, fetchNotifications, ensureUserUuid, startPolling, stopPolling]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    activeToasts,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    dismissToast,
    addNotification,
    refreshNotifications,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
