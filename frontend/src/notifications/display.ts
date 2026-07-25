import type { ActivityType } from '../types';

/** Une pastille emoji par type, pour repérer d'un coup d'œil de quoi il s'agit. */
export const ACTIVITY_ICON: Record<ActivityType, string> = {
  vote_ouvert: '📣',
  reponse: '✅',
  cloture: '📍',
  score: '⚽️',
  annulation: '❌',
};

const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

/** « à l'instant », « il y a 3 min », « il y a 2 h ». */
export function timeAgo(iso: string, now = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  if (diffSec > -45) return 'à l’instant';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin > -60) return relative.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (diffHour > -24) return relative.format(diffHour, 'hour');
  return relative.format(Math.round(diffHour / 24), 'day');
}
