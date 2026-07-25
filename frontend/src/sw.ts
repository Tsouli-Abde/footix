/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

/**
 * Service worker de Footix.
 *
 * Écrit à la main (stratégie injectManifest) pour deux raisons : mettre en cache
 * la coquille de l'app pour l'installer en PWA, et surtout gérer les notifications
 * push, qui poussent un lien vers le sondage ouvert même téléphone verrouillé.
 */
// __WB_MANIFEST est remplacé au build par la liste des fichiers à précacher.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// autoUpdate : le nouveau SW prend la main sans attendre la fermeture des onglets.
self.skipWaiting();
clientsClaim();

type PushPayload = { title: string; body: string; url: string };

/** Réception d'une notification : on l'affiche. */
self.addEventListener('push', (event) => {
  const data: PushPayload = event.data?.json() ?? { title: 'Footix', body: 'Un sondage est ouvert.', url: '/' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Regroupe les notifications d'un même sondage plutôt que les empiler.
      tag: data.url,
      data: { url: data.url },
    }),
  );
});

/** Clic sur la notification : on ouvre le sondage, ou on refocalise un onglet déjà ouvert. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
