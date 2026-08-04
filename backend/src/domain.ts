import { randomBytes } from 'node:crypto';

/**
 * Les réponses possibles, dans l'ordre où on les propose.
 *
 * - `oui` : vient, où que ce soit
 * - `si_besoin` : vient s'il manque du monde, où que ce soit
 * - `si_sceaux` : vient seulement si on joue au Parc de Sceaux
 * - `non` : ne vient pas
 *
 * `si_sceaux` n'est pas une nuance de disponibilité mais une condition sur le
 * lieu : c'est ce qui permet au parc de l'emporter alors que le Five ne
 * réunirait pas assez de monde.
 */
export const AVAILABILITY_VALUES = ['oui', 'si_besoin', 'si_sceaux', 'non'] as const;
export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const EVENT_STATUSES = ['ouvert', 'cloture'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ['ponctuel', 'recurrent'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Les lieux sont en dur : on joue toujours aux deux mêmes endroits, et le but
 * de l'app est justement d'éviter d'avoir à en rediscuter chaque semaine.
 */
export const VENUES = {
  five: {
    id: 'five',
    label: 'Le Five',
    note: 'Terrain synthétique, 5 ou 6 contre 6.',
  },
  sceaux: {
    id: 'sceaux',
    label: 'Parc de Sceaux',
    note: 'Grand terrain en herbe.',
  },
} as const;

export type VenueId = keyof typeof VENUES;

export const isVenueId = (value: string): value is VenueId => value in VENUES;

/** En dessous, ça ne vaut pas le coup de réserver. */
export const MIN_PLAYERS = 6;

/** À partir de ce nombre de joueurs sûrs, le Five devient trop petit. */
export const SCEAUX_THRESHOLD = 12;

/// Au delà, même le parc devient ingérable : il vaut mieux prévenir.
export const CROWD_THRESHOLD = 24;

export type Counts = Record<Availability, number>;

/**
 * Comment se présente le match. Sert à la fois à colorer l'affichage et à
 * décider du ton du message, sans que le front ait à redevenir l'algorithme.
 *
 * - `vide` : personne n'a répondu
 * - `insuffisant` : trop peu de monde, même en comptant les indécis
 * - `incertain` : ça ne passe que si les indécis se confirment
 * - `ok` : assez de monde, le lieu est clair
 * - `foule` : tellement de monde qu'il faut s'organiser
 */
export type Outlook = 'vide' | 'insuffisant' | 'incertain' | 'ok' | 'foule';

/**
 * L'état d'un lieu au vu des réponses.
 *
 * - `ok` : assez de monde sûr, on peut y aller
 * - `juste` : ça ne passe que si les « si besoin » confirment
 * - `trop_petit` : jouable, mais on y serait trop nombreux (le Five)
 * - `insuffisant` : même en comptant les « si besoin », pas assez de monde
 */
export const PROPOSAL_STATUSES = ['ok', 'juste', 'trop_petit', 'insuffisant'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** Ce que donnerait un lieu donné : combien de joueurs, et dans quel état. */
export type Proposal = {
  venueId: VenueId;
  /** Joueurs certains de venir sur ce terrain. */
  sure: number;
  /** Le maximum atteignable si tous les « si besoin » confirment. */
  possible: number;
  status: ProposalStatus;
};

export type Recommendation = {
  venueId: VenueId | null;
  outlook: Outlook;
  /** Une phrase courte qui explique le choix, affichée telle quelle. */
  reason: string;
  /** Les deux lieux chiffrés, le retenu en premier. */
  proposals: Proposal[];
};

/** « 1 joueur », « 3 joueurs ». */
const players = (n: number) => `${n} joueur${n > 1 ? 's' : ''}`;

/** « 8 joueurs sûrs », et les « si besoin » en plus quand il y en a. */
const tally = (sure: number, maybe: number) => {
  const base = `${players(sure)} sûr${sure > 1 ? 's' : ''}`;
  return maybe > 0 ? `${base}, ${maybe} si besoin.` : `${base}.`;
};

/**
 * Ordre de préférence à égalité de joueurs : le Five est le lieu par défaut,
 * c'est un terrain réservé. Cette liste est aussi l'ordre d'évaluation, ce qui
 * rend le résultat entièrement déterministe.
 */
const VENUE_ORDER: readonly VenueId[] = ['five', 'sceaux'];

const STATUS_RANK: Record<ProposalStatus, number> = { ok: 0, juste: 1, trop_petit: 2, insuffisant: 3 };

/**
 * Ce que réunit un lieu.
 *
 * `si_besoin` vient partout, `si_sceaux` uniquement au parc : c'est toute la
 * différence entre les deux terrains.
 */
function proposalFor(counts: Counts, venueId: VenueId): Proposal {
  const sure = venueId === 'sceaux' ? counts.oui + counts.si_sceaux : counts.oui;
  const possible = sure + counts.si_besoin;

  const status: ProposalStatus =
    possible < MIN_PLAYERS
      ? 'insuffisant'
      : sure < MIN_PLAYERS
        ? 'juste'
        : venueId === 'five' && sure >= SCEAUX_THRESHOLD
          ? 'trop_petit'
          : 'ok';

  return { venueId, sure, possible, status };
}

/**
 * Choix du lieu à partir des réponses.
 *
 * Déterministe et sans pondération obscure : on chiffre les deux terrains, puis
 * on les classe toujours selon les mêmes critères, dans cet ordre — l'état du
 * lieu d'abord, le nombre de joueurs sûrs ensuite, le maximum atteignable, et
 * le Five en dernier recours pour départager. Deux mêmes séries de réponses
 * donnent donc toujours la même proposition.
 *
 * Les deux propositions sont renvoyées, pas seulement la gagnante :
 * l'organisateur voit ce que l'autre terrain donnerait avant de trancher.
 */
export function recommendVenue(counts: Counts): Recommendation {
  const proposals = VENUE_ORDER.map((venueId) => proposalFor(counts, venueId)).sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      b.sure - a.sure ||
      b.possible - a.possible ||
      VENUE_ORDER.indexOf(a.venueId) - VENUE_ORDER.indexOf(b.venueId),
  );

  const best = proposals[0];
  const answered = counts.oui + counts.si_besoin + counts.si_sceaux;

  if (answered === 0) {
    return {
      venueId: null,
      outlook: 'vide',
      reason: counts.non > 0 ? 'Personne de dispo.' : 'Personne n’a encore répondu.',
      proposals,
    };
  }

  if (best.status === 'insuffisant') {
    return {
      venueId: null,
      outlook: 'insuffisant',
      reason: `${players(best.possible)}, il en faut ${MIN_PLAYERS}.`,
      proposals,
    };
  }

  const outlook: Outlook =
    best.status === 'juste' ? 'incertain' : best.sure >= CROWD_THRESHOLD ? 'foule' : 'ok';

  return { venueId: best.venueId, outlook, reason: tally(best.sure, counts.si_besoin), proposals };
}

/** L'heure par défaut, celle de la pause déj. */
export const MATCH_HOUR = 12;

/** Ramène une date au créneau de midi, quelle que soit l'heure reçue. */
export function atMatchHour(date: Date): Date {
  const result = new Date(date);
  result.setHours(MATCH_HOUR, 0, 0, 0);
  return result;
}

/** L'heure d'une date au format « HH:MM », l'inverse de withTime. */
export function timeOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Applique une heure « HH:MM » à un jour donné.
 * Sert quand l'organisateur veut un créneau autre que la pause déj.
 */
export function withTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
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

/**
 * On répond jusqu'au coup d'envoi.
 *
 * Pas de date de fin des réponses : dans les faits les gens répondent à la
 * dernière minute, et une deadline la veille les excluait pour rien. Le seul
 * moment où répondre n'a plus de sens, c'est quand le match a commencé.
 */
export function isVotingOpen(event: { status: string; matchDate: Date }, now = new Date()): boolean {
  return event.status === 'ouvert' && event.matchDate.getTime() > now.getTime();
}
