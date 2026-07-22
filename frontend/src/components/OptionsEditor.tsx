import { Button, inputClass } from './ui';

export type OptionDraft = { id?: string; label: string; capacity: number | null };

export const SUGGESTED_OPTIONS = ['Five', 'Parc', 'Stade', 'Match contre une autre boîte'];

type Props = {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
  /** Prévient qu'éditer une option existante touche à des votes déjà exprimés. */
  warnOnRemove?: boolean;
};

/**
 * Édition de la liste des lieux/formats proposés au vote.
 * Les options gardées conservent leur `id`, donc leurs votes ; celles retirées
 * de la liste sont supprimées côté API avec les votes qui les concernaient.
 */
export function OptionsEditor({ options, onChange, warnOnRemove }: Props) {
  const update = (index: number, patch: Partial<OptionDraft>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));

  const remove = (index: number) => onChange(options.filter((_, i) => i !== index));

  const add = (label = '') => onChange([...options, { label, capacity: null }]);

  const unusedSuggestions = SUGGESTED_OPTIONS.filter(
    (suggestion) => !options.some((option) => option.label.trim().toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <div key={option.id ?? index} className="flex gap-2">
          <input
            value={option.label}
            onChange={(e) => update(index, { label: e.target.value })}
            placeholder="Lieu ou format du match"
            className={inputClass}
          />
          <input
            type="number"
            min={1}
            max={99}
            value={option.capacity ?? ''}
            onChange={(e) => update(index, { capacity: e.target.value ? Number(e.target.value) : null })}
            placeholder="Places"
            title="Nombre de joueurs souhaité (indicatif)"
            className={`${inputClass} w-24 shrink-0`}
          />
          <Button
            variant="ghost"
            type="button"
            onClick={() => remove(index)}
            disabled={options.length === 1}
            title={warnOnRemove && option.id ? 'Retirer cette option supprimera les votes déjà exprimés dessus' : 'Retirer'}
            className="shrink-0 px-3"
          >
            ✕
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" type="button" onClick={() => add()} disabled={options.length >= 10}>
          + Ajouter une option
        </Button>
        {unusedSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => add(suggestion)}
            disabled={options.length >= 10}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-green-400 hover:text-green-700 disabled:opacity-50"
          >
            + {suggestion}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        La colonne « Places » est indicative : elle s’affiche dans le tableau mais ne bloque jamais un vote.
      </p>
    </div>
  );
}
