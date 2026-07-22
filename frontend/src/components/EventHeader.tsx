import { eventTitle, formatCountdown, formatDeadlineDate, formatMatchDate } from '../lib/dates';
import type { FootixEvent } from '../types';
import { Badge } from './ui';

export function EventHeader({ event }: { event: FootixEvent }) {
  // Sans titre saisi, la date fait déjà le gros titre : inutile de la répéter en dessous.
  const hasTitle = Boolean(event.title);

  return (
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{eventTitle(event)}</h1>
        {event.status === 'cloture' ? (
          <Badge className="bg-slate-200 text-slate-700">Clôturé</Badge>
        ) : event.votingOpen ? (
          <Badge className="bg-green-100 text-green-800">Ouvert</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800">Deadline passée</Badge>
        )}
      </div>

      {hasTitle && <p className="mt-1 text-lg text-slate-700">{formatMatchDate(event.matchDate)}</p>}
      {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}

      <p className="mt-2 text-sm text-slate-500">
        Réponses jusqu’à {formatDeadlineDate(event.voteDeadline).toLowerCase()}
        {event.votingOpen && <span className="text-slate-400"> ({formatCountdown(event.voteDeadline)})</span>}
      </p>
    </header>
  );
}
