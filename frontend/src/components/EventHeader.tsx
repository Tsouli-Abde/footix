import { eventTitle, formatCountdown, formatMatchSlot } from '../lib/dates';
import type { FootixEvent } from '../types';
import { Badge } from './ui';

export function EventHeader({ event }: { event: FootixEvent }) {
  // Sans titre saisi, la date fait déjà le gros titre : inutile de la répéter,
  // sauf si une heure a été fixée, auquel cas la ligne apporte cette précision.
  const showSlot = Boolean(event.title) || event.hasTime;

  return (
    <header>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">{eventTitle(event)}</h1>
        {event.status === 'cloture' ? (
          <Badge className="bg-slate-200 text-slate-700">Clôturé</Badge>
        ) : event.votingOpen ? (
          <Badge className="bg-green-100 text-green-800">Ouvert</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800">Match passé</Badge>
        )}
      </div>

      {showSlot && <p className="mt-1 text-base text-slate-700 sm:text-lg">{formatMatchSlot(event)}</p>}
      {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}

      <p className="mt-2 text-sm text-slate-500">
        {event.votingOpen ? `Réponses ouvertes, coup d’envoi ${formatCountdown(event.matchDate)}` : 'Réponses closes'}
      </p>

      {event.organizerName && (
        <p className="mt-1 text-sm text-slate-500">Organisé par {event.organizerName}</p>
      )}
    </header>
  );
}
