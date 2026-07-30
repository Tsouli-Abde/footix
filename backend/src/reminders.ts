import { announceReminder } from './activity.js';
import { prisma } from './db.js';
import { isVenueId, recommendVenue, VENUES, type Availability, type Counts } from './domain.js';
import { eventInclude, type EventWithParticipants } from './serializers.js';

const HOUR_MS = 60 * 60 * 1000;

/** Fenêtre de tir : on prévient pour les matchs qui ont lieu dans moins de 24h. */
const REMINDER_WINDOW_MS = 24 * HOUR_MS;

function countAnswers(event: EventWithParticipants): Counts {
  const counts: Counts = { oui: 0, si_besoin: 0, non: 0 };
  for (const participant of event.participants) {
    counts[participant.availability as Availability] += 1;
  }
  return counts;
}

/**
 * Le texte du récapitulatif de la veille.
 *
 * On ne se contente pas de répéter les chiffres : on annonce ce qui va se passer,
 * parce que c'est la question que tout le monde se pose la veille au soir.
 */
export function reminderMessage(event: EventWithParticipants): string {
  const counts = countAnswers(event);
  const { venueId, outlook, reason } = recommendVenue(counts);
  const venue = venueId && isVenueId(venueId) ? VENUES[venueId].label : null;

  switch (outlook) {
    case 'vide':
      return 'Personne n’a répondu pour l’instant. Si tu viens, dis-le maintenant.';
    case 'insuffisant':
      return `${reason} Sans quelques réponses de plus, ça ne se fera pas.`;
    case 'incertain':
      return `${counts.oui} sûrs et ${counts.si_besoin} indécis. Si vous confirmez, on part sur ${venue}.`;
    case 'foule':
      return `${counts.oui} joueurs pour ${venue}. Prévoyez de faire tourner.`;
    default:
      return `${counts.oui} joueurs, on part sur ${venue}.`;
  }
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
