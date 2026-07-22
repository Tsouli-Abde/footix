import { Router } from 'express';
import { prisma } from '../db.js';
import { atMatchHour, occurrenceKeyFor } from '../domain.js';
import { badRequest, conflict, notFound, route } from '../http.js';
import { closeEventSchema, updateEventSchema } from '../schemas.js';
import { eventInclude, serializeEventForOrganizer, serializeEventSummary } from '../serializers.js';

export const manageRouter = Router();

/**
 * Gestion d'un sondage. La seule preuve d'autorisation est le token dans l'URL :
 * pas de compte, pas de mot de passe, le lien organisateur suffit. C'est aussi
 * pour ça qu'il ne se partage pas sur Teams.
 */
async function loadByOrganizerToken(organizerToken: string) {
  const event = await prisma.event.findUnique({ where: { organizerToken }, include: eventInclude });
  if (!event) throw notFound('Lien organisateur invalide');
  return event;
}

manageRouter.get(
  '/manage/:organizerToken',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    res.json({ event: serializeEventForOrganizer(event) });
  }),
);

manageRouter.patch(
  '/manage/:organizerToken',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    const input = updateEventSchema.parse(req.body);

    const matchDate = input.matchDate ? atMatchHour(input.matchDate) : event.matchDate;
    const voteDeadline = input.voteDeadline ?? event.voteDeadline;
    if (voteDeadline > matchDate) throw badRequest('La deadline doit tomber avant le match');

    const occurrenceKey = occurrenceKeyFor(matchDate);
    if (occurrenceKey !== event.occurrenceKey) {
      const clash = await prisma.event.findUnique({ where: { occurrenceKey }, include: eventInclude });
      if (clash) {
        throw conflict('Un autre sondage occupe déjà ce jour', { event: serializeEventSummary(clash) });
      }
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        title: input.title ?? undefined,
        description: input.description === undefined ? undefined : input.description,
        matchDate,
        occurrenceKey,
        voteDeadline,
      },
      include: eventInclude,
    });

    res.json({ event: serializeEventForOrganizer(updated) });
  }),
);

/**
 * Clôture. L'app recommande un lieu à partir du nombre de présents, mais c'est
 * l'organisateur qui valide, et il peut choisir autre chose.
 */
manageRouter.post(
  '/manage/:organizerToken/close',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    const input = closeEventSchema.parse(req.body ?? {});

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'cloture', chosenVenue: input.chosenVenue ?? null },
      include: eventInclude,
    });

    res.json({ event: serializeEventForOrganizer(updated) });
  }),
);

/** Réouverture, si on a clôturé trop vite. */
manageRouter.post(
  '/manage/:organizerToken/reopen',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'ouvert', chosenVenue: null },
      include: eventInclude,
    });

    res.json({ event: serializeEventForOrganizer(updated) });
  }),
);

/** Suppression, pour les sondages créés par erreur. */
manageRouter.delete(
  '/manage/:organizerToken',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    await prisma.event.delete({ where: { id: event.id } });
    res.status(204).end();
  }),
);
