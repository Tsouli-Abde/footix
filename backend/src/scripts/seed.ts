/**
 * Jeu de données minimal : un sondage pour le prochain vendredi.
 *
 * `npm run seed`, sans effet si un sondage existe déjà ce jour-là.
 */
import '../env.js'; // doit rester en premier : charge .env avant tout le reste
import { prisma } from '../db.js';
import { atMatchHour, defaultDeadlineFor, generateToken, occurrenceKeyFor } from '../domain.js';

/** Le prochain vendredi à midi. */
function nextFriday(from = new Date()): Date {
  const date = atMatchHour(from);
  date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

const matchDate = nextFriday();
const occurrenceKey = occurrenceKeyFor(matchDate);

const event =
  (await prisma.event.findUnique({ where: { occurrenceKey } })) ??
  (await prisma.event.create({
    data: {
      title: null, // sans titre, c'est la date qui sert d'intitulé
      description: null,
      organizerName: 'Tsouli',
      matchDate,
      occurrenceKey,
      voteDeadline: defaultDeadlineFor(matchDate),
      publicToken: generateToken(),
      organizerToken: generateToken(),
    },
  }));

console.log(`Sondage, lien de réponse   : /e/${event.publicToken}`);
console.log(`Sondage, lien organisateur : /manage/${event.organizerToken}`);

await prisma.$disconnect();
