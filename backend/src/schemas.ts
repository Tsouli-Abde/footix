import { z } from 'zod';
import { AVAILABILITY_VALUES, VENUES } from './domain.js';

const venueId = z.enum(Object.keys(VENUES) as [string, ...string[]]);

/**
 * Création d'un sondage. Seule la date est vraiment nécessaire : le reste a des
 * valeurs par défaut côté route, pour qu'on puisse créer un "foot vendredi ?"
 * en un clic.
 */
const matchTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure attendue au format HH:MM')
  .nullable()
  .optional();

export const createEventSchema = z.object({
  title: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  matchDate: z.coerce.date(),
  /** Heure explicite. Absente, on garde midi sans l'afficher. */
  matchTime,
  /** Prénom du créateur, affiché comme organisateur. */
  organizerName: z.string().trim().max(60).nullable().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  matchDate: z.coerce.date().optional(),
  matchTime,
});

export const closeEventSchema = z.object({
  /** null = clôturer sans lieu retenu, par exemple si le match tombe à l'eau. */
  chosenVenue: venueId.nullable().optional(),
});

export const answerSchema = z.object({
  name: z.string().trim().min(2, 'Il me faut au moins deux lettres').max(60),
  availability: z.enum(AVAILABILITY_VALUES),
});

/** Renommage d'un joueur depuis la vue admin. */
export const adminPlayerSchema = z.object({
  name: z.string().trim().min(2, 'Il me faut au moins deux lettres').max(60),
});

export const createTemplateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  weekday: z.number().int().min(0).max(6),
  deadlineHoursBefore: z.number().int().min(1).max(336).default(18),
  leadTimeDays: z.number().int().min(1).max(14).default(3),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  active: z.boolean().optional(),
});
