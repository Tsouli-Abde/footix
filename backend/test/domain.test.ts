import { describe, expect, it } from 'vitest';
import {
  atMatchHour,
  defaultDeadlineFor,
  isVotingOpen,
  MIN_PLAYERS,
  normalizeName,
  occurrenceKeyFor,
  recommendVenue,
  SCEAUX_THRESHOLD,
  type Counts,
} from '../src/domain.js';

const counts = (oui: number, si_besoin = 0, non = 0): Counts => ({ oui, si_besoin, non });

describe('recommendVenue', () => {
  it('ne propose rien tant qu\'on est trop peu', () => {
    const { venueId, reason } = recommendVenue(counts(3, 1));
    expect(venueId).toBeNull();
    expect(reason).toContain('manque');
  });

  it('compte les "si besoin" pour atteindre le minimum, sans les traiter comme des présents', () => {
    // 4 sûrs + 2 si besoin = 6 potentiels : au-dessus du minimum, donc on propose.
    const { venueId } = recommendVenue(counts(4, 2));
    expect(venueId).toBe('five');
  });

  it('envoie au Five entre le minimum et le seuil du parc', () => {
    const { venueId } = recommendVenue(counts(8, 0));
    expect(venueId).toBe('five');
  });

  it('bascule au Parc de Sceaux dès le seuil de joueurs sûrs', () => {
    const { venueId } = recommendVenue(counts(SCEAUX_THRESHOLD, 0));
    expect(venueId).toBe('sceaux');
  });

  it('reste au Five sous le seuil même si les "si besoin" feraient le nombre', () => {
    const { venueId, reason } = recommendVenue(counts(9, 5));
    expect(venueId).toBe('five');
    expect(reason).toContain('parc');
  });

  it('ne recommande jamais le match externe', () => {
    for (let oui = 0; oui <= 30; oui++) {
      expect(recommendVenue(counts(oui, 3)).venueId).not.toBe('externe');
    }
  });

  it('le seuil du minimum est bien la frontière', () => {
    expect(recommendVenue(counts(MIN_PLAYERS - 1, 0)).venueId).toBeNull();
    expect(recommendVenue(counts(MIN_PLAYERS, 0)).venueId).toBe('five');
  });
});

describe('normalizeName', () => {
  it('reconnaît la même personne malgré casse, accents et ponctuation', () => {
    expect(normalizeName('Jean-Luc')).toBe(normalizeName('jean luc'));
    expect(normalizeName('Élodie')).toBe(normalizeName('elodie'));
    expect(normalizeName('  Tsouli  ')).toBe('tsouli');
  });

  it('renvoie une chaîne vide pour un nom sans lettre exploitable', () => {
    expect(normalizeName('***')).toBe('');
  });
});

describe('occurrenceKeyFor', () => {
  it('produit une clé au jour, indépendante de l\'heure', () => {
    const matin = occurrenceKeyFor(new Date('2026-08-07T09:00:00'));
    const midi = occurrenceKeyFor(new Date('2026-08-07T12:00:00'));
    expect(matin).toBe(midi);
    expect(matin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('atMatchHour et defaultDeadlineFor', () => {
  it('ramène toujours le match à midi', () => {
    expect(atMatchHour(new Date('2026-08-07T08:30:00')).getHours()).toBe(12);
  });

  it('place la deadline la veille à 18h', () => {
    const deadline = defaultDeadlineFor(new Date('2026-08-07T12:00:00'));
    expect(deadline.getHours()).toBe(18);
    expect(deadline.getDate()).toBe(6);
    expect(deadline < new Date('2026-08-07T12:00:00')).toBe(true);
  });
});

describe('isVotingOpen', () => {
  const futur = new Date(Date.now() + 3_600_000);
  const passe = new Date(Date.now() - 3_600_000);

  it('ouvert si le statut est ouvert et la deadline à venir', () => {
    expect(isVotingOpen({ status: 'ouvert', voteDeadline: futur })).toBe(true);
  });

  it('fermé une fois la deadline passée', () => {
    expect(isVotingOpen({ status: 'ouvert', voteDeadline: passe })).toBe(false);
  });

  it('fermé si clôturé, même avant la deadline', () => {
    expect(isVotingOpen({ status: 'cloture', voteDeadline: futur })).toBe(false);
  });
});
