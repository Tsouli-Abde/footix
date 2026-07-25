import webpush from 'web-push';
import { prisma } from './db.js';
import { formatMatchDate } from './format.js';

/**
 * Notifications push (Web Push API).
 *
 * Sans clés VAPID configurées, tout est simplement désactivé : les endpoints
 * répondent « indisponible » et le reste de l'app fonctionne normalement. Ça
 * évite d'imposer une config pour faire tourner Footix en local.
 */

let configured = false;

export function pushEnabled(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:footix@example.com', publicKey, privateKey);
    configured = true;
  }
  return true;
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Enregistre (ou rafraîchit) l'abonnement d'un navigateur. */
export async function saveSubscription(sub: SubscriptionInput) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export type PushPayload = { title: string; body: string; url: string };

/**
 * Envoie une notification push à tous les abonnés.
 *
 * Fire-and-forget : on ne bloque jamais la réponse HTTP là-dessus, et un envoi
 * raté n'a pas d'importance. Les abonnements que le navigateur a expirés
 * (404/410) sont nettoyés au passage.
 *
 * Réservé aux moments forts (sondage ouvert, résultat) : pousser une notif à
 * chaque réponse individuelle spammerait les téléphones. Le détail passe par le
 * fil d'activité in-app.
 */
export async function pushToAll(payload: PushPayload) {
  if (!pushEnabled()) return;

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Envoi push échoué :', status ?? err);
        }
      }
    }),
  );
}

type NotifiableEvent = { title: string | null; matchDate: Date; publicToken: string };

/** Push « un sondage est ouvert ». */
export function notifyEventOpen(event: NotifiableEvent) {
  return pushToAll({
    title: event.title ?? 'Foot ?',
    body: `On joue ${formatMatchDate(event.matchDate)} ? Dis si tu viens.`,
    url: `/e/${event.publicToken}`,
  });
}
