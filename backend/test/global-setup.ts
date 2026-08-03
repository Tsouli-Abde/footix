import { execSync } from 'node:child_process';

/**
 * Prépare la base de test PostgreSQL : on applique les migrations (non
 * destructif). `DATABASE_URL` pointe sur la base de test, définie dans
 * vitest.config.ts, la base de dev n'est donc jamais touchée. Les tables sont
 * vidées entre chaque test par resetDb().
 */
export default function setup() {
  execSync('npx prisma migrate deploy', { stdio: 'ignore' });
}
