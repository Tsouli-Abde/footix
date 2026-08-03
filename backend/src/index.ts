import './env.js'; // doit rester en premier : charge .env avant tout le reste
import { createApp } from './app.js';
import { prisma } from './db.js';

// Défaut volontairement atypique : c'est le port qu'on ouvre sur sa propre
// machine, il ne doit marcher sur les pieds d'aucun autre projet. En conteneur
// la valeur vient de PORT, où 3001 suffit puisque rien n'est publié.
const port = Number(process.env.PORT ?? 29301);

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
