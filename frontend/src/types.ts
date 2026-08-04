/** Miroir des réponses de l'API (backend/src/serializers.ts). */

export const AVAILABILITY_VALUES = ['oui', 'si_besoin', 'si_sceaux', 'non'] as const;
export type Availability = (typeof AVAILABILITY_VALUES)[number];

export type Counts = Record<Availability, number>;

/** Comment se présente le match, calculé côté serveur (voir backend/src/domain.ts). */
export type Outlook = 'vide' | 'insuffisant' | 'incertain' | 'ok' | 'foule';

export type Venue = {
  id: string;
  label: string;
  note: string;
};

export type ProposalStatus = 'ok' | 'juste' | 'trop_petit' | 'insuffisant';

/** Ce que donnerait un terrain, chiffré par le serveur. */
export type Proposal = {
  venue: Venue | null;
  sure: number;
  possible: number;
  status: ProposalStatus;
};

export type Participant = {
  id: string;
  name: string;
  availability: Availability;
  createdAt: string;
};

export type FootixEvent = {
  id: string;
  /** null quand personne n'a mis de titre : c'est la date qui sert d'intitulé. */
  title: string | null;
  description: string | null;
  type: 'ponctuel' | 'recurrent';
  matchDate: string;
  /** Vrai si une heure a été fixée explicitement, sinon on n'affiche que le jour. */
  hasTime: boolean;
  /** Prénom de la personne qui a créé le sondage, si elle l'a donné. */
  organizerName: string | null;
  status: 'ouvert' | 'cloture';
  votingOpen: boolean;
  createdAt: string;
  publicToken: string;
  counts: Counts;
  recommendation: { venue: Venue | null; outlook: Outlook; reason: string; proposals: Proposal[] };
  chosenVenue: Venue | null;
  score: string | null;
  resultNote: string | null;
  participants: Participant[];
  /** Présents uniquement sur la vue organisateur. */
  organizerToken?: string;
  venues?: Venue[];
};

export type EventSummary = {
  id: string;
  title: string | null;
  matchDate: string;
  hasTime: boolean;
  status: 'ouvert' | 'cloture';
  votingOpen: boolean;
  publicToken: string;
  counts: Counts;
  participantCount: number;
  chosenVenue: Venue | null;
  score: string | null;
  /** Présent seulement quand la liste vient de la gestion d'un rendez-vous hebdo. */
  organizerToken?: string;
};

export const ACTIVITY_TYPES = ['vote_ouvert', 'reponse', 'rappel', 'cloture', 'score', 'annulation'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  /** Lien vers le sondage concerné, ou null. */
  url: string | null;
  createdAt: string;
};
