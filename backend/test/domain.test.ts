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

const counts = (oui: number, si_besoin = 0, si_sceaux = 0, non = 0): Counts => ({
  oui,
  si_besoin,
  si_sceaux,
  non,
});

/** Raccourci : la proposition chiffrée pour un terrain donné. */
const proposal = (result: ReturnType<typeof recommendVenue>, venueId: 'five' | 'sceaux') =>
  result.proposals.find((item) => item.venueId === venueId)!;

describe('recommendVenue', () => {
  it('ne propose rien tant qu\'on est trop peu', () => {
    const { venueId, reason } = recommendVenue(counts(3, 1));
    expect(venueId).toBeNull();
    expect(reason).toContain(`il en faut ${MIN_PLAYERS}`);
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
    expect(reason).toBe('9 joueurs sûrs, 5 si besoin.');
  });

  it('ne propose que les deux lieux connus', () => {
    for (let oui = 0; oui <= 30; oui++) {
      const { venueId } = recommendVenue(counts(oui, 3));
      // Sous le minimum de joueurs, aucun lieu n'est proposé.
      if (venueId) expect(['five', 'sceaux']).toContain(venueId);
    }
  });

  it('le seuil du minimum est bien la frontière', () => {
    expect(recommendVenue(counts(MIN_PLAYERS - 1, 0)).venueId).toBeNull();
    expect(recommendVenue(counts(MIN_PLAYERS, 0)).venueId).toBe('five');
  });

  it('distingue personne n’a répondu de personne n’est dispo', () => {
    const vierge = recommendVenue(counts(0, 0, 0, 0));
    expect(vierge.outlook).toBe('vide');
    expect(vierge.reason).toContain('encore répondu');

    const tousNon = recommendVenue(counts(0, 0, 0, 5));
    expect(tousNon.outlook).toBe('vide');
    expect(tousNon.reason).toContain('dispo');
  });

  it('prévient quand on est vraiment trop nombreux', () => {
    const foule = recommendVenue(counts(26, 0));
    expect(foule.outlook).toBe('foule');
    expect(foule.venueId).toBe('sceaux');
  });

  it('accorde le pluriel des joueurs', () => {
    expect(recommendVenue(counts(1, 0)).reason).toBe(`1 joueur, il en faut ${MIN_PLAYERS}.`);
    expect(recommendVenue(counts(1, 5)).reason).toBe('1 joueur sûr, 5 si besoin.');
    expect(recommendVenue(counts(8, 0)).reason).toBe('8 joueurs sûrs.');
  });
});

describe('recommendVenue avec des « si au parc »', () => {
  it('ne compte jamais les « si au parc » pour le Five', () => {
    const result = recommendVenue(counts(5, 0, 10));
    expect(proposal(result, 'five').sure).toBe(5);
    expect(proposal(result, 'sceaux').sure).toBe(15);
  });

  it('fait basculer au parc quand ils y font la différence', () => {
    // Le Five réunit 8 joueurs et tiendrait, mais le parc en réunit 13.
    const result = recommendVenue(counts(8, 0, 5));
    expect(result.venueId).toBe('sceaux');
    expect(result.reason).toBe('13 joueurs sûrs.');
  });

  it('sauve un match que le Five ne permettrait pas', () => {
    // 3 sûrs seulement : trop peu au Five, mais 7 au parc.
    const result = recommendVenue(counts(3, 0, 4));
    expect(result.venueId).toBe('sceaux');
    expect(result.outlook).toBe('ok');
    expect(proposal(result, 'five').status).toBe('insuffisant');
  });

  it('reste au Five quand personne ne pose de condition de lieu', () => {
    const result = recommendVenue(counts(8, 2));
    expect(result.venueId).toBe('five');
    expect(proposal(result, 'five').sure).toBe(proposal(result, 'sceaux').sure);
  });

  it('additionne les « si besoin » aux deux terrains', () => {
    const result = recommendVenue(counts(4, 3, 2));
    expect(proposal(result, 'five').possible).toBe(7);
    expect(proposal(result, 'sceaux').possible).toBe(9);
  });

  it('marque le Five trop petit au-delà du seuil, sans jamais le retenir', () => {
    const result = recommendVenue(counts(SCEAUX_THRESHOLD, 0));
    expect(proposal(result, 'five').status).toBe('trop_petit');
    expect(result.venueId).toBe('sceaux');
  });
});

describe('recommendVenue est déterministe', () => {
  it('renvoie toujours les deux terrains, le retenu en premier', () => {
    for (let oui = 0; oui <= 15; oui++) {
      for (let sceaux = 0; sceaux <= 4; sceaux++) {
        const result = recommendVenue(counts(oui, 2, sceaux));
        expect(result.proposals).toHaveLength(2);
        expect(result.proposals.map((item) => item.venueId).sort()).toEqual(['five', 'sceaux']);
        // La proposition retenue est bien la première du classement.
        if (result.venueId) expect(result.proposals[0].venueId).toBe(result.venueId);
      }
    }
  });

  it('donne le même résultat pour les mêmes réponses', () => {
    for (let oui = 0; oui <= 20; oui++) {
      const input = counts(oui, 3, 2, 1);
      expect(recommendVenue(input)).toEqual(recommendVenue(input));
    }
  });

  it('départage en faveur du Five à effectif égal', () => {
    const result = recommendVenue(counts(10, 1));
    expect(result.venueId).toBe('five');
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
