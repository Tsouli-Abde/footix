/**
 * Récapitulatif de la veille : prévient l'équipe de ce que donnent les réponses
 * et de l'endroit où on part jouer.
 *
 * Lancé plusieurs fois par jour (le service cron le fait toutes les heures).
 * Idempotent, un même match n'est annoncé qu'une fois.
 */
import '../env.js'; // doit rester en premier : charge .env avant tout le reste
import { prisma } from '../db.js';
import { sendDueReminders } from '../reminders.js';

const result = await sendDueReminders();

for (const sent of result.sent) {
  console.log(`Rappel envoyé pour ${sent.publicToken} : ${sent.message}`);
}
console.log(`${result.sent.length} rappel(s) envoyé(s).`);

await prisma.$disconnect();
