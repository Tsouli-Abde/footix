/**
 * Jeu de données de démonstration : le modèle « Foot du vendredi », l'événement
 * de la semaine et quelques votes, pour avoir un tableau rempli en dev.
 *
 * `npm run seed` — sans effet si le modèle existe déjà.
 */
import { prisma } from '../db.js';
import { generateToken, normalizeName } from '../domain.js';
import { generateDueEvents } from '../recurrence.js';

const OPTIONS = [
  { label: 'Five (Urban Soccer)', capacity: 10 },
  { label: 'Parc de la Tête d’Or', capacity: 14 },
  { label: 'Stade municipal', capacity: 22 },
  { label: 'Match contre une autre boîte', capacity: 11 },
];

const existing = await prisma.recurrenceTemplate.findFirst({ where: { title: 'Foot du vendredi' } });

if (existing) {
  console.log('Le modèle « Foot du vendredi » existe déjà, rien à faire.');
} else {
  const template = await prisma.recurrenceTemplate.create({
    data: {
      title: 'Foot du vendredi',
      description: 'Le match hebdo entre collègues. Vote avant jeudi soir !',
      weekday: 5, // vendredi
      matchTime: '19:00',
      deadlineHoursBefore: 25, // jeudi 18h pour un match vendredi 19h
      leadTimeDays: 3, // généré le mardi
      organizerToken: generateToken(),
      options: {
        create: OPTIONS.map((option, index) => ({ ...option, position: index })),
      },
    },
  });

  console.log(`Modèle créé — lien de gestion : /recurrence/${template.organizerToken}`);
}

// On force la génération de la prochaine occurrence même si le délai n'est pas
// encore atteint, pour avoir tout de suite un événement à regarder.
const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
const { created } = await generateDueEvents(soon);

for (const { eventId, publicToken } of created) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: { options: true } });

  const votes: Record<string, ('oui' | 'si_besoin' | 'non')[]> = {
    Tsouli: ['oui', 'si_besoin', 'non', 'non'],
    Camille: ['oui', 'oui', 'si_besoin', 'non'],
    'Jean-Luc': ['si_besoin', 'oui', 'oui', 'oui'],
    Sarah: ['oui', 'non', 'si_besoin', 'si_besoin'],
  };

  for (const [name, values] of Object.entries(votes)) {
    await prisma.participant.create({
      data: {
        eventId: event.id,
        name,
        nameKey: normalizeName(name),
        votes: {
          create: event.options.map((option, index) => ({ optionId: option.id, value: values[index] ?? 'non' })),
        },
      },
    });
  }

  console.log(`Événement de démo — lien de vote : /e/${publicToken}`);
  console.log(`Événement de démo — lien organisateur : /manage/${event.organizerToken}`);
}

await prisma.$disconnect();
