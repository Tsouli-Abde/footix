import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { normalizeName, rememberedName } from '../lib/names';
import type { Activity } from '../types';

const POLL_INTERVAL_MS = 6_000;
const SEEN_KEY = 'footix.activity.seen';

type Toast = { id: string; activity: Activity };

type NotificationsValue = {
  activities: Activity[];
  unreadCount: number;
  markAllSeen: () => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

/** Est-ce que cette activité est ma propre action ? (pour ne pas me notifier moi-même) */
function isMine(activity: Activity): boolean {
  if (activity.type !== 'reponse') return false;
  const me = normalizeName(rememberedName());
  return me.length > 0 && normalizeName(activity.body).startsWith(me);
}

/**
 * Alimente les notifications in-app à partir du fil d'activité du serveur.
 *
 * Un seul polling ici, partagé par la cloche (liste + compteur de non-lus) et
 * les toasts (nouveautés qui apparaissent pendant qu'on utilise l'app). Pas de
 * websocket : le volume ne le justifie pas et le polling reste simple à opérer.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenAt, setSeenAt] = useState<string>(() => localStorage.getItem(SEEN_KEY) ?? new Date().toISOString());

  // Repère de départ : tout ce qui existe déjà au premier chargement ne doit pas
  // surgir en toast. Seules les activités plus récentes que ce repère toastent.
  const baselineRef = useRef<string>(new Date(0).toISOString());
  const startedRef = useRef(false);
  const knownIds = useRef<Set<string>>(new Set());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const fresh = await api.listActivity();
        if (cancelled) return;
        setActivities(fresh);

        // Premier passage : on cale le repère sans rien toaster.
        if (!startedRef.current) {
          baselineRef.current = fresh[0]?.createdAt ?? new Date().toISOString();
          fresh.forEach((activity) => knownIds.current.add(activity.id));
          startedRef.current = true;
          return;
        }

        // Nouveautés depuis le repère, non déjà vues et pas de moi.
        const brandNew = fresh
          .filter((a) => a.createdAt > baselineRef.current && !knownIds.current.has(a.id) && !isMine(a))
          .reverse();

        for (const activity of brandNew) knownIds.current.add(activity.id);
        if (fresh[0]) baselineRef.current = fresh[0].createdAt;

        // Toast seulement si on regarde l'app : sinon la nouveauté est déjà dans
        // la cloche (badge de non-lus) et le push OS a pris le relais côté téléphone.
        if (brandNew.length > 0 && document.visibilityState === 'visible') {
          setToasts((current) => [...current, ...brandNew.map((activity) => ({ id: activity.id, activity }))]);
        }
      } catch {
        // Un fil momentanément indisponible ne casse rien, on retentera.
      }
    };

    void poll();
    // On interroge en continu pour garder la cloche à jour ; c'est l'affichage
    // du toast qui, lui, dépend de la visibilité de l'onglet (voir plus bas).
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Auto-dismiss des toasts après quelques secondes.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => setTimeout(() => dismissToast(toast.id), 6_000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  const unreadCount = activities.filter((a) => a.createdAt > seenAt && !isMine(a)).length;

  return (
    <NotificationsContext.Provider value={{ activities, unreadCount, markAllSeen, toasts, dismissToast }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications hors NotificationsProvider');
  return value;
}
