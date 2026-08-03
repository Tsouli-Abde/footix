import { defineConfig } from 'vitest/config';

/**
 * Configuration des variables d'environnement des tests.
 *
 * Elles sont posées ici plutôt que devant la commande npm : le préfixe
 * `VAR=x commande` est une syntaxe de shell POSIX, elle échoue sous Windows.
 * Défini ici, `npm test` marche partout à l'identique.
 *
 * La base de test est distincte de celle de dev : les tests la migrent et
 * vident ses tables, ils ne doivent jamais toucher aux données de travail.
 * Elle est créée au premier démarrage du conteneur (deploy/dev-init-db.sql).
 */
const TEST_ENV = {
  DATABASE_URL: 'postgresql://footix:footix@localhost:5433/footix_test?schema=public',
  // Paire VAPID jetable : les tests de push ont besoin de clés valides, mais
  // rien n'est envoyé, le transport est bouchonné.
  VAPID_PUBLIC_KEY: 'BNCNZYAGKLiKh9ljwbi4E4ou3_7aMK1W3NfS4nlVeZgFQ3HJaZdpbmRbtsvTzn6n_DO4P8lX642jUBeOnIHShAI',
  VAPID_PRIVATE_KEY: '8dhJJ3qTEX5qZgEqDHM9bI5IVe0gCDJoSpBl_0RZ0tg',
};

// Le globalSetup (migrations) tourne dans ce processus, les tests dans des
// workers qui en héritent : il faut donc les poser sur process.env, `test.env`
// seul ne couvrirait pas le globalSetup.
Object.assign(process.env, TEST_ENV);

export default defineConfig({
  test: {
    env: TEST_ENV,
    // Base de test migrée une fois avant toute la suite.
    globalSetup: './test/global-setup.ts',
    // Les tests de routes partagent le client Prisma singleton : on les garde en
    // série pour que le nettoyage de tables d'un fichier n'écrase pas un autre.
    fileParallelism: false,
    include: ['test/**/*.test.ts'],
  },
});
