import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const subscription = {
  endpoint: 'https://push.example.com/abc123',
  keys: { p256dh: 'cle-publique', auth: 'jeton-auth' },
};

describe('notifications push', () => {
  it('expose l\'état et la clé publique', async () => {
    const res = await request.get('/api/push/key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enabled');
  });

  it('enregistre un abonnement quand le push est configuré, sans doublon', async () => {
    const key = await request.get('/api/push/key');
    if (!key.body.enabled) return; // pas de clés VAPID dans cet environnement de test

    await request.post('/api/push/subscribe').send(subscription).expect(201);
    await request.post('/api/push/subscribe').send(subscription).expect(201);

    expect(await prisma.pushSubscription.count()).toBe(1);
  });

  it('rejette un abonnement mal formé', async () => {
    const key = await request.get('/api/push/key');
    if (!key.body.enabled) return;

    const res = await request.post('/api/push/subscribe').send({ endpoint: 'pas-une-url' });
    expect(res.status).toBe(400);
  });

  it('désinscrit un endpoint', async () => {
    const key = await request.get('/api/push/key');
    if (!key.body.enabled) return;

    await request.post('/api/push/subscribe').send(subscription).expect(201);
    await request.post('/api/push/unsubscribe').send({ endpoint: subscription.endpoint }).expect(200);
    expect(await prisma.pushSubscription.count()).toBe(0);
  });
});
