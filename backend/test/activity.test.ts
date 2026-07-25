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

describe('fil d\'activité', () => {
  it('consigne l\'ouverture d\'un sondage', async () => {
    const event = await openEvent();
    const res = await request.get('/api/activity');

    const opened = res.body.activities.find((a: { type: string }) => a.type === 'vote_ouvert');
    expect(opened).toBeTruthy();
    expect(opened.url).toBe(`/e/${event.publicToken}`);
  });

  it('consigne une réponse avec le prénom et la dispo', async () => {
    const event = await openEvent();
    await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Tsouli', availability: 'oui' });

    const res = await request.get('/api/activity');
    const answer = res.body.activities.find((a: { type: string }) => a.type === 'reponse');
    expect(answer.body).toContain('Tsouli');
    expect(answer.body).toContain('vient');
  });

  it('consigne la clôture avec le lieu retenu', async () => {
    const event = await openEvent();
    await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'sceaux' });

    const res = await request.get('/api/activity');
    const closed = res.body.activities.find((a: { type: string }) => a.type === 'cloture');
    expect(closed.body).toContain('Parc de Sceaux');
  });

  it('ne renvoie que les nouveautés avec ?since', async () => {
    const event = await openEvent();
    const cutoff = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 10));
    await request.post(`/api/events/${event.publicToken}/answers`).send({ name: 'Sarah', availability: 'non' });

    const res = await request.get(`/api/activity?since=${encodeURIComponent(cutoff)}`);
    // Seule la réponse est postérieure au repère, pas l'ouverture.
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.activities[0].type).toBe('reponse');
  });
});
