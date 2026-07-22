/**
 * Même normalisation que le backend (backend/src/domain.ts) : elle sert ici à
 * prévenir le visiteur qu'il s'apprête à écraser un vote déjà présent sous ce nom.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const NAME_KEY = 'footix.name';

/** Le prénom est mémorisé localement pour ne pas le retaper chaque semaine. */
export const rememberedName = () => localStorage.getItem(NAME_KEY) ?? '';
export const rememberName = (name: string) => localStorage.setItem(NAME_KEY, name);
