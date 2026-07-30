import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { inDays, resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function openEvent() {
  const res = await request.post('/api/events').send({ matchDate: inDays(7) });
  return res.body.event as { publicToken: string; organizerToken: string };
}

describe('gestion organisateur', () => {
  it('refuse un lien organisateur inconnu', async () => {
    const res = await request.get('/api/manage/inexistant');
    expect(res.status).toBe(404);
  });

  it('clôture avec un lieu retenu', async () => {
    const event = await openEvent();
    const res = await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'sceaux' });

    expect(res.body.event.status).toBe('cloture');
    expect(res.body.event.chosenVenue.id).toBe('sceaux');
    expect(res.body.event.votingOpen).toBe(false);
  });

  it('enregistre puis efface le score', async () => {
    const event = await openEvent();
    await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'five' });

    const withScore = await request
      .patch(`/api/manage/${event.organizerToken}/result`)
      .send({ score: '5-3', resultNote: 'Serré.' });
    expect(withScore.body.event.score).toBe('5-3');

    // Le score est visible côté public.
    const publicView = await request.get(`/api/events/${event.publicToken}`);
    expect(publicView.body.event.score).toBe('5-3');
  });

  it('rouvrir remet à zéro le lieu et le score', async () => {
    const event = await openEvent();
    await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'five' });
    await request.patch(`/api/manage/${event.organizerToken}/result`).send({ score: '5-3' });

    const reopened = await request.post(`/api/manage/${event.organizerToken}/reopen`);
    expect(reopened.body.event.status).toBe('ouvert');
    expect(reopened.body.event.chosenVenue).toBeNull();
    expect(reopened.body.event.score).toBeNull();
  });

  it('modifie le titre et le remet à nul quand on le vide', async () => {
    const event = await openEvent();

    const named = await request.patch(`/api/manage/${event.organizerToken}`).send({ title: 'Match spécial' });
    expect(named.body.event.title).toBe('Match spécial');

    const cleared = await request.patch(`/api/manage/${event.organizerToken}`).send({ title: '' });
    expect(cleared.body.event.title).toBeNull();
  });

  it('supprime le sondage', async () => {
    const event = await openEvent();
    const del = await request.delete(`/api/manage/${event.organizerToken}`);
    expect(del.status).toBe(204);

    const gone = await request.get(`/api/events/${event.publicToken}`);
    expect(gone.status).toBe(404);
  });
});
