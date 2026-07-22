import { formatDateTime, formatDeadline } from '../lib/dates';
import type { FootixEvent } from '../types';
import { Badge } from './ui';

export function EventHeader({ event }: { event: FootixEvent }) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        {event.status === 'cloture' ? (
          <Badge className="bg-slate-200 text-slate-700">Vote clôturé</Badge>
        ) : event.votingOpen ? (
          <Badge className="bg-green-100 text-green-800">Vote ouvert</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800">Deadline dépassée</Badge>
        )}
        {event.type === 'recurrent' && <Badge className="bg-sky-100 text-sky-800">Hebdomadaire</Badge>}
      </div>

      <p className="mt-1 text-slate-600">{formatDateTime(event.matchDate)}</p>
      {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}

      <p className="mt-2 text-sm text-slate-500">
        Fin des votes : {formatDateTime(event.voteDeadline)}{' '}
        {event.votingOpen && <span className="text-slate-400">({formatDeadline(event.voteDeadline)})</span>}
      </p>
    </header>
  );
}

/** Bandeau de résultat affiché une fois le vote clôturé. */
export function WinnerBanner({ event }: { event: FootixEvent }) {
  if (event.status !== 'cloture') return null;

  const winner = event.options.find((option) => option.id === event.winningOptionId);
  if (!winner) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        Vote clôturé sans option retenue.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
      <p className="text-sm font-medium text-green-800">On joue à</p>
      <p className="text-xl font-bold text-green-900">{winner.label}</p>
      <p className="mt-1 text-sm text-green-700">
        {winner.counts.oui} oui · {winner.counts.si_besoin} si besoin
      </p>
    </div>
  );
}
