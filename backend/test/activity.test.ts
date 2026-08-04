import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { inDays, resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/**
 * Les routes annoncent sans attendre (`void announceVoteOpen(...)`) pour ne pas
 * retarder leur réponse : l'écriture dans le fil peut donc atterrir après. Les
 * tests qui datent un repère doivent attendre qu'elle soit là, sinon elle se
 * range du mauvais côté.
 */
async function waitForActivity(type: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await prisma.activity.count({ where: { type } })) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Aucune activité « ${type} » n'est arrivée dans le fil`);
}

async function openEvent() {
  const res = await request.post('/api/events').send({ matchDate: inDays(7) });
  await waitForActivity('vote_ouvert');
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
    await waitForActivity('reponse');

    const res = await request.get(`/api/activity?since=${encodeURIComponent(cutoff)}`);
    // Seule la réponse est postérieure au repère, pas l'ouverture.
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.activities[0].type).toBe('reponse');
  });
});
