import type { FootixEvent } from '../types';
import { VOTE_CELL_STYLES, VOTE_LABELS } from '../lib/votes';
import { Badge } from './ui';

type Props = {
  event: FootixEvent;
  /** Option mise en avant : la gagnante si clôturé, sinon celle qui se détache. */
  highlightOptionId?: string | null;
  /** Nom normalisé du visiteur, pour retrouver sa ligne d'un coup d'œil. */
  currentParticipantId?: string | null;
  onRemoveParticipant?: (participantId: string) => void;
};

/**
 * Tableau récapitulatif façon Doodle : une ligne par votant, une colonne par
 * option, cellules colorées vert / orange / rouge.
 *
 * Sur mobile le tableau défile horizontalement, la colonne des noms reste collée
 * à gauche pour ne jamais perdre le fil.
 */
export function VoteTable({ event, highlightOptionId, currentParticipantId, onRemoveParticipant }: Props) {
  if (event.participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
        Personne n’a encore voté. À toi de lancer la machine !
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-slate-500">
              {event.participants.length} votant{event.participants.length > 1 ? 's' : ''}
            </th>
            {event.options.map((option) => (
              <th
                key={option.id}
                className={`min-w-36 border-b-2 px-3 py-2 text-center align-bottom ${
                  option.id === highlightOptionId ? 'border-green-500 bg-green-50/60' : 'border-slate-200'
                }`}
              >
                <span className="block font-semibold text-slate-800">{option.label}</span>
                {option.capacity && (
                  <span className="block text-xs font-normal text-slate-400">{option.capacity} places</span>
                )}
                <span className="mt-1 flex items-center justify-center gap-1">
                  <Badge className="bg-green-100 text-green-800">{option.counts.oui}</Badge>
                  <Badge className="bg-amber-100 text-amber-800">{option.counts.si_besoin}</Badge>
                  <Badge className="bg-rose-100 text-rose-700">{option.counts.non}</Badge>
                </span>
              </th>
            ))}
            {onRemoveParticipant && <th className="w-10" />}
          </tr>
        </thead>

        <tbody>
          {event.participants.map((participant) => (
            <tr key={participant.id} className="group">
              <th
                scope="row"
                className={`sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-2 text-left font-medium ${
                  participant.id === currentParticipantId ? 'text-green-700' : 'text-slate-700'
                }`}
              >
                {participant.name}
                {participant.id === currentParticipantId && <span className="ml-1 text-xs font-normal">(toi)</span>}
              </th>

              {event.options.map((option) => {
                const value = participant.votes[option.id];
                return (
                  <td key={option.id} className="border-t border-slate-100 px-2 py-2 text-center">
                    {value ? (
                      <span className={`inline-block w-full rounded px-2 py-1 text-xs font-medium ${VOTE_CELL_STYLES[value]}`}>
                        {VOTE_LABELS[value]}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}

              {onRemoveParticipant && (
                <td className="border-t border-slate-100 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(participant.id)}
                    title={`Retirer ${participant.name}`}
                    className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
