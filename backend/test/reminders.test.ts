import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { autoCloseDueEvents, sendDueReminders } from '../src/reminders.js';
import { inDays, resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const HOUR_MS = 60 * 60 * 1000;

/**
 * Un sondage dont le match a lieu demain à midi.
 *
 * On renvoie aussi `matchDate` : les tests pilotent l'horloge à partir de là,
 * plutôt que de compter sur l'heure réelle. Sans ça, la fenêtre du rappel (les
 * 24 h avant le match) ne contiendrait un match de demain midi que si la suite
 * tourne elle-même après midi.
 */
async function eventTomorrow() {
  const res = await request.post('/api/events').send({ matchDate: inDays(1) });
  const event = res.body.event as { publicToken: string; organizerToken: string; matchDate: string };
  return { ...event, matchDate: new Date(event.matchDate) };
}

/** Un moment situé quelques heures avant le match, donc dans la fenêtre du rappel. */
const shortlyBefore = (matchDate: Date, hours = 3) => new Date(matchDate.getTime() - hours * HOUR_MS);

async function answer(publicToken: string, name: string, availability: string) {
  return request.post(`/api/events/${publicToken}/answers`).send({ name, availability });
}

describe('récapitulatif de la veille', () => {
  it('n’envoie rien pour un match encore lointain', async () => {
    await request.post('/api/events').send({ matchDate: inDays(10) });
    const result = await sendDueReminders();
    expect(result.sent).toHaveLength(0);
  });

  it('annonce le lieu quand il y a assez de monde', async () => {
    const event = await eventTomorrow();
    for (let i = 0; i < 8; i++) await answer(event.publicToken, `Joueur${i}`, 'oui');

    const result = await sendDueReminders(shortlyBefore(event.matchDate));
    expect(result.sent).toHaveLength(1);
    expect(result.sent[0].message).toContain('Le Five');
  });

  it('annonce le parc quand des joueurs n’y viennent que là', async () => {
    const event = await eventTomorrow();
    for (let i = 0; i < 5; i++) await answer(event.publicToken, `Joueur${i}`, 'oui');
    for (let i = 0; i < 4; i++) await answer(event.publicToken, `Parc${i}`, 'si_sceaux');

    const result = await sendDueReminders(shortlyBefore(event.matchDate));
    expect(result.sent[0].message).toContain('Parc de Sceaux');
    expect(result.sent[0].message).toContain('9 joueurs');
  });

  it('prévient quand personne n’a répondu', async () => {
    const event = await eventTomorrow();
    const result = await sendDueReminders(shortlyBefore(event.matchDate));
    expect(result.sent[0].message).toContain('Personne');
  });

  it('ne renvoie pas deux fois le même rappel', async () => {
    const event = await eventTomorrow();
    const now = shortlyBefore(event.matchDate);
    await sendDueReminders(now);
    const second = await sendDueReminders(now);
    expect(second.sent).toHaveLength(0);
  });

  it('laisse une trace dans le fil d’activité', async () => {
    const event = await eventTomorrow();
    for (let i = 0; i < 13; i++) await answer(event.publicToken, `Joueur${i}`, 'oui');
    await sendDueReminders(shortlyBefore(event.matchDate));

    const feed = await request.get('/api/activity');
    const reminder = feed.body.activities.find((a: { type: string }) => a.type === 'rappel');
    expect(reminder).toBeTruthy();
    expect(reminder.body).toContain('Parc de Sceaux');
  });
});

describe('clôture automatique', () => {
  it('ne touche pas aux sondages dont le match n’a pas eu lieu', async () => {
    await eventTomorrow();
    const closed = await autoCloseDueEvents();
    expect(closed).toHaveLength(0);
  });
});
