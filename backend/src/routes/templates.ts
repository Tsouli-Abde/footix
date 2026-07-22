import { Router } from 'express';
import { prisma } from '../db.js';
import { generateToken } from '../domain.js';
import { notFound, route } from '../http.js';
import { generateDueEvents, nextMatchDate } from '../recurrence.js';
import { createTemplateSchema, updateTemplateSchema } from '../schemas.js';
import {
  eventInclude,
  serializeEvent,
  serializeEventSummary,
  serializeTemplate,
  serializeTemplateForOrganizer,
} from '../serializers.js';

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
 * Le sondage du moment pour ce rendez-vous : celui qui est ouvert, sinon le
 * dernier en date.
 *
 * C'est ce qui permet d'avoir un lien permanent à épingler sur Teams une fois
 * pour toutes, au lieu de repartager une URL différente chaque semaine.
 * L'identifiant du modèle n'est pas secret, la route ne renvoie que du public.
 */
templatesRouter.get(
  '/templates/:templateId/current',
  route(async (req, res) => {
    const template = await prisma.recurrenceTemplate.findUnique({ where: { id: req.params.templateId } });
    if (!template) throw notFound('Rendez-vous introuvable');

    const event =
      (await prisma.event.findFirst({
        where: { recurrenceTemplateId: template.id, status: 'ouvert' },
        orderBy: { matchDate: 'asc' },
        include: eventInclude,
      })) ??
      (await prisma.event.findFirst({
        where: { recurrenceTemplateId: template.id },
        orderBy: { matchDate: 'desc' },
        include: eventInclude,
      }));

    res.json({ event: event ? serializeEvent(event) : null });
  }),
);

/**
 * Les sondages déjà produits par ce rendez-vous, avec leur lien de gestion.
 *
 * Sans ça, les sondages créés par le cron seraient ingérables : leur token
 * organisateur n'existerait que dans les logs du job, donc personne ne pourrait
 * les clôturer ni saisir le score.
 */
templatesRouter.get(
  '/templates/manage/:organizerToken/events',
  route(async (req, res) => {
    const template = await prisma.recurrenceTemplate.findUnique({
      where: { organizerToken: req.params.organizerToken },
    });
    if (!template) throw notFound('Lien de gestion invalide');

    const events = await prisma.event.findMany({
      where: { recurrenceTemplateId: template.id },
      orderBy: { matchDate: 'desc' },
      take: 20,
      include: eventInclude,
    });

    res.json({
      events: events.map((event) => ({
        ...serializeEventSummary(event),
        organizerToken: event.organizerToken,
      })),
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
