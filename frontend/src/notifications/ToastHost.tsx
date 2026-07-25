import { useNavigate } from 'react-router-dom';
import { ACTIVITY_ICON } from './display';
import { useNotifications } from './NotificationsContext';

/**
 * Les notifications in-app : de petites cartes qui apparaissent en bas à droite
 * quand quelque chose se passe pendant qu'on utilise l'app. Elles se cliquent
 * pour aller au sondage, et disparaissent toutes seules.
 */
export function ToastHost() {
  const { toasts, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map(({ id, activity }) => (
        <div
          key={id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ring-1 ring-black/5 transition-all"
        >
          <span className="text-xl leading-none">{ACTIVITY_ICON[activity.type]}</span>

          <button
            type="button"
            onClick={() => {
              if (activity.url) navigate(activity.url);
              dismissToast(id);
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-semibold text-slate-800">{activity.title}</p>
            <p className="text-sm text-slate-600">{activity.body}</p>
          </button>

          <button
            type="button"
            onClick={() => dismissToast(id)}
            aria-label="Fermer"
            className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
