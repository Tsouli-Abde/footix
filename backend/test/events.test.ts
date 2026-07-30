import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { inDays, resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** Crée un sondage et renvoie sa vue organisateur. */
async function createEvent(body: Record<string, unknown> = { matchDate: inDays(7) }) {
  const res = await request.post('/api/events').send(body);
  return res;
}

describe('création de sondage', () => {
  it('la date suffit, le titre par défaut est nul (la date sert d\'intitulé)', async () => {
    const res = await createEvent({ matchDate: inDays(7) });
    expect(res.status).toBe(201);
    expect(res.body.event.title).toBeNull();
    expect(res.body.event.publicToken).toBeTruthy();
    expect(res.body.event.organizerToken).toBeTruthy();
  });

  it('cale le match à midi et déduit la deadline par défaut', async () => {
    const res = await createEvent({ matchDate: inDays(7) });
    // Heure locale plutôt qu'UTC : le décalage change entre été et hiver.
    expect(new Date(res.body.event.matchDate).getHours()).toBe(12);
    expect(res.body.event.hasTime).toBe(false);
    expect(new Date(res.body.event.voteDeadline) < new Date(res.body.event.matchDate)).toBe(true);
  });

  it('garde l’heure quand l’organisateur en fixe une', async () => {
    const res = await createEvent({ matchDate: inDays(7), matchTime: '18:30' });
    expect(res.status).toBe(201);
    expect(new Date(res.body.event.matchDate).getHours()).toBe(18);
    expect(new Date(res.body.event.matchDate).getMinutes()).toBe(30);
    expect(res.body.event.hasTime).toBe(true);
  });

  it('retient le prénom de l’organisateur', async () => {
    const res = await createEvent({ matchDate: inDays(7), organizerName: 'Tsouli' });
    expect(res.body.event.organizerName).toBe('Tsouli');
  });

  it('refuse un match déjà passé', async () => {
    const res = await createEvent({ matchDate: inDays(-3) });
    expect(res.status).toBe(400);
  });

  it('refuse un deuxième sondage le même jour et renvoie l\'existant', async () => {
    const first = await createEvent({ matchDate: inDays(7), title: 'Le vrai' });
    const clash = await createEvent({ matchDate: inDays(7), title: 'Le doublon' });

    expect(clash.status).toBe(409);
    expect(clash.body.details.event.publicToken).toBe(first.body.event.publicToken);
  });

  it('rejette une deadline postérieure au match', async () => {
    const res = await createEvent({ matchDate: inDays(7), voteDeadline: inDays(8) });
    expect(res.status).toBe(400);
  });

  it('sépare les sondages ouverts de l\'historique', async () => {
    await createEvent({ matchDate: inDays(7) });
    const created = await createEvent({ matchDate: inDays(14) });
    await request.post(`/api/manage/${created.body.event.organizerToken}/close`).send({ chosenVenue: 'five' });

    const ouverts = await request.get('/api/events?status=ouvert');
    const clotures = await request.get('/api/events?status=cloture');
    expect(ouverts.body.events).toHaveLength(1);
    expect(clotures.body.events).toHaveLength(1);
    expect(clotures.body.events[0].chosenVenue.id).toBe('five');
  });
});

describe('sondage introuvable', () => {
  it('renvoie 404 sur un token public inconnu', async () => {
    const res = await request.get('/api/events/nimportequoi');
    expect(res.status).toBe(404);
  });
});
