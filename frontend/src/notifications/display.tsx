import { BanIcon, CheckIcon, ClockIcon, MapPinIcon, MegaphoneIcon, TrophyIcon } from '../components/icons';
import type { ActivityType } from '../types';

const ICON: Record<ActivityType, typeof MegaphoneIcon> = {
  vote_ouvert: MegaphoneIcon,
  reponse: CheckIcon,
  rappel: ClockIcon,
  cloture: MapPinIcon,
  score: TrophyIcon,
  annulation: BanIcon,
};

const TINT: Record<ActivityType, string> = {
  vote_ouvert: 'bg-green-100 text-green-700',
  reponse: 'bg-sky-100 text-sky-700',
  rappel: 'bg-amber-100 text-amber-700',
  cloture: 'bg-green-100 text-green-700',
  score: 'bg-amber-100 text-amber-700',
  annulation: 'bg-slate-100 text-slate-500',
};

/** Pastille ronde avec l'icône du type d'activité. */
export function ActivityGlyph({ type }: { type: ActivityType }) {
  const Glyph = ICON[type];
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TINT[type]}`}>
      <Glyph className="h-4 w-4" />
    </span>
  );
}

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
