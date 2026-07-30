import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { atMatchHour, generateToken, occurrenceKeyFor } from '../src/domain.js';
import { autoCloseDueEvents } from '../src/reminders.js';
import { resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/**
 * Crée un sondage dont le coup d'envoi est tout proche. On passe par Prisma :
 * l'API refuse volontairement les dates trop rapprochées ou passées.
 */
async function eventInHours(hours: number) {
  const matchDate = new Date(Date.now() + hours * 60 * 60 * 1000);
  return prisma.event.create({
    data: {
      matchDate,
      occurrenceKey: occurrenceKeyFor(matchDate) + `-${hours}`,
      voteDeadline: new Date(Date.now() + 30 * 60 * 1000),
      publicToken: generateToken(),
      organizerToken: generateToken(),
    },
  });
}

describe('clôture automatique', () => {
  it('clôture les sondages oubliés à l’approche du match', async () => {
    const event = await eventInHours(2);
    const closed = await autoCloseDueEvents();

    expect(closed).toHaveLength(1);
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.status).toBe('cloture');
  });

  it('retient le lieu que l’app conseillait', async () => {
    const event = await eventInHours(2);
    for (let i = 0; i < 8; i++) {
      await request.post(`/api/events/${event.publicToken}/answers`).send({ name: `Joueur${i}`, availability: 'oui' });
    }

    await autoCloseDueEvents();
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.chosenVenue).toBe('five');
  });

  it('ne retient aucun lieu quand personne ne vient', async () => {
    const event = await eventInHours(1);
    await autoCloseDueEvents();
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.status).toBe('cloture');
    expect(after.chosenVenue).toBeNull();
  });

  it('reste silencieuse : aucune trace dans le fil', async () => {
    await eventInHours(2);
    const before = await prisma.activity.count();
    await autoCloseDueEvents();
    expect(await prisma.activity.count()).toBe(before);
  });

  it('ne rouvre ni ne retouche un sondage déjà clôturé', async () => {
    const event = await eventInHours(2);
    await prisma.event.update({ where: { id: event.id }, data: { status: 'cloture', chosenVenue: 'sceaux' } });

    const closed = await autoCloseDueEvents();
    expect(closed).toHaveLength(0);
    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.chosenVenue).toBe('sceaux');
  });
});
