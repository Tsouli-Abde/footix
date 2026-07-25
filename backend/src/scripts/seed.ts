/**
 * Jeu de données minimal : le rendez-vous du vendredi et le sondage de la semaine.
 *
 * `npm run seed`, sans effet si le modèle existe déjà.
 */
import { prisma } from '../db.js';
import { generateToken, occurrenceKeyFor } from '../domain.js';
import { nextMatchDate } from '../recurrence.js';

const TITLE = 'Foot hebdo du vendredi';

const template =
  (await prisma.recurrenceTemplate.findFirst({ where: { title: TITLE } })) ??
  (await prisma.recurrenceTemplate.create({
    data: {
      title: TITLE,
      description: 'Le match de la semaine, sur la pause déj.',
      weekday: 5,
      deadlineHoursBefore: 18, // jeudi 18h pour un match vendredi midi
      leadTimeDays: 3, // le sondage s'ouvre le mardi
      organizerToken: generateToken(),
    },
  }));

console.log(`Rendez-vous, lien de gestion : /recurrence/${template.organizerToken}`);

// On crée directement l'occurrence à venir, sans passer par la porte du délai :
// on veut un sondage sous les yeux quelle que soit la date d'exécution du seed.
const matchDate = nextMatchDate(template);
const occurrenceKey = occurrenceKeyFor(matchDate);

const event =
  (await prisma.event.findUnique({ where: { occurrenceKey } })) ??
  (await prisma.event.create({
    data: {
      title: null, // sans titre, c'est la date qui sert d'intitulé
      type: 'recurrent',
      recurrenceTemplateId: template.id,
      matchDate,
      occurrenceKey,
      voteDeadline: new Date(matchDate.getTime() - template.deadlineHoursBefore * 60 * 60 * 1000),
      publicToken: generateToken(),
      organizerToken: generateToken(),
    },
  }));

console.log(`Sondage de la semaine, lien de réponse   : /e/${event.publicToken}`);
console.log(`Sondage de la semaine, lien organisateur : /manage/${event.organizerToken}`);

await prisma.$disconnect();
