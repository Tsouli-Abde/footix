/**
 * Le battement régulier de l'application, lancé toutes les heures.
 *
 * Deux tâches, dans cet ordre : envoyer le récapitulatif de la veille, puis
 * clôturer les sondages que personne n'a clôturés à l'approche du match. Les
 * deux sont idempotentes, relancer le job ne double rien.
 */
import '../env.js'; // doit rester en premier : charge .env avant tout le reste
import { prisma } from '../db.js';
import { autoCloseDueEvents, sendDueReminders } from '../reminders.js';

const reminders = await sendDueReminders();
for (const sent of reminders.sent) {
  console.log(`Rappel envoyé pour ${sent.publicToken} : ${sent.message}`);
}

const closed = await autoCloseDueEvents();
for (const event of closed) {
  console.log(`Clôturé automatiquement : ${event.eventId} (lieu ${event.chosenVenue ?? 'non retenu'})`);
}

console.log(`${reminders.sent.length} rappel(s), ${closed.length} clôture(s) automatique(s).`);

await prisma.$disconnect();
