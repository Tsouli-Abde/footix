import { randomBytes } from 'node:crypto';

/** Les trois réponses possibles, comme sur Doodle. */
export const VOTE_VALUES = ['oui', 'si_besoin', 'non'] as const;
export type VoteValue = (typeof VOTE_VALUES)[number];

export const EVENT_STATUSES = ['ouvert', 'cloture'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ['ponctuel', 'recurrent'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Token d'URL (lien participant ou lien organisateur).
 * 16 octets aléatoires → 22 caractères non devinables, sûrs en URL.
 */
export function generateToken(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Clé d'unicité d'un événement : le jour du match au format YYYY-MM-DD.
 * Deux événements ne peuvent pas exister le même jour (anti-doublon).
 *
 * Le fuseau du serveur fait foi ; les conteneurs tournent en TZ=Europe/Paris.
 * ('sv-SE' est la locale qui formate nativement en YYYY-MM-DD.)
 */
export function occurrenceKeyFor(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/**
 * Nom réduit à sa forme comparable : minuscules, sans accent, espaces normalisés.
 * Permet de reconnaître « Jean-Luc » et « jean luc » comme le même votant,
 * et donc de laisser quelqu'un revenir modifier son vote sans compte.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Les votes sont ouverts tant que l'organisateur n'a pas clôturé et que la deadline tient. */
export function isVotingOpen(event: { status: string; voteDeadline: Date }, now = new Date()): boolean {
  return event.status === 'ouvert' && event.voteDeadline.getTime() > now.getTime();
}
