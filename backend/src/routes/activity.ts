import { Router } from 'express';
import { prisma } from '../db.js';
import { serializeActivity } from '../activity.js';
import { route } from '../http.js';

export const activityRouter = Router();

/**
 * Le fil d'activité récent, du plus récent au plus ancien.
 *
 * `?since=<ISO>` ne renvoie que ce qui est arrivé après cette date : c'est ce
 * que le front interroge en boucle pour repérer les nouveautés et les afficher
 * en toast.
 */
activityRouter.get(
  '/activity',
  route(async (req, res) => {
    const since = typeof req.query.since === 'string' ? new Date(req.query.since) : null;
    const validSince = since && !Number.isNaN(since.getTime()) ? since : undefined;

    const activities = await prisma.activity.findMany({
      where: validSince ? { createdAt: { gt: validSince } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ activities: activities.map(serializeActivity) });
  }),
);
