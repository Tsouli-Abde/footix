import type { RecurrenceTemplate } from '@prisma/client';
import { prisma } from './db.js';
import { generateToken, MATCH_HOUR, occurrenceKeyFor } from './domain.js';
import { notifyEventOpen } from './push.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Prochaine date de match d'un modèle : le prochain `weekday` à midi, après `from`. */
export function nextMatchDate(template: { weekday: number }, from = new Date()): Date {
  const candidate = new Date(from);
  candidate.setHours(MATCH_HOUR, 0, 0, 0);
  candidate.setDate(candidate.getDate() + ((template.weekday - candidate.getDay() + 7) % 7));

  // Le bon jour mais l'heure est passée, on vise la semaine suivante.
  if (candidate.getTime() <= from.getTime()) candidate.setDate(candidate.getDate() + 7);

  return candidate;
}

export type GenerationResult = {
  created: { templateId: string; eventId: string; matchDate: string; publicToken: string }[];
  skipped: { templateId: string; reason: string }[];
};

/**
 * Crée les sondages dont l'échéance approche.
 *
 * Idempotent : relancer le job ne produit pas de doublon, l'unicité de
 * `occurrenceKey` et la vérification préalable s'en chargent. C'est ce qui
 * permet de le planifier aussi souvent qu'on veut, une fois par jour suffit.
 */
export async function generateDueEvents(now = new Date()): Promise<GenerationResult> {
  const templates = await prisma.recurrenceTemplate.findMany({ where: { active: true } });
  const result: GenerationResult = { created: [], skipped: [] };

  for (const template of templates) {
    const matchDate = nextMatchDate(template, now);

    if (matchDate.getTime() - now.getTime() > template.leadTimeDays * DAY_MS) {
      result.skipped.push({ templateId: template.id, reason: 'échéance encore trop lointaine' });
      continue;
    }

    const occurrenceKey = occurrenceKeyFor(matchDate);
    if (await prisma.event.findUnique({ where: { occurrenceKey } })) {
      result.skipped.push({ templateId: template.id, reason: `sondage déjà présent le ${occurrenceKey}` });
      continue;
    }

    const event = await createEventFromTemplate(template, matchDate, occurrenceKey);
    await notifyEventOpen(event);
    result.created.push({
      templateId: template.id,
      eventId: event.id,
      matchDate: matchDate.toISOString(),
      publicToken: event.publicToken,
    });
  }

  return result;
}

async function createEventFromTemplate(template: RecurrenceTemplate, matchDate: Date, occurrenceKey: string) {
  return prisma.event.create({
    data: {
      title: template.title,
      description: template.description,
      type: 'recurrent',
      matchDate,
      occurrenceKey,
      voteDeadline: new Date(matchDate.getTime() - template.deadlineHoursBefore * HOUR_MS),
      publicToken: generateToken(),
      organizerToken: generateToken(),
      recurrenceTemplateId: template.id,
    },
  });
}
