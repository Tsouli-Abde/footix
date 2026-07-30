import type { Prisma } from '@prisma/client';
import {
  AVAILABILITY_VALUES,
  isVenueId,
  isVotingOpen,
  recommendVenue,
  VENUES,
  type Availability,
  type Counts,
} from './domain.js';

/** Ce qu'il faut charger pour afficher un sondage complet. */
export const eventInclude = {
  participants: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.EventInclude;

export type EventWithParticipants = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

const emptyCounts = (): Counts => ({ oui: 0, si_besoin: 0, non: 0 });

function countAnswers(event: EventWithParticipants): Counts {
  const counts = emptyCounts();
  for (const participant of event.participants) {
    if ((AVAILABILITY_VALUES as readonly string[]).includes(participant.availability)) {
      counts[participant.availability as Availability] += 1;
    }
  }
  return counts;
}

const venuePayload = (venueId: string | null) => {
  if (!venueId || !isVenueId(venueId)) return null;
  const venue = VENUES[venueId];
  return { id: venue.id, label: venue.label, note: venue.note };
};

/**
 * Vue publique d'un sondage, c'est tout ce dont la page de réponse a besoin.
 * Le token organisateur n'y figure jamais, seul le lien de gestion le révèle.
 */
export function serializeEvent(event: EventWithParticipants) {
  const counts = countAnswers(event);
  const recommendation = recommendVenue(counts);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    matchDate: event.matchDate.toISOString(),
    hasTime: event.hasTime,
    organizerName: event.organizerName,
    voteDeadline: event.voteDeadline.toISOString(),
    status: event.status,
    votingOpen: isVotingOpen(event),
    createdAt: event.createdAt.toISOString(),
    publicToken: event.publicToken,
    counts,
    recommendation: {
      venue: venuePayload(recommendation.venueId),
      outlook: recommendation.outlook,
      reason: recommendation.reason,
    },
    chosenVenue: venuePayload(event.chosenVenue),
    score: event.score,
    resultNote: event.resultNote,
    participants: event.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      availability: participant.availability,
      createdAt: participant.createdAt.toISOString(),
    })),
  };
}

/** Vue organisateur : la vue publique plus de quoi gérer le sondage. */
export function serializeEventForOrganizer(event: EventWithParticipants) {
  return {
    ...serializeEvent(event),
    organizerToken: event.organizerToken,
    recurrenceTemplateId: event.recurrenceTemplateId,
    /** Les lieux proposés à la clôture, y compris celui réservé à l'organisateur. */
    venues: Object.values(VENUES).map((venue) => ({
      id: venue.id,
      label: venue.label,
      note: venue.note,
      organizerOnly: venue.organizerOnly,
    })),
  };
}

/** Ligne de liste ou d'historique, volontairement légère. */
export function serializeEventSummary(event: EventWithParticipants) {
  const counts = countAnswers(event);

  return {
    id: event.id,
    title: event.title,
    matchDate: event.matchDate.toISOString(),
    hasTime: event.hasTime,
    voteDeadline: event.voteDeadline.toISOString(),
    status: event.status,
    votingOpen: isVotingOpen(event),
    publicToken: event.publicToken,
    counts,
    participantCount: event.participants.length,
    chosenVenue: venuePayload(event.chosenVenue),
    score: event.score,
  };
}

export function serializeTemplate(template: Prisma.RecurrenceTemplateGetPayload<object>) {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    weekday: template.weekday,
    deadlineHoursBefore: template.deadlineHoursBefore,
    leadTimeDays: template.leadTimeDays,
    active: template.active,
    createdAt: template.createdAt.toISOString(),
  };
}

export function serializeTemplateForOrganizer(template: Prisma.RecurrenceTemplateGetPayload<object>) {
  return { ...serializeTemplate(template), organizerToken: template.organizerToken };
}
