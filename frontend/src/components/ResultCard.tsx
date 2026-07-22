import type { FootixEvent } from '../types';

/**
 * Le résultat du match, affiché à tout le monde une fois qu'il est renseigné.
 * Rien tant que personne n'a saisi de score.
 */
export function ResultCard({ event }: { event: FootixEvent }) {
  if (!event.score && !event.resultNote) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-white">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Résultat</p>
      {event.score && <p className="mt-1 text-3xl font-bold tabular-nums">{event.score}</p>}
      {event.resultNote && <p className="mt-1 text-sm text-slate-300">{event.resultNote}</p>}
    </div>
  );
}
