import { Router } from 'express';
import { prisma } from '../db.js';
import { generateToken } from '../domain.js';
import { notFound, route } from '../http.js';
import { generateDueEvents, nextMatchDate } from '../recurrence.js';
import { createTemplateSchema, updateTemplateSchema } from '../schemas.js';
import { serializeTemplate, serializeTemplateForOrganizer } from '../serializers.js';

export const templatesRouter = Router();

/** Modèles actifs, avec la date du prochain sondage qu'ils vont produire. */
templatesRouter.get(
  '/templates',
  route(async (_req, res) => {
    const templates = await prisma.recurrenceTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      templates: templates.map((template) => ({
        ...serializeTemplate(template),
        nextMatchDate: nextMatchDate(template).toISOString(),
      })),
    });
  }),
);

templatesRouter.post(
  '/templates',
  route(async (req, res) => {
    const input = createTemplateSchema.parse(req.body);

    const template = await prisma.recurrenceTemplate.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        weekday: input.weekday,
        deadlineHoursBefore: input.deadlineHoursBefore,
        leadTimeDays: input.leadTimeDays,
        organizerToken: generateToken(),
      },
    });

    res.status(201).json({ template: serializeTemplateForOrganizer(template) });
  }),
);

/** Comme pour un sondage, le token d'URL tient lieu d'autorisation. */
templatesRouter.get(
  '/templates/manage/:organizerToken',
  route(async (req, res) => {
    const template = await prisma.recurrenceTemplate.findUnique({
      where: { organizerToken: req.params.organizerToken },
    });
    if (!template) throw notFound('Lien de gestion invalide');

    res.json({
      template: { ...serializeTemplateForOrganizer(template), nextMatchDate: nextMatchDate(template).toISOString() },
    });
  }),
);

templatesRouter.patch(
  '/templates/manage/:organizerToken',
  route(async (req, res) => {
    const template = await prisma.recurrenceTemplate.findUnique({
      where: { organizerToken: req.params.organizerToken },
    });
    if (!template) throw notFound('Lien de gestion invalide');

    const input = updateTemplateSchema.parse(req.body);

    const updated = await prisma.recurrenceTemplate.update({
      where: { id: template.id },
      data: {
        title: input.title ?? undefined,
        description: input.description === undefined ? undefined : input.description,
        weekday: input.weekday ?? undefined,
        deadlineHoursBefore: input.deadlineHoursBefore ?? undefined,
        leadTimeDays: input.leadTimeDays ?? undefined,
        active: input.active ?? undefined,
      },
    });

    res.json({
      template: { ...serializeTemplateForOrganizer(updated), nextMatchDate: nextMatchDate(updated).toISOString() },
    });
  }),
);

/**
 * Déclenche à la main la génération que le cron fait chaque jour.
 * Pratique pour tester la récurrence sans attendre, ou rattraper un job manqué.
 */
templatesRouter.post(
  '/templates/generate',
  route(async (_req, res) => {
    res.json(await generateDueEvents());
  }),
);
