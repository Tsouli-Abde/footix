import type { FootixEvent } from '../types';

/**
 * Le lieu conseillé tant que le sondage est ouvert, puis le lieu retenu une
 * fois clôturé. C'est la réponse à la seule question qui compte : on joue où.
 */
export function VenueCard({ event }: { event: FootixEvent }) {
  const settled = event.status === 'cloture';
  const venue = settled ? event.chosenVenue : event.recommendation.venue;

  if (settled && !venue) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        Sondage clôturé sans lieu retenu.
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-medium text-slate-500">Pas encore décidé</p>
        <p className="mt-1 text-slate-700">{event.recommendation.reason}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
      <p className="text-sm font-medium text-green-700">{settled ? 'On joue à' : 'Pour l’instant, ça part sur'}</p>
      <p className="text-2xl font-bold text-green-900">{venue.label}</p>
      <p className="mt-1 text-sm text-green-800">{settled ? venue.note : event.recommendation.reason}</p>
      {!settled && <p className="mt-2 text-xs text-green-700/70">Ça peut encore bouger, rien n’est réservé.</p>}
    </div>
  );
}
