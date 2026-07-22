/**
 * Jeu de données de démonstration : l'équipe au complet, des matchs déjà joués
 * pour remplir l'historique, et du monde sur le sondage en cours.
 *
 * `npm run seed:demo`, additif et rejouable : les jours déjà occupés sont ignorés.
 */
import { prisma } from '../db.js';
import { atMatchHour, defaultDeadlineFor, generateToken, normalizeName, type Availability } from '../domain.js';
import { occurrenceKeyFor } from '../domain.js';

const TEAM = [
  'Tsouli',
  'Camille',
  'Jean-Luc',
  'Sarah',
  'Yanis',
  'Marion',
  'Karim',
  'Élodie',
  'Thomas',
  'Nadia',
  'Hugo',
  'Léa',
  'Rachid',
  'Claire',
];

/** Matchs déjà joués, du plus récent au plus ancien. */
const PAST_MATCHES = [
  { date: new Date(2026, 6, 17), present: 13, maybe: 1, venue: 'sceaux' },
  { date: new Date(2026, 6, 10), present: 8, maybe: 2, venue: 'five' },
  { date: new Date(2026, 6, 3), present: 12, maybe: 2, venue: 'sceaux' },
  { date: new Date(2026, 5, 26), present: 7, maybe: 1, venue: 'five' },
];

/** Les `present` premiers répondent oui, les `maybe` suivants si besoin, le reste non. */
function availabilityAt(index: number, present: number, maybe: number): Availability {
  if (index < present) return 'oui';
  if (index < present + maybe) return 'si_besoin';
  return 'non';
}

async function createPastMatch(date: Date, present: number, maybe: number, venue: string) {
  const matchDate = atMatchHour(date);
  const occurrenceKey = occurrenceKeyFor(matchDate);

  if (await prisma.event.findUnique({ where: { occurrenceKey } })) {
    console.log(`  ${occurrenceKey} : déjà présent, ignoré.`);
    return;
  }

  await prisma.event.create({
    data: {
      title: 'Foot vendredi ?',
      type: 'recurrent',
      matchDate,
      occurrenceKey,
      voteDeadline: defaultDeadlineFor(matchDate),
      status: 'cloture',
      chosenVenue: venue,
      publicToken: generateToken(),
      organizerToken: generateToken(),
      participants: {
        create: TEAM.map((name, index) => ({
          name,
          nameKey: normalizeName(name),
          availability: availabilityAt(index, present, maybe),
        })),
      },
    },
  });

  console.log(`  ${occurrenceKey} : ${present} présents, on a joué au ${venue}.`);
}

console.log('Matchs déjà joués :');
for (const match of PAST_MATCHES) {
  await createPastMatch(match.date, match.present, match.maybe, match.venue);
}

// Remplit le sondage en cours avec le reste de l'équipe.
const openEvent = await prisma.event.findFirst({
  where: { status: 'ouvert' },
  orderBy: { matchDate: 'asc' },
  include: { participants: true },
});

if (openEvent) {
  const alreadyAnswered = new Set(openEvent.participants.map((participant) => participant.nameKey));
  let added = 0;

  for (const [index, name] of TEAM.entries()) {
    if (alreadyAnswered.has(normalizeName(name))) continue;

    await prisma.participant.create({
      data: {
        eventId: openEvent.id,
        name,
        nameKey: normalizeName(name),
        availability: availabilityAt(index, 9, 3),
      },
    });
    added += 1;
  }

  console.log(`\nSondage en cours : ${added} réponse(s) ajoutée(s).`);
  console.log(`  Lien de réponse    : /e/${openEvent.publicToken}`);
  console.log(`  Lien organisateur  : /manage/${openEvent.organizerToken}`);
}

const template = await prisma.recurrenceTemplate.findFirst({ where: { active: true } });
if (template) console.log(`  Rendez-vous hebdo  : /recurrence/${template.organizerToken}`);

await prisma.$disconnect();
