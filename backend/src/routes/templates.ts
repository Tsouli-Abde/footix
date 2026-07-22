import { Router } from 'express';
import { prisma } from '../db.js';
import { generateToken } from '../domain.js';
import { notFound, route } from '../http.js';
import { generateDueEvents, nextMatchDate } from '../recurrence.js';
import { createTemplateSchema, updateTemplateSchema } from '../schemas.js';
import { serializeTemplate, serializeTemplateForOrganizer, templateInclude } from '../serializers.js';

export const templatesRouter = Router();

/** Modèles récurrents actifs, avec la date du prochain match qu'ils produiront. */
templatesRouter.get(
  '/templates',
  route(async (_req, res) => {
    const templates = await prisma.recurrenceTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      include: templateInclude,
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
        matchTime: input.matchTime,
        deadlineHoursBefore: input.deadlineHoursBefore,
        leadTimeDays: input.leadTimeDays,
        organizerToken: generateToken(),
        options: {
          create: input.options.map((option, index) => ({
            label: option.label,
            capacity: option.capacity ?? null,
            position: index,
          })),
        },
      },
      include: templateInclude,
    });

    res.status(201).json({ template: serializeTemplateForOrganizer(template) });
  }),
);

/** Comme pour un événement, le token d'URL tient lieu d'autorisation. */
templatesRouter.get(
  '/templates/manage/:organizerToken',
  route(async (req, res) => {
    const template = await prisma.recurrenceTemplate.findUnique({
      where: { organizerToken: req.params.organizerToken },
      include: templateInclude,
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
      include: templateInclude,
    });
    if (!template) throw notFound('Lien de gestion invalide');

    const input = updateTemplateSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      await tx.recurrenceTemplate.update({
        where: { id: template.id },
        data: {
          title: input.title ?? undefined,
          description: input.description === undefined ? undefined : input.description,
          weekday: input.weekday ?? undefined,
          matchTime: input.matchTime ?? undefined,
          deadlineHoursBefore: input.deadlineHoursBefore ?? undefined,
          leadTimeDays: input.leadTimeDays ?? undefined,
          active: input.active ?? undefined,
        },
      });

      // Les options d'un modèle ne portent aucun vote : on peut les remplacer en bloc.
      if (!input.options) return;
      await tx.templateOption.deleteMany({ where: { templateId: template.id } });
      await tx.templateOption.createMany({
        data: input.options.map((option, index) => ({
          templateId: template.id,
          label: option.label,
          capacity: option.capacity ?? null,
          position: index,
        })),
      });
    });

    const updated = await prisma.recurrenceTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: templateInclude,
    });

    res.json({
      template: { ...serializeTemplateForOrganizer(updated), nextMatchDate: nextMatchDate(updated).toISOString() },
    });
  }),
);

/**
 * Déclenche à la main la génération que le CronJob fait chaque jour.
 * Utile pour tester la récurrence sans attendre, ou rattraper un job manqué.
 */
templatesRouter.post(
  '/templates/generate',
  route(async (_req, res) => {
    res.json(await generateDueEvents());
  }),
);
