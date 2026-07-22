import { z } from 'zod';
import { VOTE_VALUES } from './domain.js';

const label = z.string().trim().min(1, 'Le libellé est obligatoire').max(60, 'Libellé trop long');

const optionInput = z.object({
  /** Fourni lors d'une édition pour conserver les votes déjà exprimés sur cette option. */
  id: z.string().optional(),
  label,
  capacity: z.number().int().positive().max(99).nullable().optional(),
});

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Le titre est obligatoire').max(120),
    description: z.string().trim().max(500).nullable().optional(),
    matchDate: z.coerce.date(),
    voteDeadline: z.coerce.date(),
    options: z.array(optionInput).min(1, 'Au moins une option').max(10, 'Dix options maximum'),
  })
  .refine((data) => data.voteDeadline <= data.matchDate, {
    message: 'La deadline de vote doit précéder le match',
    path: ['voteDeadline'],
  });

export const updateEventSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  matchDate: z.coerce.date().optional(),
  voteDeadline: z.coerce.date().optional(),
  options: z.array(optionInput).min(1).max(10).optional(),
});

export const closeEventSchema = z.object({
  /** Option retenue. null = clôturer sans désigner de gagnant (match annulé, par ex.). */
  winningOptionId: z.string().nullable().optional(),
});

export const submitVoteSchema = z.object({
  name: z.string().trim().min(2, 'Indique ton prénom').max(60),
  votes: z
    .array(
      z.object({
        optionId: z.string(),
        value: z.enum(VOTE_VALUES),
      }),
    )
    .min(1, 'Réponds au moins sur une option'),
});

const templateOptionInput = z.object({
  label,
  capacity: z.number().int().positive().max(99).nullable().optional(),
});

export const createTemplateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  weekday: z.number().int().min(0).max(6),
  matchTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure attendue au format HH:MM'),
  deadlineHoursBefore: z.number().int().min(1).max(336).default(26),
  leadTimeDays: z.number().int().min(1).max(14).default(3),
  options: z.array(templateOptionInput).min(1).max(10),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  active: z.boolean().optional(),
});
