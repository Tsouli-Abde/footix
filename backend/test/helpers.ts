import { prisma } from '../src/db.js';

/**
 * Une date à venir, à midi. Les tests ne peuvent pas utiliser de dates en dur :
 * l'API refuse les matchs déjà passés, ils finiraient par échouer tout seuls.
 */
export function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

/**
 * Un match tout proche : le jour et l'heure d'un coup d'envoi dans une heure.
 *
 * Les deux vont ensemble, parce qu'« dans une heure » à 23 h 30 tombe le
 * lendemain : le jour doit suivre l'heure.
 */
export function inOneHour(): { matchDate: string; matchTime: string } {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    matchDate: date.toISOString(),
    matchTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** Vide les tables entre deux tests. L'ordre respecte les clés étrangères. */
export async function resetDb() {
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.recurrenceTemplate.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.activity.deleteMany();
}
