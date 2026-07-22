/** Miroir des réponses de l'API (backend/src/serializers.ts). */

export const VOTE_VALUES = ['oui', 'si_besoin', 'non'] as const;
export type VoteValue = (typeof VOTE_VALUES)[number];

export type EventOption = {
  id: string;
  label: string;
  capacity: number | null;
  position: number;
  counts: Record<VoteValue, number>;
};

export type EventParticipant = {
  id: string;
  name: string;
  createdAt: string;
  /** Réponses indexées par id d'option. */
  votes: Record<string, VoteValue>;
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
  winningOptionId: string | null;
  publicToken: string;
  createdAt: string;
  options: EventOption[];
  participants: EventParticipant[];
  /** Présents uniquement sur la vue organisateur. */
  organizerToken?: string;
  recurrenceTemplateId?: string | null;
};

export type EventSummary = {
  id: string;
  title: string;
  matchDate: string;
  voteDeadline: string;
  status: 'ouvert' | 'cloture';
  votingOpen: boolean;
  publicToken: string;
  participantCount: number;
  winningOption: { id: string; label: string } | null;
};

export type TemplateOption = {
  id: string;
  label: string;
  capacity: number | null;
  position: number;
};

export type RecurrenceTemplate = {
  id: string;
  title: string;
  description: string | null;
  weekday: number;
  matchTime: string;
  deadlineHoursBefore: number;
  leadTimeDays: number;
  active: boolean;
  createdAt: string;
  options: TemplateOption[];
  nextMatchDate?: string;
  organizerToken?: string;
};
