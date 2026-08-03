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
 * Pas de compte : le prénom identifie la personne, ressaisir le même prénom
 * remplace donc la réponse précédente. Deux vrais homonymes se distinguent en
 * ajoutant une initiale ; sinon l'organisateur peut retirer une réponse.
 */
answersRouter.post(
  '/events/:publicToken/answers',
  route(async (req, res) => {
    const input = answerSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { publicToken: req.params.publicToken } });
    if (!event) throw notFound('Sondage introuvable');
    if (!isVotingOpen(event)) throw conflict('Les réponses sont closes pour ce match');

    const nameKey = normalizeName(input.name);
    if (!nameKey) throw badRequest('Prénom invalide');

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

/** Retirer quelqu'un, en cas de faute de frappe ou d'homonyme. */
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
