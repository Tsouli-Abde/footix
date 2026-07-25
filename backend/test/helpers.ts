import { prisma } from '../src/db.js';

/** Vide les tables entre deux tests. L'ordre respecte les clés étrangères. */
export async function resetDb() {
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.recurrenceTemplate.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.activity.deleteMany();
}
