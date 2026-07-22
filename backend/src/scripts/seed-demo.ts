/**
 * Jeu de données de démonstration étoffé : une équipe de collègues, des matchs
 * passés pour remplir l'historique, et du monde sur le sondage en cours.
 *
 * `npm run seed:demo` — additif et rejouable : les dates déjà occupées sont
 * ignorées, rien n'est supprimé.
 */
import { prisma } from '../db.js';
import { generateToken, normalizeName, occurrenceKeyFor, type VoteValue } from '../domain.js';

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

const OPTIONS = [
  { label: 'Five (Urban Soccer)', capacity: 10 },
  { label: 'Parc de la Tête d’Or', capacity: 14 },
  { label: 'Stade municipal', capacity: 22 },
  { label: 'Match contre une autre boîte', capacity: 11 },
];

/** Matchs déjà joués, du plus récent au plus ancien. */
const PAST_MATCHES = [
  { date: new Date(2026, 6, 17, 19, 0), winner: 0, voters: 12 },
  { date: new Date(2026, 6, 10, 19, 0), winner: 1, voters: 9 },
  { date: new Date(2026, 6, 3, 19, 0), winner: 0, voters: 14 },
  { date: new Date(2026, 5, 26, 19, 0), winner: 2, voters: 8 },
];

const HOUR_MS = 60 * 60 * 1000;

/**
 * Réponse d'une personne sur une option, en dur mais variée.
 * Une simple table modulo suffit : le but est d'obtenir un tableau crédible,
 * pas un vrai tirage aléatoire (et ça reste reproductible d'une exécution à l'autre).
 */
const PATTERN: VoteValue[] = ['oui', 'oui', 'si_besoin', 'oui', 'non', 'si_besoin', 'oui', 'non'];
const voteFor = (person: number, option: number) => PATTERN[(person * 3 + option * 5) % PATTERN.length];

async function createMatch(matchDate: Date, voterCount: number, winnerIndex: number | null) {
  const occurrenceKey = occurrenceKeyFor(matchDate);

  if (await prisma.event.findUnique({ where: { occurrenceKey } })) {
    console.log(`— ${occurrenceKey} : déjà présent, ignoré.`);
    return;
  }

  const event = await prisma.event.create({
    data: {
      title: 'Foot du vendredi',
      description: 'Le match hebdo entre collègues.',
      type: 'recurrent',
      matchDate,
      occurrenceKey,
      voteDeadline: new Date(matchDate.getTime() - 25 * HOUR_MS),
      status: winnerIndex === null ? 'ouvert' : 'cloture',
      publicToken: generateToken(),
      organizerToken: generateToken(),
      options: { create: OPTIONS.map((option, index) => ({ ...option, position: index })) },
    },
    include: { options: { orderBy: { position: 'asc' } } },
  });

  for (const [personIndex, name] of TEAM.slice(0, voterCount).entries()) {
    await prisma.participant.create({
      data: {
        eventId: event.id,
        name,
        nameKey: normalizeName(name),
        votes: {
          create: event.options.map((option, optionIndex) => ({
            optionId: option.id,
            value: voteFor(personIndex, optionIndex),
          })),
        },
      },
    });
  }

  if (winnerIndex !== null) {
    await prisma.event.update({
      where: { id: event.id },
      data: { winningOptionId: event.options[winnerIndex].id },
    });
  }

  console.log(`— ${occurrenceKey} : ${voterCount} votants, ${winnerIndex === null ? 'ouvert' : 'clôturé'}.`);
}

console.log('Matchs passés :');
for (const match of PAST_MATCHES) {
  await createMatch(match.date, match.voters, match.winner);
}

// Complète le sondage en cours avec le reste de l'équipe, pour un tableau bien rempli.
const openEvent = await prisma.event.findFirst({
  where: { status: 'ouvert' },
  orderBy: { matchDate: 'asc' },
  include: { options: { orderBy: { position: 'asc' } }, participants: true },
});

if (openEvent) {
  const alreadyVoted = new Set(openEvent.participants.map((participant) => participant.nameKey));
  let added = 0;

  for (const [personIndex, name] of TEAM.entries()) {
    if (alreadyVoted.has(normalizeName(name))) continue;

    await prisma.participant.create({
      data: {
        eventId: openEvent.id,
        name,
        nameKey: normalizeName(name),
        votes: {
          create: openEvent.options.map((option, optionIndex) => ({
            optionId: option.id,
            value: voteFor(personIndex, optionIndex),
          })),
        },
      },
    });
    added += 1;
  }

  console.log(`\nSondage en cours « ${openEvent.title} » : ${added} votant(s) ajouté(s).`);
  console.log(`  Lien de vote        : /e/${openEvent.publicToken}`);
  console.log(`  Lien organisateur   : /manage/${openEvent.organizerToken}`);
}

const template = await prisma.recurrenceTemplate.findFirst({ where: { active: true } });
if (template) console.log(`  Modèle récurrent    : /recurrence/${template.organizerToken}`);

await prisma.$disconnect();
