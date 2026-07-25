import { prisma } from './db.js';
import { isVenueId, VENUES, type Availability } from './domain.js';
import { formatMatchDate } from './format.js';
import { pushToAll } from './push.js';

/**
 * Fil d'activité de l'équipe.
 *
 * Chaque moment notable y laisse une ligne, que le front affiche en notification
 * in-app (toast + cloche). Les moments forts (sondage ouvert, résultat) déclenchent
 * en plus une notification push OS ; le détail (réponses individuelles) reste
 * in-app pour ne pas spammer les téléphones.
 */

export const ACTIVITY_TYPES = ['vote_ouvert', 'reponse', 'cloture', 'score', 'annulation'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

type RecordInput = {
  type: ActivityType;
  title: string;
  body: string;
  eventPublicToken?: string | null;
  /** true = envoie aussi une notification push OS. */
  push?: boolean;
};

export async function recordActivity(input: RecordInput) {
  await prisma.activity.create({
    data: {
      type: input.type,
      title: input.title,
      body: input.body,
      eventPublicToken: input.eventPublicToken ?? null,
    },
  });

  if (input.push) {
    void pushToAll({
      title: input.title,
      body: input.body,
      url: input.eventPublicToken ? `/e/${input.eventPublicToken}` : '/',
    });
  }
}

type EventLike = { title: string | null; matchDate: Date; publicToken: string };

const eventLabel = (event: EventLike) => event.title ?? `Foot du ${formatMatchDate(event.matchDate)}`;

const AVAILABILITY_WORDS: Record<Availability, string> = {
  oui: 'vient',
  si_besoin: 'vient si besoin',
  non: 'ne vient pas',
};

const venueLabel = (venue: string | null) => (venue && isVenueId(venue) ? VENUES[venue].label : null);

/** Un sondage s'ouvre : moment fort, notif in-app + push OS. */
export const announceVoteOpen = (event: EventLike) =>
  recordActivity({
    type: 'vote_ouvert',
    title: eventLabel(event),
    body: `On joue ${formatMatchDate(event.matchDate)} ? Dis si tu viens.`,
    eventPublicToken: event.publicToken,
    push: true,
  });

/** Quelqu'un répond : notif in-app seulement, sinon les téléphones sonnent en boucle. */
export const announceAnswer = (event: EventLike, name: string, availability: Availability) =>
  recordActivity({
    type: 'reponse',
    title: eventLabel(event),
    body: `${name} ${AVAILABILITY_WORDS[availability]}.`,
    eventPublicToken: event.publicToken,
    push: false,
  });

/** Clôture avec lieu retenu : moment fort. */
export const announceClose = (event: EventLike, venue: string | null) => {
  const label = venueLabel(venue);
  return recordActivity({
    type: 'cloture',
    title: eventLabel(event),
    body: label ? `C'est décidé, on joue à ${label}.` : 'Vote clôturé, match annulé.',
    eventPublicToken: event.publicToken,
    push: true,
  });
};

/** Score saisi après le match : les gens veulent le savoir, on pousse aussi. */
export const announceScore = (event: EventLike, score: string) =>
  recordActivity({
    type: 'score',
    title: eventLabel(event),
    body: `Score final : ${score}.`,
    eventPublicToken: event.publicToken,
    push: true,
  });

export function serializeActivity(activity: {
  id: string;
  type: string;
  title: string;
  body: string;
  eventPublicToken: string | null;
  createdAt: Date;
}) {
  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    body: activity.body,
    url: activity.eventPublicToken ? `/e/${activity.eventPublicToken}` : null,
    createdAt: activity.createdAt.toISOString(),
  };
}
