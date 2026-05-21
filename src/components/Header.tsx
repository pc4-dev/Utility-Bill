import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { useTheme } from '../ThemeContext';
import { cn } from '../utils';
import { Bell, User, LogOut, Check, Clock, Trash2, Menu, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  activeTab: string;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-white dark:bg-sidebar-bg border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-[60] transition-all shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Title */}
        <h2 className="text-lg font-bold text-slate-900 truncate max-w-[150px]">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('category:', '')}
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors relative",
                isNotificationsOpen && "bg-slate-100 dark:bg-slate-800 text-orange-600"
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-[#E8ECF0] dark:border-slate-800 overflow-hidden z-50 transition-colors"
                  style={{ 
                    maxHeight: 'calc(100vh - 120px)',
                    marginRight: window.innerWidth < 640 ? '-1rem' : '0' 
                  }}
                >
                  <div className="p-4 border-b border-[#E8ECF0] flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[#1A1A2E]">Notifications</h3>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold">
                        {notifications.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-primary hover:text-primary-dark uppercase tracking-wider"
                        >
                          Mark all as read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearNotifications}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-[#F3F4F6]">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id}
                            className={cn(
                              "p-4 hover:bg-[#F8F9FB] transition-colors cursor-pointer relative group",
                              !notification.read && "bg-blue-50/30"
                            )}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                !notification.read ? "bg-primary" : "bg-transparent"
                              )} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-[#1A1A2E] leading-tight mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-[12px] text-[#6B7280] leading-normal mb-2">
                                  {notification.description}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">
                                    {notification.relatedName}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF] font-medium">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Bell className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">No notifications yet</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-[#E8ECF0] text-center">
                      <button className="text-[11px] font-bold text-[#6B7280] hover:text-[#1A1A2E] uppercase tracking-widest">
                        View All Activity
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-[#E8ECF0]"></div>

        <div className="flex items-center gap-2 sm:gap-4 ml-2">
          <div className="flex flex-col items-end hidden sm:flex">
            <p className="text-[13px] font-bold text-slate-900 leading-none">{user?.name}</p>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1.5 opacity-80">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-500/20 border-2 border-white ring-1 ring-orange-100">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <button 
            onClick={logout}
            className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all active:scale-95 ml-2"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
