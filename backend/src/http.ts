import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

/** Erreur métier attendue : produit une réponse JSON propre plutôt qu'un 500. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Données utiles au client, ex. l'événement déjà existant en cas de doublon. */
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (message: string) => new ApiError(404, message);
export const badRequest = (message: string) => new ApiError(400, message);
export const conflict = (message: string, details?: unknown) => new ApiError(409, message, details);

/**
 * Enrobe un handler async pour que ses rejets partent dans le middleware d'erreur.
 * (Express 4 ne le fait pas tout seul.)
 */
export function route(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Requête invalide',
      details: err.issues.map((issue) => ({ champ: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  console.error('Erreur non gérée :', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
}
