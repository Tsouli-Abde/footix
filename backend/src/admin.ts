import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ApiError } from './http.js';

/**
 * Le mot de passe qui ouvre la vue d'administration.
 *
 * Un mot de passe partagé, pas des comptes : c'est le même parti pris que les
 * tokens dans les liens, adapté à un outil interne d'une trentaine de personnes.
 * Il se change par `ADMIN_PASSWORD` sans toucher au code.
 *
 * Ce que ça ne prétend pas être : de l'authentification. Il n'y a pas d'identité,
 * pas de traçabilité de qui a fait quoi, et le mot de passe circule dans un
 * en-tête à chaque appel, donc uniquement derrière HTTPS.
 */
const DEFAULT_PASSWORD = 'motusadmin';

export const ADMIN_HEADER = 'x-admin-password';

const adminPassword = () => process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

/**
 * Comparaison à temps constant.
 *
 * On compare les empreintes plutôt que les mots de passe : `timingSafeEqual`
 * exige deux tampons de même longueur, et un SHA-256 en fait toujours 32 octets.
 * Sinon la seule longueur du mot de passe fuirait par le temps de réponse.
 */
function matches(candidate: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(candidate), digest(adminPassword()));
}

/** Vrai si l'en-tête reçu porte le bon mot de passe. */
export function isAdmin(header: unknown): boolean {
  return typeof header === 'string' && header.length > 0 && matches(header);
}

/** Refuse la requête si l'en-tête d'administration manque ou ne correspond pas. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!isAdmin(req.headers[ADMIN_HEADER])) {
    next(new ApiError(401, 'Mot de passe administrateur invalide'));
    return;
  }
  next();
};
