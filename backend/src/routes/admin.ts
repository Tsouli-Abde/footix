import { Router } from 'express';
import { requireAdmin } from '../admin.js';
import { prisma } from '../db.js';
import { isVenueId, isVotingOpen, normalizeName, VENUES, type Availability } from '../domain.js';
import { badRequest, notFound, route } from '../http.js';
import { autoCloseDueEvents, sendDueReminders } from '../reminders.js';
import { pushEnabled } from '../push.js';
import { adminPlayerSchema } from '../schemas.js';
import { eventInclude, serializeEventForOrganizer } from '../serializers.js';

export const adminRouter = Router();

/**
 * Vue d'administration : tout ce que les liens ne permettent pas de faire.
 *
 * Chaque route est derrière le mot de passe partagé (voir src/admin.ts). Les
 * actions sur un sondage précis ne sont pas dupliquées ici : la liste renvoie
 * les tokens de gestion, et le front réutilise les routes /manage existantes.
 */
adminRouter.use('/admin', requireAdmin);

/** Sert uniquement à valider le mot de passe avant d'ouvrir la vue. */
adminRouter.post(
  '/admin/login',
  route(async (_req, res) => {
    res.json({ ok: true });
  }),
);

const asAvailability = (value: string): Availability | null =>
  value === 'oui' || value === 'si_besoin' || value === 'si_sceaux' || value === 'non' ? value : null;

/** Quelques chiffres sur la vie de l'app, pour savoir où elle en est. */
adminRouter.get(
  '/admin/stats',
  route(async (_req, res) => {
    const events = await prisma.event.findMany({ include: eventInclude, orderBy: { matchDate: 'asc' } });
    const [activityCount, subscriptionCount] = await Promise.all([
      prisma.activity.count(),
      prisma.pushSubscription.count(),
    ]);

    const closed = events.filter((event) => event.status === 'cloture');
    const played = closed.filter((event) => event.chosenVenue);

    // Un joueur = une clé de nom, tous sondages confondus.
    const playerKeys = new Set<string>();
    const answers: Record<Availability, number> = { oui: 0, si_besoin: 0, si_sceaux: 0, non: 0 };
    for (const event of events) {
      for (const participant of event.participants) {
        playerKeys.add(participant.nameKey);
        const availability = asAvailability(participant.availability);
        if (availability) answers[availability] += 1;
      }
    }

    const presentsPerPlayedMatch = played.map(
      (event) => event.participants.filter((participant) => participant.availability === 'oui').length,
    );
    const average = presentsPerPlayedMatch.length
      ? presentsPerPlayedMatch.reduce((total, count) => total + count, 0) / presentsPerPlayedMatch.length
      : 0;

    /** Combien de fois chaque lieu a été retenu, plus les matchs annulés. */
    const venueTally = Object.keys(VENUES).map((id) => ({
      venueId: id,
      label: VENUES[id as keyof typeof VENUES].label,
      count: closed.filter((event) => event.chosenVenue === id).length,
    }));

    res.json({
      events: {
        total: events.length,
        open: events.filter((event) => event.status === 'ouvert').length,
        closed: closed.length,
        played: played.length,
        cancelled: closed.length - played.length,
        // Ouverts mais dont le coup d'envoi est passé : le job ne les a pas
        // encore balayés, ou il ne tourne pas.
        overdue: events.filter((event) => event.status === 'ouvert' && !isVotingOpen(event)).length,
      },
      players: { total: playerKeys.size },
      answers,
      attendance: {
        averagePresent: Math.round(average * 10) / 10,
        bestMatch: Math.max(0, ...presentsPerPlayedMatch),
      },
      venues: venueTally,
      firstMatch: events[0]?.matchDate.toISOString() ?? null,
      lastMatch: events.at(-1)?.matchDate.toISOString() ?? null,
      activityCount,
      push: { enabled: pushEnabled(), subscriptions: subscriptionCount },
    });
  }),
);

/**
 * Tous les sondages, du plus récent au plus ancien, avec leurs deux tokens.
 * C'est ce qui permet à la vue admin d'agir sans routes dédiées.
 */
adminRouter.get(
  '/admin/events',
  route(async (_req, res) => {
    const events = await prisma.event.findMany({ orderBy: { matchDate: 'desc' }, include: eventInclude });
    res.json({ events: events.map(serializeEventForOrganizer) });
  }),
);

type PlayerRow = {
  nameKey: string;
  name: string;
  answers: number;
  counts: Record<Availability, number>;
  lastAnswerAt: string;
  lastMatchDate: string;
};

/**
 * Les joueurs, reconstitués depuis les réponses.
 *
 * Il n'y a pas de table Joueur : quelqu'un existe parce qu'il a répondu au moins
 * une fois. On regroupe donc par clé de nom, et on garde l'orthographe de la
 * réponse la plus récente comme nom d'affichage.
 */
adminRouter.get(
  '/admin/players',
  route(async (_req, res) => {
    const participants = await prisma.participant.findMany({
      include: { event: { select: { matchDate: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const byKey = new Map<string, PlayerRow>();

    for (const participant of participants) {
      const existing = byKey.get(participant.nameKey);
      const row =
        existing ??
        // Premier vu = le plus récent, c'est son orthographe qu'on retient.
        {
          nameKey: participant.nameKey,
          name: participant.name,
          answers: 0,
          counts: { oui: 0, si_besoin: 0, si_sceaux: 0, non: 0 },
          lastAnswerAt: participant.createdAt.toISOString(),
          lastMatchDate: participant.event.matchDate.toISOString(),
        };

      row.answers += 1;
      const availability = asAvailability(participant.availability);
      if (availability) row.counts[availability] += 1;

      byKey.set(participant.nameKey, row);
    }

    const players = [...byKey.values()].sort(
      (a, b) => b.counts.oui - a.counts.oui || b.answers - a.answers || a.name.localeCompare(b.name, 'fr'),
    );

    res.json({ players });
  }),
);

/**
 * Renomme un joueur partout.
 *
 * Sert aux fautes de frappe : quelqu'un qui a répondu « Sarahh » trois semaines
 * de suite compte comme un joueur à part, et fausse l'historique.
 */
adminRouter.patch(
  '/admin/players/:nameKey',
  route(async (req, res) => {
    const { name } = adminPlayerSchema.parse(req.body);
    const nameKey = normalizeName(name);
    if (!nameKey) throw badRequest('Prénom invalide');

    const participants = await prisma.participant.findMany({ where: { nameKey: req.params.nameKey } });
    if (participants.length === 0) throw notFound('Joueur introuvable');

    // Le renommage peut fusionner deux joueurs si la nouvelle clé existe déjà
    // sur le même sondage : la contrainte d'unicité l'interdirait, on retire
    // donc la réponse en doublon et on garde la plus récente.
    let renamed = 0;
    let merged = 0;

    for (const participant of participants) {
      const clash =
        nameKey === participant.nameKey
          ? null
          : await prisma.participant.findUnique({
              where: { eventId_nameKey: { eventId: participant.eventId, nameKey } },
            });

      if (clash) {
        const keepClash = clash.updatedAt >= participant.updatedAt;
        await prisma.participant.delete({ where: { id: keepClash ? participant.id : clash.id } });
        if (!keepClash) {
          await prisma.participant.update({ where: { id: participant.id }, data: { name, nameKey } });
        }
        merged += 1;
        continue;
      }

      await prisma.participant.update({ where: { id: participant.id }, data: { name, nameKey } });
      renamed += 1;
    }

    res.json({ renamed, merged });
  }),
);

/** Retire un joueur de tous les sondages, réponses comprises. */
adminRouter.delete(
  '/admin/players/:nameKey',
  route(async (req, res) => {
    const { count } = await prisma.participant.deleteMany({ where: { nameKey: req.params.nameKey } });
    if (count === 0) throw notFound('Joueur introuvable');
    res.json({ removed: count });
  }),
);

/** Les navigateurs abonnés aux notifications, pour pouvoir en couper un. */
adminRouter.get(
  '/admin/subscriptions',
  route(async (_req, res) => {
    const subscriptions = await prisma.pushSubscription.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({
      enabled: pushEnabled(),
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        // L'endpoint complet est un secret d'envoi : on n'en montre que de quoi
        // reconnaître l'appareil et le service de push utilisé.
        host: safeHost(subscription.endpoint),
        tail: subscription.endpoint.slice(-8),
        createdAt: subscription.createdAt.toISOString(),
      })),
    });
  }),
);

const safeHost = (endpoint: string) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'inconnu';
  }
};

adminRouter.delete(
  '/admin/subscriptions/:id',
  route(async (req, res) => {
    const subscription = await prisma.pushSubscription.findUnique({ where: { id: req.params.id } });
    if (!subscription) throw notFound('Abonnement introuvable');
    await prisma.pushSubscription.delete({ where: { id: subscription.id } });
    res.status(204).end();
  }),
);

/** Vide le fil d'activité. Il n'a pas de valeur historique, il se reconstitue. */
adminRouter.delete(
  '/admin/activity',
  route(async (_req, res) => {
    const { count } = await prisma.activity.deleteMany();
    res.json({ removed: count });
  }),
);

/**
 * Lance le battement horaire à la demande.
 *
 * Le job tourne dans un conteneur à part ; pouvoir le déclencher évite d'aller
 * chercher un shell pour vérifier qu'il fait bien son travail.
 */
adminRouter.post(
  '/admin/tick',
  route(async (_req, res) => {
    const reminders = await sendDueReminders();
    const closed = await autoCloseDueEvents();
    res.json({
      reminders: reminders.sent.map((sent) => ({ publicToken: sent.publicToken, message: sent.message })),
      closed: closed.map((event) => ({
        eventId: event.eventId,
        venue: event.chosenVenue && isVenueId(event.chosenVenue) ? VENUES[event.chosenVenue].label : null,
      })),
    });
  }),
);
