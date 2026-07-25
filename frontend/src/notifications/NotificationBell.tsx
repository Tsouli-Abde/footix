import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACTIVITY_ICON, timeAgo } from './display';
import { useNotifications } from './NotificationsContext';

/**
 * La cloche dans l'en-tête : pastille de non-lus, et un panneau déroulant avec le
 * fil d'activité. Ouvrir le panneau marque tout comme lu.
 */
export function NotificationBell() {
  const { activities, unreadCount, markAllSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // Fermer au clic en dehors.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    if (!open) markAllSeen();
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Activité</div>

          {activities.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Rien pour l’instant.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (activity.url) navigate(activity.url);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="text-lg leading-none">{ACTIVITY_ICON[activity.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{activity.title}</span>
                      <span className="block text-sm text-slate-600">{activity.body}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(activity.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
