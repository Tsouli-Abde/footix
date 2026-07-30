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

/** Vide les tables entre deux tests. L'ordre respecte les clés étrangères. */
export async function resetDb() {
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.recurrenceTemplate.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.activity.deleteMany();
}
