/**
 * Jeu de données minimal : le rendez-vous du vendredi et le sondage de la semaine.
 *
 * `npm run seed`, sans effet si le modèle existe déjà.
 */
import { prisma } from '../db.js';
import { generateToken } from '../domain.js';
import { generateDueEvents } from '../recurrence.js';

const existing = await prisma.recurrenceTemplate.findFirst({ where: { title: 'Foot vendredi ?' } });

if (existing) {
  console.log('Le rendez-vous du vendredi existe déjà, rien à faire.');
} else {
  const template = await prisma.recurrenceTemplate.create({
    data: {
      title: 'Foot vendredi ?',
      description: 'Le match de la semaine, sur la pause déj.',
      weekday: 5,
      deadlineHoursBefore: 18, // jeudi 18h pour un match vendredi midi
      leadTimeDays: 3, // le sondage s'ouvre le mardi
      organizerToken: generateToken(),
    },
  });

  console.log(`Rendez-vous créé, lien de gestion : /recurrence/${template.organizerToken}`);
}

// On force la génération de la prochaine occurrence même si le délai n'est pas
// atteint, histoire d'avoir tout de suite un sondage sous les yeux.
const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
const { created } = await generateDueEvents(soon);

for (const { eventId, publicToken } of created) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  console.log(`Sondage de la semaine, lien de réponse    : /e/${publicToken}`);
  console.log(`Sondage de la semaine, lien organisateur  : /manage/${event.organizerToken}`);
}

await prisma.$disconnect();
