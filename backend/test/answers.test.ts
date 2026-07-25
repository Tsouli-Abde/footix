import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function openEvent() {
  const res = await request.post('/api/events').send({ matchDate: '2026-08-07' });
  return res.body.event as { publicToken: string; organizerToken: string };
}

describe('réponses', () => {
  it('enregistre une réponse et met à jour les compteurs', async () => {
    const event = await openEvent();
    const res = await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Tsouli', availability: 'oui' });

    expect(res.status).toBe(201);
    expect(res.body.event.counts.oui).toBe(1);
    expect(res.body.event.participants).toHaveLength(1);
  });

  it('remplace la réponse quand le même prénom revient (casse et accents ignorés)', async () => {
    const event = await openEvent();
    await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Élodie', availability: 'oui' });
    const res = await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'elodie', availability: 'non' });

    expect(res.body.event.participants).toHaveLength(1);
    expect(res.body.event.counts.oui).toBe(0);
    expect(res.body.event.counts.non).toBe(1);
  });

  it('rejette une disponibilité invalide', async () => {
    const event = await openEvent();
    const res = await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Tsouli', availability: 'peut-etre' });
    expect(res.status).toBe(400);
  });

  it('refuse de répondre une fois le sondage clôturé', async () => {
    const event = await openEvent();
    await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'five' });

    const res = await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Retardataire', availability: 'oui' });
    expect(res.status).toBe(409);
  });

  it('permet de retirer un participant', async () => {
    const event = await openEvent();
    const added = await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Faux', availability: 'oui' });
    const participantId = added.body.participantId;

    const res = await request.delete(`/api/events/${event.publicToken}/answers/${participantId}`);
    expect(res.status).toBe(200);
    expect(res.body.event.participants).toHaveLength(0);
  });
});

describe('recommandation selon les réponses', () => {
  it('passe de "il manque du monde" au Five puis au Parc de Sceaux', async () => {
    const event = await openEvent();

    const answer = (name: string) =>
      request.post(`/api/events/${event.publicToken}/answers`).send({ name, availability: 'oui' });

    let last;
    for (let i = 0; i < 12; i++) last = await answer(`Joueur${i}`);

    expect(last!.body.event.counts.oui).toBe(12);
    expect(last!.body.event.recommendation.venue.id).toBe('sceaux');
  });
});
