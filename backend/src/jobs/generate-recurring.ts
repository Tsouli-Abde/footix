/**
 * Job de récurrence : crée les événements hebdomadaires dont l'échéance approche.
 *
 * Lancé une fois par jour (CronJob Kubernetes ou `npm run generate-recurring`).
 * L'opération est idempotente, le relancer ne crée pas de doublon.
 */
import '../env.js'; // doit rester en premier : charge .env avant tout le reste
import { prisma } from '../db.js';
import { generateDueEvents } from '../recurrence.js';

const result = await generateDueEvents();

for (const created of result.created) {
  console.log(`Créé : événement ${created.eventId} le ${created.matchDate} (token ${created.publicToken})`);
}
for (const skipped of result.skipped) {
  console.log(`Ignoré : modèle ${skipped.templateId}, ${skipped.reason}`);
}
console.log(`${result.created.length} événement(s) créé(s), ${result.skipped.length} ignoré(s).`);

await prisma.$disconnect();
