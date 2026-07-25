import { useNavigate } from 'react-router-dom';
import { CloseIcon } from '../components/icons';
import { ActivityGlyph } from './display';
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
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80">
      {toasts.map(({ id, activity }) => (
        <div
          key={id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ring-1 ring-black/5"
        >
          <ActivityGlyph type={activity.type} />

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
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
