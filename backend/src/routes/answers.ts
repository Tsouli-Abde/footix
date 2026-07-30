import { Router } from 'express';
import { announceAnswer } from '../activity.js';
import { prisma } from '../db.js';
import { isVotingOpen, normalizeName } from '../domain.js';
import { badRequest, conflict, notFound, route } from '../http.js';
import { answerSchema } from '../schemas.js';
import { eventInclude, serializeEvent } from '../serializers.js';

export const answersRouter = Router();

/**
 * Cherche un nom libre pour un homonyme : « Thomas » devient « Thomas (2) »,
 * puis « Thomas (3) » si besoin. La limite arbitraire évite une boucle infinie
 * si quelqu'un s'amuse à cliquer.
 */
async function nextFreeName(eventId: string, name: string, baseKey: string) {
  for (let suffix = 2; suffix <= 20; suffix++) {
    const candidate = `${name} (${suffix})`;
    const candidateKey = normalizeName(candidate);
    const taken = await prisma.participant.findUnique({
      where: { eventId_nameKey: { eventId, nameKey: candidateKey } },
    });
    if (!taken) return { name: candidate, nameKey: candidateKey };
  }
  throw badRequest('Trop de personnes portent déjà ce prénom, ajoute une initiale');
}

/**
 * Envoi ou mise à jour d'une réponse.
 *
 * Pas de compte : on reconnaît quelqu'un à son prénom normalisé. Si tu ressaisis
 * le même prénom, tu écrases ta réponse précédente au lieu d'en créer une autre.
 */
answersRouter.post(
  '/events/:publicToken/answers',
  route(async (req, res) => {
    const input = answerSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { publicToken: req.params.publicToken } });
    if (!event) throw notFound('Sondage introuvable');
    if (!isVotingOpen(event)) throw conflict('Les réponses sont closes pour ce match');

    const baseKey = normalizeName(input.name);
    if (!baseKey) throw badRequest('Il me faut un prénom lisible');

    // Deux personnes peuvent porter le même prénom. Par défaut on considère que
    // c'est la même qui revient changer sa réponse ; si elle a confirmé être
    // quelqu'un d'autre, on lui réserve un nom distinct plutôt que d'écraser.
    const { name, nameKey } = input.distinct
      ? await nextFreeName(event.id, input.name, baseKey)
      : { name: input.name, nameKey: baseKey };

    const participant = await prisma.participant.upsert({
      where: { eventId_nameKey: { eventId: event.id, nameKey } },
      create: { eventId: event.id, name, nameKey, availability: input.availability },
      update: { name, availability: input.availability },
    });

    void announceAnswer(event, name, input.availability);

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
