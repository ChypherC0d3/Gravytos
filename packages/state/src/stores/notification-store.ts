import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  txHash?: string;
  explorerUrl?: string;
  autoDismiss?: number; // ms
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notif) => {
    const newNotif: Notification = {
      ...notif,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + 1,
    }));

    // Browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(notif.title, { body: notif.message, icon: '/favicon.svg' });
    }

    // Auto dismiss
    if (notif.autoDismiss) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== newNotif.id),
        }));
      }, notif.autoDismiss);
    }
  },

  markRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === id && !n.read) ? 1 : 0)),
  })),

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
    unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === id && !n.read) ? 1 : 0)),
  })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
