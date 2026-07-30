import { Router } from 'express';
import { prisma } from '../db.js';
import { atMatchHour, defaultDeadlineFor, generateToken, occurrenceKeyFor, withTime } from '../domain.js';
import { announceVoteOpen } from '../activity.js';
import { badRequest, conflict, notFound, route } from '../http.js';
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

    // Heure explicite si l'organisateur en a choisi une, midi sinon.
    const matchDate = input.matchTime ? withTime(input.matchDate, input.matchTime) : atMatchHour(input.matchDate);
    const occurrenceKey = occurrenceKeyFor(matchDate);

    // Un sondage pour un match déjà passé n'a pas de sens et fausse l'historique.
    if (matchDate.getTime() < Date.now()) {
      throw badRequest('Ce jour est déjà passé, choisis une date à venir');
    }

    const existing = await prisma.event.findUnique({ where: { occurrenceKey }, include: eventInclude });
    if (existing) {
      throw conflict('Un sondage existe déjà pour ce jour', { event: serializeEventSummary(existing) });
    }

    // Une deadline déjà dépassée fermerait le vote avant qu'il ne commence.
    const voteDeadline = input.voteDeadline ?? defaultDeadlineFor(matchDate);
    const usableDeadline = voteDeadline.getTime() > Date.now() ? voteDeadline : matchDate;

    const event = await prisma.event.create({
      data: {
        title: input.title?.trim() || null,
        description: input.description ?? null,
        type: 'ponctuel',
        matchDate,
        hasTime: Boolean(input.matchTime),
        organizerName: input.organizerName?.trim() || null,
        occurrenceKey,
        voteDeadline: usableDeadline,
        publicToken: generateToken(),
        organizerToken: generateToken(),
      },
      include: eventInclude,
    });

    // On prévient l'équipe qu'un sondage est ouvert, sans bloquer la réponse.
    void announceVoteOpen(event);

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
