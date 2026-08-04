import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { generateToken, occurrenceKeyFor } from '../src/domain.js';
import { autoCloseDueEvents } from '../src/reminders.js';
import { resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const HOUR_MS = 60 * 60 * 1000;

/**
 * Crée un sondage dont le coup d'envoi est dans quelques heures. On passe par
 * Prisma pour maîtriser la clé d'occurrence, unique par jour.
 */
async function eventInHours(hours: number) {
  const matchDate = new Date(Date.now() + hours * HOUR_MS);
  return prisma.event.create({
    data: {
      matchDate,
      occurrenceKey: `${occurrenceKeyFor(matchDate)}-${hours}`,
      publicToken: generateToken(),
      organizerToken: generateToken(),
    },
  });
}

/**
 * Le job qui tourne une fois le match commencé. On pilote l'horloge plutôt que
 * de créer un sondage dans le passé : l'API refuse de répondre à un match passé,
 * les tests n'auraient pas pu voter avant la clôture.
 */
const justAfterKickoff = (event: { matchDate: Date }) => new Date(event.matchDate.getTime() + 60_000);

describe('clôture automatique', () => {
  it('laisse ouvert tant que le match n’a pas commencé', async () => {
    await eventInHours(2);
    expect(await autoCloseDueEvents()).toHaveLength(0);
  });

  it('clôture une fois le coup d’envoi passé', async () => {
    const event = await eventInHours(2);
    const closed = await autoCloseDueEvents(justAfterKickoff(event));

    expect(closed).toHaveLength(1);
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.status).toBe('cloture');
  });

  it('retient le lieu que l’app conseillait', async () => {
    const event = await eventInHours(2);
    for (let i = 0; i < 8; i++) {
      await request.post(`/api/events/${event.publicToken}/answers`).send({ name: `Joueur${i}`, availability: 'oui' });
    }

    await autoCloseDueEvents(justAfterKickoff(event));
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.chosenVenue).toBe('five');
  });

  it('retient le parc quand des joueurs n’y venaient que là', async () => {
    const event = await eventInHours(2);
    const answer = (name: string, availability: string) =>
      request.post(`/api/events/${event.publicToken}/answers`).send({ name, availability });

    for (let i = 0; i < 6; i++) await answer(`Joueur${i}`, 'oui');
    for (let i = 0; i < 4; i++) await answer(`Parc${i}`, 'si_sceaux');

    await autoCloseDueEvents(justAfterKickoff(event));
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.chosenVenue).toBe('sceaux');
  });

  it('ne retient aucun lieu quand personne ne vient', async () => {
    const event = await eventInHours(1);
    await autoCloseDueEvents(justAfterKickoff(event));
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.status).toBe('cloture');
    expect(after.chosenVenue).toBeNull();
  });

  it('reste silencieuse : aucune trace dans le fil, aucune notification', async () => {
    const event = await eventInHours(2);
    const before = await prisma.activity.count();
    await autoCloseDueEvents(justAfterKickoff(event));
    expect(await prisma.activity.count()).toBe(before);
  });

  it('ne rouvre ni ne retouche un sondage déjà clôturé', async () => {
    const event = await eventInHours(2);
    await prisma.event.update({ where: { id: event.id }, data: { status: 'cloture', chosenVenue: 'sceaux' } });

    const closed = await autoCloseDueEvents(justAfterKickoff(event));
    expect(closed).toHaveLength(0);
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.chosenVenue).toBe('sceaux');
  });
});
