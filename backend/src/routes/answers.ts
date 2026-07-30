import { Router } from 'express';
import { announceAnswer } from '../activity.js';
import { prisma } from '../db.js';
import { isVotingOpen, normalizeName } from '../domain.js';
import { badRequest, conflict, notFound, route } from '../http.js';
import { answerSchema } from '../schemas.js';
import { eventInclude, serializeEvent } from '../serializers.js';

export const answersRouter = Router();

/**
 * Envoi ou mise à jour d'une réponse.
 *
 * Pas de compte : le prénom identifie la personne, premier arrivé premier servi.
 * Ressaisir le même prénom écrase donc la réponse précédente. Deux personnes qui
 * portent le même prénom doivent se distinguer elles-mêmes, en ajoutant une
 * initiale par exemple, et l'interface les y invite avant l'envoi.
 */
answersRouter.post(
  '/events/:publicToken/answers',
  route(async (req, res) => {
    const input = answerSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { publicToken: req.params.publicToken } });
    if (!event) throw notFound('Sondage introuvable');
    if (!isVotingOpen(event)) throw conflict('Les réponses sont closes pour ce match');

    const nameKey = normalizeName(input.name);
    if (!nameKey) throw badRequest('Il me faut un prénom lisible');

    const participant = await prisma.participant.upsert({
      where: { eventId_nameKey: { eventId: event.id, nameKey } },
      create: { eventId: event.id, name: input.name, nameKey, availability: input.availability },
      update: { name: input.name, availability: input.availability },
    });

    void announceAnswer(event, input.name, input.availability);

    const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
    res.status(201).json({ participantId: participant.id, event: serializeEvent(updated) });
  }),
);

/** Retirer quelqu'un, en cas de faute de frappe ou de doublon de prénom. */
answersRouter.delete(
  '/events/:publicToken/answers/:participantId',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { publicToken: req.params.publicToken } });
    if (!event) throw notFound('Sondage introuvable');
    if (!isVotingOpen(event)) throw conflict('Les réponses sont closes pour ce match');

    const participant = await prisma.participant.findUnique({ where: { id: req.params.participantId } });
    if (!participant || participant.eventId !== event.id) throw notFound('Personne introuvable');

    await prisma.participant.delete({ where: { id: participant.id } });

    const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
    res.json({ event: serializeEvent(updated) });
  }),
);
