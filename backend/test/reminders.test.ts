import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { sendDueReminders } from '../src/reminders.js';
import { inDays, resetDb } from './helpers.js';

const request = supertest(createApp());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** Un sondage dont le match a lieu demain, donc dans la fenêtre du rappel. */
async function eventTomorrow() {
  const res = await request.post('/api/events').send({ matchDate: inDays(1) });
  return res.body.event as { publicToken: string; organizerToken: string };
}

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

    const result = await sendDueReminders();
    expect(result.sent).toHaveLength(1);
    expect(result.sent[0].message).toContain('Le Five');
  });

  it('prévient quand personne n’a répondu', async () => {
    await eventTomorrow();
    const result = await sendDueReminders();
    expect(result.sent[0].message).toContain('Personne');
  });

  it('ne renvoie pas deux fois le même rappel', async () => {
    await eventTomorrow();
    await sendDueReminders();
    const second = await sendDueReminders();
    expect(second.sent).toHaveLength(0);
  });

  it('laisse une trace dans le fil d’activité', async () => {
    const event = await eventTomorrow();
    for (let i = 0; i < 13; i++) await answer(event.publicToken, `Joueur${i}`, 'oui');
    await sendDueReminders();

    const feed = await request.get('/api/activity');
    const reminder = feed.body.activities.find((a: { type: string }) => a.type === 'rappel');
    expect(reminder).toBeTruthy();
    expect(reminder.body).toContain('Parc de Sceaux');
  });
});
