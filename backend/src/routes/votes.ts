import { Router } from 'express';
import { prisma } from '../db.js';
import { isVotingOpen, normalizeName } from '../domain.js';
import { badRequest, conflict, notFound, route } from '../http.js';
import { submitVoteSchema } from '../schemas.js';
import { eventInclude, serializeEvent } from '../serializers.js';

export const votesRouter = Router();

/**
 * Envoi (ou mise à jour) du vote d'une personne.
 *
 * Pas de compte : on identifie le votant par son nom normalisé. Quelqu'un qui
 * ressaisit le même prénom retrouve et écrase son vote précédent, comme sur Doodle.
 */
votesRouter.post(
  '/events/:publicToken/votes',
  route(async (req, res) => {
    const input = submitVoteSchema.parse(req.body);

    const event = await prisma.event.findUnique({
      where: { publicToken: req.params.publicToken },
      include: { options: true },
    });
    if (!event) throw notFound('Événement introuvable');
    if (!isVotingOpen(event)) throw conflict('Les votes sont clos pour cet événement');

    const optionIds = new Set(event.options.map((option) => option.id));
    const unknown = input.votes.find((vote) => !optionIds.has(vote.optionId));
    if (unknown) throw badRequest(`Option inconnue : ${unknown.optionId}`);

    const nameKey = normalizeName(input.name);
    if (!nameKey) throw badRequest('Indique un prénom lisible');

    // Une transaction : on remplace le vote d'un coup, jamais d'état intermédiaire
    // où le participant existe sans ses réponses.
    const participantId = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.upsert({
        where: { eventId_nameKey: { eventId: event.id, nameKey } },
        create: { eventId: event.id, name: input.name, nameKey },
        update: { name: input.name },
      });

      await tx.vote.deleteMany({ where: { participantId: participant.id } });
      await tx.vote.createMany({
        data: input.votes.map((vote) => ({
          participantId: participant.id,
          optionId: vote.optionId,
          value: vote.value,
        })),
      });

      return participant.id;
    });

    const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
    res.status(201).json({ participantId, event: serializeEvent(updated) });
  }),
);

/** Retrait d'un votant (erreur de saisie, doublon de prénom). */
votesRouter.delete(
  '/events/:publicToken/votes/:participantId',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { publicToken: req.params.publicToken } });
    if (!event) throw notFound('Événement introuvable');
    if (!isVotingOpen(event)) throw conflict('Les votes sont clos pour cet événement');

    const participant = await prisma.participant.findUnique({ where: { id: req.params.participantId } });
    if (!participant || participant.eventId !== event.id) throw notFound('Participant introuvable');

    await prisma.participant.delete({ where: { id: participant.id } });

    const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
    res.json({ event: serializeEvent(updated) });
  }),
);
