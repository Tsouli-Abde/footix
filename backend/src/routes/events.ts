import { Router } from 'express';
import { prisma } from '../db.js';
import { generateToken, occurrenceKeyFor } from '../domain.js';
import { conflict, notFound, route } from '../http.js';
import { createEventSchema } from '../schemas.js';
import { eventInclude, serializeEvent, serializeEventForOrganizer, serializeEventSummary } from '../serializers.js';

export const eventsRouter = Router();

/**
 * Liste des événements, du plus proche au plus ancien.
 * `?status=ouvert` pour les votes en cours, `?status=cloture` pour l'historique.
 */
eventsRouter.get(
  '/events',
  route(async (req, res) => {
    const status = req.query.status;
    const events = await prisma.event.findMany({
      where: typeof status === 'string' && status !== 'all' ? { status } : undefined,
      orderBy: { matchDate: 'desc' },
      take: 100,
      include: eventInclude,
    });

    res.json({ events: events.map(serializeEventSummary) });
  }),
);

/**
 * Création d'un événement.
 *
 * Anti-doublon : un seul événement par jour de match. Si un autre existe déjà,
 * on répond 409 avec l'événement en question pour que le frontend y redirige
 * plutôt que de laisser créer un sondage concurrent.
 */
eventsRouter.post(
  '/events',
  route(async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const occurrenceKey = occurrenceKeyFor(input.matchDate);

    const existing = await prisma.event.findUnique({ where: { occurrenceKey }, include: eventInclude });
    if (existing) {
      throw conflict('Un événement existe déjà pour cette date', { event: serializeEventSummary(existing) });
    }

    const event = await prisma.event.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        type: 'ponctuel',
        matchDate: input.matchDate,
        occurrenceKey,
        voteDeadline: input.voteDeadline,
        publicToken: generateToken(),
        organizerToken: generateToken(),
        options: {
          create: input.options.map((option, index) => ({
            label: option.label,
            capacity: option.capacity ?? null,
            position: index,
          })),
        },
      },
      include: eventInclude,
    });

    res.status(201).json({ event: serializeEventForOrganizer(event) });
  }),
);

/** Vue publique : c'est le lien partagé sur Teams. */
eventsRouter.get(
  '/events/:publicToken',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { publicToken: req.params.publicToken },
      include: eventInclude,
    });
    if (!event) throw notFound('Événement introuvable');

    res.json({ event: serializeEvent(event) });
  }),
);
