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
  title: string;
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
  participants: Participant[];
  /** Présents uniquement sur la vue organisateur. */
  organizerToken?: string;
  recurrenceTemplateId?: string | null;
  venues?: Venue[];
};

export type EventSummary = {
  id: string;
  title: string;
  matchDate: string;
  voteDeadline: string;
  status: 'ouvert' | 'cloture';
  votingOpen: boolean;
  publicToken: string;
  counts: Counts;
  participantCount: number;
  chosenVenue: Venue | null;
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
