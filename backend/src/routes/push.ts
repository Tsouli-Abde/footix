import { Router } from 'express';
import { z } from 'zod';
import { badRequest, route } from '../http.js';
import { pushEnabled, removeSubscription, saveSubscription, vapidPublicKey } from '../push.js';

export const pushRouter = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/**
 * Clé publique VAPID dont le navigateur a besoin pour s'abonner.
 * `enabled: false` si le serveur n'a pas de clés : le front masque alors l'option.
 */
pushRouter.get(
  '/push/key',
  route(async (_req, res) => {
    res.json({ enabled: pushEnabled(), key: vapidPublicKey() });
  }),
);

pushRouter.post(
  '/push/subscribe',
  route(async (req, res) => {
    if (!pushEnabled()) throw badRequest('Notifications non configurées sur ce serveur');
    const subscription = subscriptionSchema.parse(req.body);
    await saveSubscription(subscription);
    res.status(201).json({ ok: true });
  }),
);

pushRouter.post(
  '/push/unsubscribe',
  route(async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
    await removeSubscription(endpoint);
    res.json({ ok: true });
  }),
);
