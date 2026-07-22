import { createApp } from './app.js';
import { prisma } from './db.js';

const port = Number(process.env.PORT ?? 3001);

const server = createApp().listen(port, () => {
  console.log(`Footix API à l'écoute sur http://localhost:${port}`);
});

// Kubernetes et docker compose envoient SIGTERM : on ferme proprement pour ne pas
// couper une requête en cours ni laisser la base ouverte.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
