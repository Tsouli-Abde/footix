import { Router } from 'express';
import { prisma } from '../db.js';
import { atMatchHour, defaultDeadlineFor, generateToken, occurrenceKeyFor } from '../domain.js';
import { conflict, notFound, route } from '../http.js';
import { notifyEventOpen } from '../push.js';
import { createEventSchema } from '../schemas.js';
import { eventInclude, serializeEvent, serializeEventForOrganizer, serializeEventSummary } from '../serializers.js';

export const eventsRouter = Router();

/**
 * Liste des sondages, du plus récent au plus ancien.
 * `?status=ouvert` pour ceux en cours, `?status=cloture` pour l'historique.
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
 * Création d'un sondage.
 *
 * Tout est optionnel sauf la date. Sans titre, c'est la date qui sert
 * d'intitulé, ça évite de répéter le même libellé à chaque semaine. Sans
 * deadline, les réponses ferment la veille à 18h.
 *
 * Un seul sondage par jour. S'il en existe déjà un, on répond 409 avec celui-ci
 * pour que le frontend y renvoie au lieu d'en créer un deuxième.
 */
eventsRouter.post(
  '/events',
  route(async (req, res) => {
    const input = createEventSchema.parse(req.body);

    const matchDate = atMatchHour(input.matchDate);
    const occurrenceKey = occurrenceKeyFor(matchDate);

    const existing = await prisma.event.findUnique({ where: { occurrenceKey }, include: eventInclude });
    if (existing) {
      throw conflict('Un sondage existe déjà pour ce jour', { event: serializeEventSummary(existing) });
    }

    const event = await prisma.event.create({
      data: {
        title: input.title?.trim() || null,
        description: input.description ?? null,
        type: 'ponctuel',
        matchDate,
        occurrenceKey,
        voteDeadline: input.voteDeadline ?? defaultDeadlineFor(matchDate),
        publicToken: generateToken(),
        organizerToken: generateToken(),
      },
      include: eventInclude,
    });

    // On prévient l'équipe qu'un sondage est ouvert, sans bloquer la réponse.
    void notifyEventOpen(event);

    res.status(201).json({ event: serializeEventForOrganizer(event) });
  }),
);

/** Vue publique, c'est le lien qu'on colle sur Teams. */
eventsRouter.get(
  '/events/:publicToken',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { publicToken: req.params.publicToken },
      include: eventInclude,
    });
    if (!event) throw notFound('Sondage introuvable');

    res.json({ event: serializeEvent(event) });
  }),
);
