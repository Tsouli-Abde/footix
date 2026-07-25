import { api } from '../api';

/**
 * Abonnement aux notifications push, côté navigateur.
 *
 * Le parcours : demander la permission, s'abonner auprès du navigateur avec la
 * clé publique du serveur, puis envoyer cet abonnement au backend qui pourra
 * pousser un message quand un sondage s'ouvre.
 */

/** Le push n'existe pas partout (vieux navigateurs, iOS hors écran d'accueil). */
export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export type PushState = 'unsupported' | 'unavailable' | 'default' | 'granted' | 'denied';

/** État courant, pour savoir quoi afficher sans rien déclencher. */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const { enabled } = await api.pushKey();
  if (!enabled) return 'unavailable'; // serveur sans clés VAPID
  return Notification.permission as PushState;
}

/** La clé VAPID arrive en base64url ; l'API PushManager attend un Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/**
 * Demande la permission et enregistre l'abonnement.
 * Renvoie l'état obtenu ('granted' si tout s'est bien passé).
 */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';

  const { enabled, key } = await api.pushKey();
  if (!enabled || !key) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission as PushState;

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast : les typings récents de Uint8Array froissent BufferSource, sans conséquence ici.
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    }));

  await api.pushSubscribe(subscription.toJSON());
  return 'granted';
}

/** Coupe les notifications sur cet appareil. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await api.pushUnsubscribe(subscription.endpoint).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}
