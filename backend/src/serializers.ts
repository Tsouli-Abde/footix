import type { Prisma } from '@prisma/client';
import { VOTE_VALUES, type VoteValue, isVotingOpen } from './domain.js';

/** Ce qu'il faut charger pour afficher un événement complet (tableau de vote inclus). */
export const eventInclude = {
  options: { orderBy: { position: 'asc' } },
  participants: {
    orderBy: { createdAt: 'asc' },
    include: { votes: true },
  },
} satisfies Prisma.EventInclude;

export type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

export const templateInclude = {
  options: { orderBy: { position: 'asc' } },
} satisfies Prisma.RecurrenceTemplateInclude;

export type TemplateWithOptions = Prisma.RecurrenceTemplateGetPayload<{ include: typeof templateInclude }>;

type VoteCounts = Record<VoteValue, number>;

const emptyCounts = (): VoteCounts => ({ oui: 0, si_besoin: 0, non: 0 });

/**
 * Vue publique d'un événement : tout ce dont la page de vote a besoin.
 * Le token organisateur n'y figure jamais — seul le lien de gestion le révèle.
 */
export function serializeEvent(event: EventWithRelations) {
  const countsByOption = new Map<string, VoteCounts>(event.options.map((option) => [option.id, emptyCounts()]));

  for (const participant of event.participants) {
    for (const vote of participant.votes) {
      const counts = countsByOption.get(vote.optionId);
      if (counts && (VOTE_VALUES as readonly string[]).includes(vote.value)) {
        counts[vote.value as VoteValue] += 1;
      }
    }
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    matchDate: event.matchDate.toISOString(),
    voteDeadline: event.voteDeadline.toISOString(),
    status: event.status,
    votingOpen: isVotingOpen(event),
    winningOptionId: event.winningOptionId,
    publicToken: event.publicToken,
    createdAt: event.createdAt.toISOString(),
    options: event.options.map((option) => ({
      id: option.id,
      label: option.label,
      capacity: option.capacity,
      position: option.position,
      counts: countsByOption.get(option.id) ?? emptyCounts(),
    })),
    participants: event.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      createdAt: participant.createdAt.toISOString(),
      // votes indexés par optionId : le frontend lit directement une case du tableau.
      votes: Object.fromEntries(participant.votes.map((vote) => [vote.optionId, vote.value])),
    })),
  };
}

/** Vue organisateur : la vue publique plus les éléments de gestion. */
export function serializeEventForOrganizer(event: EventWithRelations) {
  return {
    ...serializeEvent(event),
    organizerToken: event.organizerToken,
    recurrenceTemplateId: event.recurrenceTemplateId,
  };
}

/** Ligne d'historique : volontairement légère, la liste peut être longue. */
export function serializeEventSummary(event: EventWithRelations) {
  const winningOption = event.options.find((option) => option.id === event.winningOptionId);

  return {
    id: event.id,
    title: event.title,
    matchDate: event.matchDate.toISOString(),
    voteDeadline: event.voteDeadline.toISOString(),
    status: event.status,
    votingOpen: isVotingOpen(event),
    publicToken: event.publicToken,
    participantCount: event.participants.length,
    winningOption: winningOption ? { id: winningOption.id, label: winningOption.label } : null,
  };
}

export function serializeTemplate(template: TemplateWithOptions) {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    weekday: template.weekday,
    matchTime: template.matchTime,
    deadlineHoursBefore: template.deadlineHoursBefore,
    leadTimeDays: template.leadTimeDays,
    active: template.active,
    createdAt: template.createdAt.toISOString(),
    options: template.options.map((option) => ({
      id: option.id,
      label: option.label,
      capacity: option.capacity,
      position: option.position,
    })),
  };
}

export function serializeTemplateForOrganizer(template: TemplateWithOptions) {
  return { ...serializeTemplate(template), organizerToken: template.organizerToken };
}
