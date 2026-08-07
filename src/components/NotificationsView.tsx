import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import { Notification } from '../types';
import { cn } from '../utils/cn';

interface NotificationsViewProps {
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-brand-accent' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

export default function NotificationsView({ notifications, markNotificationRead, markAllNotificationsRead }: NotificationsViewProps) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="h-full flex flex-col bg-surface-bg overflow-hidden">
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <h2 className="text-text-primary font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" /> Notifications
          {unread > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">{unread} new</span>}
        </h2>
        {unread > 0 && (
          <button onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg border border-gray-200 transition-all">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {notifications.length === 0 && (
          <div className="py-20 text-center">
            <Bell className="w-10 h-10 text-text-primary/10 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No notifications</p>
          </div>
        )}
        {notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type];
          const Icon = cfg.icon;
          return (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:border-white/15',
                !n.read ? cn(cfg.bg, cfg.border) : 'bg-white/2 border-white/6'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                <Icon className={cn('w-4 h-4', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', !n.read ? 'text-text-primary/90' : 'text-gray-600')}>{n.title}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-brand-primary text-white flex-shrink-0" />}
                </div>
                <p className={cn('text-xs mt-0.5', !n.read ? 'text-gray-600' : 'text-text-primary/35')}>{n.message}</p>
                <p className="text-[10px] text-text-primary/25 mt-1">{n.createdAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {!n.read && (
                <button onClick={e => { e.stopPropagation(); markNotificationRead(n.id); }}
                  className="text-text-primary/20 hover:text-gray-600 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
