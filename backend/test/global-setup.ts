import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/**
 * Prépare la base de test : on repart d'un fichier vide et on applique les
 * migrations. `DATABASE_URL` pointe sur la base de test (défini dans le script
 * npm), la vraie base de dev n'est donc jamais touchée.
 */
export default function setup() {
  for (const suffix of ['', '-journal']) {
    rmSync(`./prisma/data/test.db${suffix}`, { force: true });
  }

  execSync('npx prisma migrate deploy', { stdio: 'ignore' });
}
