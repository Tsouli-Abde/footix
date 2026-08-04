import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_HEADER } from '../src/admin.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { inDays, resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** Le mot de passe par défaut, celui que les tests utilisent. */
const PASSWORD = 'motusadmin';

const asAdmin = (password = PASSWORD) => ({ [ADMIN_HEADER]: password });

async function openEvent(days = 7) {
  const res = await request.post('/api/events').send({ matchDate: inDays(days) });
  return res.body.event as { publicToken: string; organizerToken: string };
}

const answer = (publicToken: string, name: string, availability: string) =>
  request.post(`/api/events/${publicToken}/answers`).send({ name, availability });

describe('accès à la vue admin', () => {
  it('refuse sans mot de passe', async () => {
    expect((await request.get('/api/admin/stats')).status).toBe(401);
  });

  it('refuse un mauvais mot de passe', async () => {
    expect((await request.get('/api/admin/stats').set(asAdmin('motus'))).status).toBe(401);
  });

  it('refuse un mot de passe vide', async () => {
    expect((await request.get('/api/admin/stats').set(asAdmin(''))).status).toBe(401);
  });

  it('accepte le bon mot de passe', async () => {
    expect((await request.post('/api/admin/login').set(asAdmin())).status).toBe(200);
  });

  it('protège toutes les routes admin, pas seulement la connexion', async () => {
    const routes = [
      request.get('/api/admin/events'),
      request.get('/api/admin/players'),
      request.get('/api/admin/subscriptions'),
      request.post('/api/admin/tick'),
      request.delete('/api/admin/activity'),
      request.delete('/api/admin/players/quiconque'),
    ];
    for (const res of await Promise.all(routes)) expect(res.status).toBe(401);
  });
});

describe('statistiques', () => {
  it('compte les sondages, les joueurs et les réponses', async () => {
    const event = await openEvent();
    await answer(event.publicToken, 'Tsouli', 'oui');
    await answer(event.publicToken, 'Sarah', 'si_sceaux');
    await answer(event.publicToken, 'Hugo', 'non');

    const res = await request.get('/api/admin/stats').set(asAdmin());
    expect(res.body.events.total).toBe(1);
    expect(res.body.events.open).toBe(1);
    expect(res.body.players.total).toBe(3);
    expect(res.body.answers).toEqual({ oui: 1, si_besoin: 0, si_sceaux: 1, non: 1 });
  });

  it('sépare les matchs joués des matchs annulés', async () => {
    const joue = await openEvent(7);
    const annule = await openEvent(14);
    await request.post(`/api/manage/${joue.organizerToken}/close`).send({ chosenVenue: 'five' });
    await request.post(`/api/manage/${annule.organizerToken}/close`).send({ chosenVenue: null });

    const res = await request.get('/api/admin/stats').set(asAdmin());
    expect(res.body.events.closed).toBe(2);
    expect(res.body.events.played).toBe(1);
    expect(res.body.events.cancelled).toBe(1);
    expect(res.body.venues.find((v: { venueId: string }) => v.venueId === 'five').count).toBe(1);
  });

  it('donne la moyenne de présents sur les matchs joués', async () => {
    const event = await openEvent();
    for (let i = 0; i < 4; i++) await answer(event.publicToken, `Joueur${i}`, 'oui');
    await answer(event.publicToken, 'Absent', 'non');
    await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'five' });

    const res = await request.get('/api/admin/stats').set(asAdmin());
    expect(res.body.attendance.averagePresent).toBe(4);
    expect(res.body.attendance.bestMatch).toBe(4);
  });
});

describe('liste des sondages', () => {
  it('renvoie les tokens de gestion, pour agir sans route dédiée', async () => {
    const event = await openEvent();
    const res = await request.get('/api/admin/events').set(asAdmin());

    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].organizerToken).toBe(event.organizerToken);
    expect(res.body.events[0].publicToken).toBe(event.publicToken);
  });

  it('inclut aussi les sondages clôturés', async () => {
    const event = await openEvent();
    await request.post(`/api/manage/${event.organizerToken}/close`).send({ chosenVenue: 'five' });

    const res = await request.get('/api/admin/events').set(asAdmin());
    expect(res.body.events[0].status).toBe('cloture');
  });
});

describe('gestion des joueurs', () => {
  it('agrège les réponses par joueur, tous sondages confondus', async () => {
    const premier = await openEvent(7);
    const second = await openEvent(14);
    await answer(premier.publicToken, 'Tsouli', 'oui');
    await answer(second.publicToken, 'Tsouli', 'si_besoin');
    await answer(premier.publicToken, 'Sarah', 'oui');

    const res = await request.get('/api/admin/players').set(asAdmin());
    const tsouli = res.body.players.find((p: { name: string }) => p.name === 'Tsouli');

    expect(res.body.players).toHaveLength(2);
    expect(tsouli.answers).toBe(2);
    expect(tsouli.counts).toEqual({ oui: 1, si_besoin: 1, si_sceaux: 0, non: 0 });
  });

  it('reconnaît le même joueur malgré la casse et les accents', async () => {
    const premier = await openEvent(7);
    const second = await openEvent(14);
    await answer(premier.publicToken, 'Élodie', 'oui');
    await answer(second.publicToken, 'elodie', 'oui');

    const res = await request.get('/api/admin/players').set(asAdmin());
    expect(res.body.players).toHaveLength(1);
    expect(res.body.players[0].answers).toBe(2);
  });

  it('renomme un joueur dans tous les sondages', async () => {
    const premier = await openEvent(7);
    const second = await openEvent(14);
    await answer(premier.publicToken, 'Sarahh', 'oui');
    await answer(second.publicToken, 'Sarahh', 'oui');

    const res = await request.patch('/api/admin/players/sarahh').set(asAdmin()).send({ name: 'Sarah' });
    expect(res.status).toBe(200);
    expect(res.body.renamed).toBe(2);

    const players = await request.get('/api/admin/players').set(asAdmin());
    expect(players.body.players).toHaveLength(1);
    expect(players.body.players[0].name).toBe('Sarah');
    expect(players.body.players[0].nameKey).toBe('sarah');
  });

  it('fusionne quand le nouveau prénom existe déjà sur le même sondage', async () => {
    const event = await openEvent();
    await answer(event.publicToken, 'Sarah', 'oui');
    await answer(event.publicToken, 'Sarahh', 'non');

    const res = await request.patch('/api/admin/players/sarahh').set(asAdmin()).send({ name: 'Sarah' });
    expect(res.status).toBe(200);
    expect(res.body.merged).toBe(1);

    // Une seule réponse subsiste sur ce sondage, la plus récente.
    const view = await request.get(`/api/events/${event.publicToken}`);
    expect(view.body.event.participants).toHaveLength(1);
    expect(view.body.event.counts.non).toBe(1);
  });

  it('refuse un prénom illisible', async () => {
    const event = await openEvent();
    await answer(event.publicToken, 'Tsouli', 'oui');

    const res = await request.patch('/api/admin/players/tsouli').set(asAdmin()).send({ name: '***' });
    expect(res.status).toBe(400);
  });

  it('signale un joueur inconnu', async () => {
    const res = await request.patch('/api/admin/players/fantome').set(asAdmin()).send({ name: 'Réel' });
    expect(res.status).toBe(404);
  });

  it('retire un joueur de tous les sondages', async () => {
    const premier = await openEvent(7);
    const second = await openEvent(14);
    await answer(premier.publicToken, 'Doublon', 'oui');
    await answer(second.publicToken, 'Doublon', 'oui');

    const res = await request.delete('/api/admin/players/doublon').set(asAdmin());
    expect(res.body.removed).toBe(2);
    expect((await request.get('/api/admin/players').set(asAdmin())).body.players).toHaveLength(0);
  });
});

describe('maintenance', () => {
  it('vide le fil d’activité', async () => {
    await openEvent();
    const res = await request.delete('/api/admin/activity').set(asAdmin());
    expect(res.status).toBe(200);
    expect(await prisma.activity.count()).toBe(0);
  });

  it('liste les abonnements push sans exposer l’endpoint complet', async () => {
    await prisma.pushSubscription.create({
      data: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/tres-long-secret-12345678',
        p256dh: 'cle',
        auth: 'auth',
      },
    });

    const res = await request.get('/api/admin/subscriptions').set(asAdmin());
    expect(res.body.subscriptions).toHaveLength(1);
    expect(res.body.subscriptions[0].host).toBe('fcm.googleapis.com');
    expect(JSON.stringify(res.body)).not.toContain('tres-long-secret');
  });

  it('supprime un abonnement push', async () => {
    const subscription = await prisma.pushSubscription.create({
      data: { endpoint: 'https://exemple.test/abonnement', p256dh: 'cle', auth: 'auth' },
    });

    expect((await request.delete(`/api/admin/subscriptions/${subscription.id}`).set(asAdmin())).status).toBe(204);
    expect(await prisma.pushSubscription.count()).toBe(0);
  });

  it('lance le battement horaire à la demande', async () => {
    const res = await request.post('/api/admin/tick').set(asAdmin());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reminders)).toBe(true);
    expect(Array.isArray(res.body.closed)).toBe(true);
  });
});
