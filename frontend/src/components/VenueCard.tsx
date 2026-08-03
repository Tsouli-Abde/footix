import { isTomorrowOrSooner } from '../lib/dates';
import type { FootixEvent, Outlook } from '../types';

/** Couleur de la carte selon la situation, pour que l'état se lise sans réfléchir. */
const TONE: Record<Outlook, string> = {
  vide: 'border-slate-200 bg-white',
  insuffisant: 'border-amber-200 bg-amber-50',
  incertain: 'border-amber-200 bg-amber-50',
  ok: 'border-green-200 bg-green-50',
  foule: 'border-green-200 bg-green-50',
};

const TEXT: Record<Outlook, { label: string; title: string; body: string }> = {
  vide: { label: 'text-slate-500', title: 'text-slate-700', body: 'text-slate-600' },
  insuffisant: { label: 'text-amber-700', title: 'text-amber-900', body: 'text-amber-800' },
  incertain: { label: 'text-amber-700', title: 'text-amber-900', body: 'text-amber-800' },
  ok: { label: 'text-green-700', title: 'text-green-900', body: 'text-green-800' },
  foule: { label: 'text-green-700', title: 'text-green-900', body: 'text-green-800' },
};

/**
 * Le lieu conseillé tant que le sondage est ouvert, puis le lieu retenu une fois
 * clôturé. La veille du match, on arrête de dire « pour l'instant ».
 */
export function VenueCard({ event }: { event: FootixEvent }) {
  const settled = event.status === 'cloture';

  if (settled) {
    const venue = event.chosenVenue;
    if (!venue) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          Sondage clôturé sans lieu retenu.
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <p className="text-sm font-medium text-green-700">On joue à</p>
        <p className="text-xl font-bold text-green-900 sm:text-2xl">{venue.label}</p>
        <p className="mt-1 text-sm text-green-800">{venue.note}</p>
      </div>
    );
  }

  const { venue, outlook, reason } = event.recommendation;
  const imminent = isTomorrowOrSooner(event.matchDate);
  const tone = TONE[outlook];
  const text = TEXT[outlook];

  // Sans lieu proposé, on affiche seulement l'état des réponses.
  if (!venue) {
    return (
      <div className={`rounded-xl border px-5 py-4 ${tone}`}>
        <p className={`text-sm font-medium ${text.label}`}>{imminent ? 'C’est demain' : 'Pas encore décidé'}</p>
        <p className={`mt-1 ${text.body}`}>{reason}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-5 py-4 ${tone}`}>
      <p className={`text-sm font-medium ${text.label}`}>{imminent ? 'Demain, on part sur' : 'Pour l’instant, ça part sur'}</p>
      <p className={`text-xl font-bold sm:text-2xl ${text.title}`}>{venue.label}</p>
      <p className={`mt-1 text-sm ${text.body}`}>{reason}</p>
    </div>
  );
}
