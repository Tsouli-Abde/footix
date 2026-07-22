import { AVAILABILITY_LABELS } from '../lib/availability';
import { AVAILABILITY_VALUES, type Availability, type FootixEvent } from '../types';

const COLUMN_STYLES: Record<Availability, { header: string; chip: string }> = {
  oui: { header: 'text-green-700', chip: 'bg-green-50 text-green-800 ring-green-200' },
  si_besoin: { header: 'text-amber-700', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  non: { header: 'text-slate-500', chip: 'bg-slate-50 text-slate-600 ring-slate-200' },
};

type Props = {
  event: FootixEvent;
  onRemove?: (participantId: string) => void;
};

/**
 * Qui vient, en trois colonnes.
 *
 * Une liste de noms se lit mieux qu'un tableau maintenant qu'il n'y a plus
 * qu'une question par personne, et ça passe tout seul sur mobile.
 */
export function AnswerList({ event, onRemove }: Props) {
  if (event.participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
        Personne n’a encore répondu. Lance-toi.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {AVAILABILITY_VALUES.map((value) => {
        const people = event.participants.filter((person) => person.availability === value);
        const styles = COLUMN_STYLES[value];

        return (
          <div key={value}>
            <h3 className={`text-sm font-semibold ${styles.header}`}>
              {AVAILABILITY_LABELS[value]} <span className="tabular-nums">({people.length})</span>
            </h3>

            <ul className="mt-2 flex flex-wrap gap-1.5">
              {people.length === 0 && <li className="text-sm text-slate-400">Personne</li>}

              {people.map((person) => (
                <li
                  key={person.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ring-1 ${styles.chip}`}
                >
                  {person.name}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(person.id)}
                      title={`Retirer ${person.name}`}
                      className="text-current opacity-40 hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
