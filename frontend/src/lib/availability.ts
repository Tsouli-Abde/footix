import type { Availability } from '../types';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  oui: 'Oui',
  si_besoin: 'Si besoin',
  non: 'Non',
};

/** Ce que chaque réponse veut dire, affiché sous les boutons. */
export const AVAILABILITY_HINTS: Record<Availability, string> = {
  oui: 'Je viens',
  si_besoin: "S'il manque du monde",
  non: 'Pas dispo',
};

/**
 * Les classes Tailwind sont écrites en entier : le compilateur scanne le source,
 * une classe construite à la volée (`bg-${couleur}-100`) ne serait pas générée.
 */
export const AVAILABILITY_CHIP: Record<Availability, string> = {
  oui: 'bg-green-100 text-green-800',
  si_besoin: 'bg-amber-100 text-amber-800',
  non: 'bg-slate-100 text-slate-600',
};

export const AVAILABILITY_BUTTON: Record<Availability, { active: string; idle: string }> = {
  oui: {
    active: 'bg-green-600 text-white border-green-600',
    idle: 'bg-white text-slate-600 border-slate-300 hover:border-green-500 hover:text-green-700',
  },
  si_besoin: {
    active: 'bg-amber-500 text-white border-amber-500',
    idle: 'bg-white text-slate-600 border-slate-300 hover:border-amber-500 hover:text-amber-700',
  },
  non: {
    active: 'bg-slate-600 text-white border-slate-600',
    idle: 'bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:text-slate-800',
  },
};
