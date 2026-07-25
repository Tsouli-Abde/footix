/** Miroir des réponses de l'API (backend/src/serializers.ts). */

export const AVAILABILITY_VALUES = ['oui', 'si_besoin', 'non'] as const;
export type Availability = (typeof AVAILABILITY_VALUES)[number];

export type Counts = Record<Availability, number>;

export type Venue = {
  id: string;
  label: string;
  note: string;
  /** Vrai pour le match contre une autre boîte, que les votants ne voient pas. */
  organizerOnly?: boolean;
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
  voteDeadline: string;
  status: 'ouvert' | 'cloture';
  votingOpen: boolean;
  createdAt: string;
  publicToken: string;
  counts: Counts;
  recommendation: { venue: Venue | null; reason: string };
  chosenVenue: Venue | null;
  score: string | null;
  resultNote: string | null;
  participants: Participant[];
  /** Présents uniquement sur la vue organisateur. */
  organizerToken?: string;
  recurrenceTemplateId?: string | null;
  venues?: Venue[];
};

export type EventSummary = {
  id: string;
  title: string | null;
  matchDate: string;
  voteDeadline: string;
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

export const ACTIVITY_TYPES = ['vote_ouvert', 'reponse', 'cloture', 'score', 'annulation'] as const;
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

export type RecurrenceTemplate = {
  id: string;
  title: string;
  description: string | null;
  weekday: number;
  deadlineHoursBefore: number;
  leadTimeDays: number;
  active: boolean;
  createdAt: string;
  nextMatchDate?: string;
  organizerToken?: string;
};
