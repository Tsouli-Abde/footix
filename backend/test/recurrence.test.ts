import { describe, expect, it } from 'vitest';
import { nextMatchDate } from '../src/recurrence.js';

const FRIDAY = 5;

describe('nextMatchDate', () => {
  it('vise le prochain jour voulu, à midi', () => {
    // Mardi 2026-08-04.
    const from = new Date('2026-08-04T09:00:00');
    const next = nextMatchDate({ weekday: FRIDAY }, from);
    expect(next.getDay()).toBe(FRIDAY);
    expect(next.getHours()).toBe(12);
    expect(next.toLocaleDateString('sv-SE')).toBe('2026-08-07');
  });

  it('passe à la semaine suivante si le créneau du jour est déjà passé', () => {
    // Vendredi 2026-08-07, 15h : midi est passé.
    const from = new Date('2026-08-07T15:00:00');
    const next = nextMatchDate({ weekday: FRIDAY }, from);
    expect(next.toLocaleDateString('sv-SE')).toBe('2026-08-14');
  });

  it('prend le jour même s\'il reste du temps avant midi', () => {
    // Vendredi 2026-08-07, 9h : midi est encore devant.
    const from = new Date('2026-08-07T09:00:00');
    const next = nextMatchDate({ weekday: FRIDAY }, from);
    expect(next.toLocaleDateString('sv-SE')).toBe('2026-08-07');
  });
});
