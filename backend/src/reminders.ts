import { announceReminder } from './activity.js';
import { prisma } from './db.js';
import { isVenueId, recommendVenue, VENUES, type Availability, type Counts } from './domain.js';
import { eventInclude, type EventWithParticipants } from './serializers.js';

const HOUR_MS = 60 * 60 * 1000;

/** Fenêtre de tir : on prévient pour les matchs qui ont lieu dans moins de 24h. */
const REMINDER_WINDOW_MS = 24 * HOUR_MS;

function countAnswers(event: EventWithParticipants): Counts {
  const counts: Counts = { oui: 0, si_besoin: 0, si_sceaux: 0, non: 0 };
  for (const participant of event.participants) {
    if (participant.availability in counts) counts[participant.availability as Availability] += 1;
  }
  return counts;
}

/** Le texte du récapitulatif de la veille : où on en est, et où on joue. */
export function reminderMessage(event: EventWithParticipants): string {
  const counts = countAnswers(event);
  const { venueId, outlook, reason } = recommendVenue(counts);
  const venue = venueId && isVenueId(venueId) ? VENUES[venueId].label : null;

  if (outlook === 'vide' || outlook === 'insuffisant' || !venue) return reason;
  return `${reason} On part sur ${venue}.`;
}

/**
 * Clôture les sondages dont le match est passé, que personne n'a clôturés.
 *
 * On attend le coup d'envoi et pas une minute de moins : c'est ce qui permet de
 * répondre à la dernière minute. Le lieu retenu est celui que l'app conseillait,
 * ou rien si les réponses ne permettaient pas de trancher.
 *
 * Volontairement silencieux, aucune notification : c'est un ménage automatique,
 * pas une décision.
 */
export async function autoCloseDueEvents(now = new Date()) {
  const events = await prisma.event.findMany({
    where: { status: 'ouvert', matchDate: { lte: now } },
    include: eventInclude,
  });

  const closed: { eventId: string; chosenVenue: string | null }[] = [];

  for (const event of events) {
    const { venueId } = recommendVenue(countAnswers(event));
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'cloture', chosenVenue: venueId },
    });
    closed.push({ eventId: event.id, chosenVenue: venueId });
  }

  return closed;
}

export type ReminderResult = {
  sent: { eventId: string; publicToken: string; message: string }[];
  skipped: { eventId: string; reason: string }[];
};

/**
 * Envoie le récapitulatif de la veille pour les matchs qui approchent.
 *
 * Idempotent grâce à `reminderSentAt` : le job peut tourner plusieurs fois par
 * jour sans renvoyer deux fois le même message.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderResult> {
  const events = await prisma.event.findMany({
    where: {
      status: 'ouvert',
      reminderSentAt: null,
      matchDate: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
    },
    include: eventInclude,
  });

  const result: ReminderResult = { sent: [], skipped: [] };

  for (const event of events) {
    const message = reminderMessage(event);
    await announceReminder(event, message);
    await prisma.event.update({ where: { id: event.id }, data: { reminderSentAt: now } });
    result.sent.push({ eventId: event.id, publicToken: event.publicToken, message });
  }

  return result;
}
