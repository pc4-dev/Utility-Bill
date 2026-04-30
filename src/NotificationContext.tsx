import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppNotification, NotificationType } from './types';

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (title: string, description: string, relatedName: string, type: NotificationType) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'ubwms_notifications';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        setNotifications([]);
      }
    }
  }, []);

  const saveNotifications = (updated: AppNotification[]) => {
    setNotifications(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addNotification = (title: string, description: string, relatedName: string, type: NotificationType) => {
    const newNotification: AppNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      description,
      relatedName,
      timestamp: new Date().toISOString(),
      type,
      read: false,
    };
    const updated = [newNotification, ...notifications];
    saveNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };
  
  const clearNotifications = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setNotifications(JSON.parse(stored));
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead, clearNotifications, unreadCount, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
