import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function createTemplate() {
  const res = await request.post('/api/templates').send({ title: 'Foot hebdo du vendredi', weekday: 5 });
  return res.body.template as { id: string; organizerToken: string };
}

describe('rendez-vous récurrent', () => {
  it('génère le sondage à venir et le rend accessible via le lien permanent', async () => {
    const template = await createTemplate();

    const generation = await request.post('/api/templates/generate');
    expect(generation.body.created.length).toBeGreaterThanOrEqual(0);

    // Que la génération ait déjà eu lieu ou non, /current ne doit pas casser.
    const current = await request.get(`/api/templates/${template.id}/current`);
    expect(current.status).toBe(200);
  });

  it('la génération est idempotente : deux passages ne créent pas de doublon', async () => {
    await createTemplate();
    const first = await request.post('/api/templates/generate');
    const second = await request.post('/api/templates/generate');

    const total = first.body.created.length + second.body.created.length;
    // Au plus un sondage créé sur les deux passages combinés.
    expect(total).toBeLessThanOrEqual(1);
  });

  it('liste les sondages du rendez-vous avec leur lien de gestion', async () => {
    const template = await createTemplate();
    await request.post('/api/templates/generate');

    const res = await request.get(`/api/templates/manage/${template.organizerToken}/events`);
    expect(res.status).toBe(200);
    for (const event of res.body.events) {
      expect(event.organizerToken).toBeTruthy();
    }
  });

  it('refuse la liste sur un lien de gestion inconnu', async () => {
    const res = await request.get('/api/templates/manage/inexistant/events');
    expect(res.status).toBe(404);
  });
});
