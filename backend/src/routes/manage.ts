import { Router } from 'express';
import { prisma } from '../db.js';
import { occurrenceKeyFor } from '../domain.js';
import { badRequest, conflict, notFound, route } from '../http.js';
import { closeEventSchema, updateEventSchema } from '../schemas.js';
import { eventInclude, serializeEventForOrganizer, serializeEventSummary } from '../serializers.js';

export const manageRouter = Router();

/**
 * Routes de gestion d'un événement. L'unique preuve d'autorisation est la
 * possession du token dans l'URL : pas de compte, pas de mot de passe, le lien
 * organisateur suffit — et ne doit donc pas être partagé sur Teams.
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

/**
 * Édition de l'événement.
 *
 * Les options envoyées avec un `id` existant sont mises à jour (leurs votes sont
 * conservés) ; celles sans `id` sont créées ; celles qui ont disparu du tableau
 * sont supprimées avec les votes qui les concernaient.
 */
manageRouter.patch(
  '/manage/:organizerToken',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    const input = updateEventSchema.parse(req.body);

    const matchDate = input.matchDate ?? event.matchDate;
    const voteDeadline = input.voteDeadline ?? event.voteDeadline;
    if (voteDeadline > matchDate) throw badRequest('La deadline de vote doit précéder le match');

    const occurrenceKey = occurrenceKeyFor(matchDate);
    if (occurrenceKey !== event.occurrenceKey) {
      const clash = await prisma.event.findUnique({ where: { occurrenceKey }, include: eventInclude });
      if (clash) {
        throw conflict('Un autre événement occupe déjà cette date', { event: serializeEventSummary(clash) });
      }
    }

    if (input.options) {
      const knownIds = new Set(event.options.map((option) => option.id));
      const unknown = input.options.find((option) => option.id && !knownIds.has(option.id));
      if (unknown) throw badRequest(`Option inconnue : ${unknown.id}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: event.id },
        data: {
          title: input.title ?? undefined,
          description: input.description === undefined ? undefined : input.description,
          matchDate,
          occurrenceKey,
          voteDeadline,
        },
      });

      if (!input.options) return;

      const keptIds = input.options.map((option) => option.id).filter((id): id is string => Boolean(id));
      await tx.option.deleteMany({ where: { eventId: event.id, id: { notIn: keptIds } } });

      for (const [index, option] of input.options.entries()) {
        const data = { label: option.label, capacity: option.capacity ?? null, position: index };
        if (option.id) {
          await tx.option.update({ where: { id: option.id }, data });
        } else {
          await tx.option.create({ data: { ...data, eventId: event.id } });
        }
      }
    });

    const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
    res.json({ event: serializeEventForOrganizer(updated) });
  }),
);

/**
 * Clôture du vote. L'organisateur désigne lui-même l'option retenue : rien
 * n'est décidé automatiquement, le choix final reste humain (cf. CLAUDE.md §3).
 */
manageRouter.post(
  '/manage/:organizerToken/close',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    const input = closeEventSchema.parse(req.body ?? {});

    const winningOptionId = input.winningOptionId ?? null;
    if (winningOptionId && !event.options.some((option) => option.id === winningOptionId)) {
      throw badRequest("Cette option n'appartient pas à l'événement");
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'cloture', winningOptionId },
      include: eventInclude,
    });

    res.json({ event: serializeEventForOrganizer(updated) });
  }),
);

/** Réouverture, en cas de clôture prématurée. */
manageRouter.post(
  '/manage/:organizerToken/reopen',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'ouvert', winningOptionId: null },
      include: eventInclude,
    });

    res.json({ event: serializeEventForOrganizer(updated) });
  }),
);

/** Suppression, réservée aux sondages créés par erreur. */
manageRouter.delete(
  '/manage/:organizerToken',
  route(async (req, res) => {
    const event = await loadByOrganizerToken(req.params.organizerToken);
    await prisma.event.delete({ where: { id: event.id } });
    res.status(204).end();
  }),
);
