import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Inbox, Check } from 'lucide-react';
import { supportService } from '../../services/supportService';
import type { InAppNotification } from '../../services/supportService';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotif = async () => {
    try {
      const data = await supportService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    fetchNotif();
    // Poll unread notifications every 30 seconds
    const interval = setInterval(fetchNotif, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRead = async (id: string, url: string) => {
    try {
      await supportService.markNotificationRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setIsOpen(false);
      navigate(url);
    } catch (e) {
      console.error(e);
      // Fallback redirect anyway
      navigate(url);
    }
  };

  const markAllAsRead = async () => {
    try {
      for (const n of notifications) {
        await supportService.markNotificationRead(n.id);
      }
      setNotifications([]);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 dark:text-[#94a3b8] hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#283548] active:bg-slate-100 dark:active:bg-[#334155] rounded-xl transition-all duration-200 cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] border border-white animate-bounce">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-[#334155] rounded-2xl shadow-xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250">
          {/* Dropdown Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-[#283548] bg-slate-50/50 dark:bg-[#283548]/50">
            <span className="text-xs font-black text-slate-700 dark:text-[#e2e8f0] uppercase tracking-wider">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List Canvas */}
          <div className="max-h-[300px] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 dark:text-[#64748b]">
                <Inbox className="w-8 h-8 text-slate-300 dark:text-[#475569] stroke-1 mb-2" />
                <p className="text-xs font-bold">You are all caught up!</p>
                <p className="text-[10px] text-slate-400 dark:text-[#64748b] mt-0.5">No unread alerts or notifications.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-[#283548]">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleRead(notif.id, notif.linkUrl)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-[#283548]/80 active:bg-slate-100/50 dark:active:bg-[#334155]/50 transition-colors flex flex-col gap-1 cursor-pointer group"
                  >
                    <p className="text-xs text-slate-700 dark:text-[#cbd5e1] font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
