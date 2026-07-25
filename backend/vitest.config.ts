import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Une base SQLite jetable, migrée une fois avant toute la suite.
    globalSetup: './test/global-setup.ts',
    // Les tests de routes partagent le client Prisma singleton : on les garde en
    // série pour que le nettoyage de tables d'un fichier n'écrase pas un autre.
    fileParallelism: false,
    include: ['test/**/*.test.ts'],
  },
});
