import type { EventOption, VoteValue } from '../types';

export const VOTE_LABELS: Record<VoteValue, string> = {
  oui: 'Oui',
  si_besoin: 'Si besoin',
  non: 'Non',
};

/**
 * Les classes Tailwind sont écrites en entier : le compilateur scanne le source,
 * une classe construite dynamiquement (`bg-${color}-100`) ne serait pas générée.
 */
export const VOTE_CELL_STYLES: Record<VoteValue, string> = {
  oui: 'bg-green-100 text-green-800',
  si_besoin: 'bg-amber-100 text-amber-800',
  non: 'bg-rose-100 text-rose-700',
};

export const VOTE_BUTTON_STYLES: Record<VoteValue, { active: string; idle: string }> = {
  oui: {
    active: 'bg-green-600 text-white border-green-600',
    idle: 'bg-white text-slate-600 border-slate-300 hover:border-green-500 hover:text-green-700',
  },
  si_besoin: {
    active: 'bg-amber-500 text-white border-amber-500',
    idle: 'bg-white text-slate-600 border-slate-300 hover:border-amber-500 hover:text-amber-700',
  },
  non: {
    active: 'bg-rose-500 text-white border-rose-500',
    idle: 'bg-white text-slate-600 border-slate-300 hover:border-rose-400 hover:text-rose-700',
  },
};

/**
 * Score d'une option : un « oui » vaut un joueur sûr, un « si besoin » compte pour
 * moitié. Sert uniquement à mettre en avant l'option qui se détache — la décision
 * finale reste celle de l'organisateur.
 */
export const optionScore = (option: EventOption) => option.counts.oui + option.counts.si_besoin * 0.5;

/** Option la mieux placée, ou null si personne n'a encore voté / s'il y a égalité. */
export function leadingOption(options: EventOption[]): EventOption | null {
  const ranked = [...options].sort((a, b) => optionScore(b) - optionScore(a));
  const [first, second] = ranked;

  if (!first || optionScore(first) === 0) return null;
  if (second && optionScore(second) === optionScore(first)) return null;

  return first;
}
