/**
 * Même normalisation que le backend (backend/src/domain.ts) : « Jean-Luc » et
 * « jean luc » désignent la même personne.
 *
 * Deux usages, tous deux ponctuels : reconnaître ses propres réponses dans le
 * fil d'activité pour ne pas se notifier soi-même, et vérifier au moment de
 * l'envoi que le prénom saisi n'est pas déjà celui de quelqu'un d'autre.
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

const answerKey = (publicToken: string) => `footix.answer.${publicToken}`;

/**
 * La réponse qu'on a envoyée depuis cet appareil, retenue par sondage.
 *
 * C'est ce qui identifie « ma » réponse, et ce qui distingue « je reviens changer
 * d'avis » de « je porte le même prénom que quelqu'un d'autre ».
 */
export const rememberedAnswer = (publicToken: string) => localStorage.getItem(answerKey(publicToken));
export const rememberAnswer = (publicToken: string, participantId: string) =>
  localStorage.setItem(answerKey(publicToken), participantId);
