import { useState } from 'react';
import { useNotificationStore } from '@gravytos/state';

export function NotificationTray() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, removeNotification } = useNotificationStore();

  const typeColors = {
    success: 'text-emerald-400 bg-emerald-500/10',
    error: 'text-red-400 bg-red-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/50 hover:text-white/80 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-80 glass-card rounded-xl z-50 border border-white/10 max-h-96 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-light text-white/70">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-purple-400 hover:text-purple-300 font-light">
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-white/20 text-sm font-light">No notifications</div>
              ) : (
                notifications.slice(0, 20).map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                      !notif.read ? 'bg-purple-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${typeColors[notif.type]}`}>
                        {typeIcons[notif.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/80">{notif.title}</div>
                        <div className="text-[11px] text-white/40 font-light truncate">{notif.message}</div>
                        <div className="text-[10px] text-white/20 mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                        className="text-white/20 hover:text-white/50 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
