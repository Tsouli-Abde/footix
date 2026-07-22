import { randomBytes } from 'node:crypto';

/** Les trois réponses possibles, comme sur Doodle. */
export const AVAILABILITY_VALUES = ['oui', 'si_besoin', 'non'] as const;
export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const EVENT_STATUSES = ['ouvert', 'cloture'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ['ponctuel', 'recurrent'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Les lieux sont en dur : on joue toujours aux deux mêmes endroits, et le but
 * de l'app est justement d'éviter d'avoir à en rediscuter chaque semaine.
 *
 * "externe" n'est jamais recommandé et n'apparaît pas côté votants. Il existe
 * seulement pour que l'organisateur puisse le choisir à la clôture, dans le cas
 * rare d'un match contre une autre boîte.
 */
export const VENUES = {
  five: {
    id: 'five',
    label: 'Le Five',
    note: 'Terrain synthétique, format 5 ou 6 contre 6.',
    organizerOnly: false,
  },
  sceaux: {
    id: 'sceaux',
    label: 'Parc de Sceaux',
    note: 'Grand terrain en herbe, quand on est assez nombreux.',
    organizerOnly: false,
  },
  externe: {
    id: 'externe',
    label: 'Match contre une autre boîte',
    note: 'Cas rare, ça se cale à la main.',
    organizerOnly: true,
  },
} as const;

export type VenueId = keyof typeof VENUES;

export const isVenueId = (value: string): value is VenueId => value in VENUES;

/** En dessous, ça ne vaut pas le coup de réserver. */
export const MIN_PLAYERS = 6;

/** À partir de ce nombre de joueurs sûrs, le Five devient trop petit. */
export const SCEAUX_THRESHOLD = 12;

export type Counts = Record<Availability, number>;

export type Recommendation = {
  venueId: VenueId | null;
  /** Une phrase courte qui explique le choix, affichée telle quelle. */
  reason: string;
};

/**
 * Choix du lieu à partir du nombre de réponses.
 *
 * Volontairement bête et lisible : deux seuils, pas de pondération obscure.
 * Les "si besoin" ne comptent jamais comme des présents, ils servent seulement
 * à signaler qu'on pourrait basculer au parc s'ils se confirment.
 */
export function recommendVenue(counts: Counts): Recommendation {
  const sure = counts.oui;
  const maybe = counts.si_besoin;
  const potential = sure + maybe;

  if (potential < MIN_PLAYERS) {
    const manquants = MIN_PLAYERS - potential;
    return {
      venueId: null,
      reason: `Il manque encore ${manquants} joueur${manquants > 1 ? 's' : ''} pour que ça vaille le coup.`,
    };
  }

  if (sure >= SCEAUX_THRESHOLD) {
    return {
      venueId: 'sceaux',
      reason: `${sure} joueurs sûrs, autant prendre le grand terrain.`,
    };
  }

  if (sure < MIN_PLAYERS) {
    return {
      venueId: 'five',
      reason: `Seulement ${sure} joueur${sure > 1 ? 's' : ''} sûr${sure > 1 ? 's' : ''}, ça dépend des ${maybe} indécis.`,
    };
  }

  if (potential >= SCEAUX_THRESHOLD) {
    return {
      venueId: 'five',
      reason: `${sure} joueurs sûrs. Si les ${maybe} indécis se confirment, on passe au parc.`,
    };
  }

  return {
    venueId: 'five',
    reason: `${sure} joueurs, c'est le format qui colle.`,
  };
}

/** On joue sur la pause déj, donc l'heure ne se saisit ni ne s'affiche. */
export const MATCH_HOUR = 12;

/** Ramène une date au créneau de midi, quelle que soit l'heure reçue. */
export function atMatchHour(date: Date): Date {
  const result = new Date(date);
  result.setHours(MATCH_HOUR, 0, 0, 0);
  return result;
}

/** Par défaut les réponses ferment la veille à 18h, ça laisse le temps de réserver. */
export function defaultDeadlineFor(matchDate: Date): Date {
  const deadline = new Date(matchDate);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(18, 0, 0, 0);
  return deadline;
}

/**
 * Token d'URL (lien participant ou lien organisateur).
 * 16 octets aléatoires, soit 22 caractères non devinables et sûrs en URL.
 */
export function generateToken(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Clé d'unicité d'un événement : le jour du match au format YYYY-MM-DD.
 * Deux sondages ne peuvent pas exister le même jour, c'est ce qui empêche
 * les doublons.
 *
 * Le fuseau du serveur fait foi, les conteneurs tournent en TZ=Europe/Paris.
 * ('sv-SE' est la locale qui formate nativement en YYYY-MM-DD.)
 */
export function occurrenceKeyFor(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/**
 * Nom réduit à sa forme comparable : minuscules, sans accent, espaces normalisés.
 * Permet de reconnaître "Jean-Luc" et "jean luc" comme la même personne, et donc
 * de la laisser revenir changer sa réponse sans avoir de compte.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** On peut répondre tant que l'organisateur n'a pas clôturé et que la deadline tient. */
export function isVotingOpen(event: { status: string; voteDeadline: Date }, now = new Date()): boolean {
  return event.status === 'ouvert' && event.voteDeadline.getTime() > now.getTime();
}
