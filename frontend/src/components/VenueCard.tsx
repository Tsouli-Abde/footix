import { isTomorrowOrSooner } from '../lib/dates';
import type { FootixEvent, Outlook, Proposal, ProposalStatus } from '../types';

/** Couleur de la carte selon la situation, pour que l'état se lise sans réfléchir. */
const TONE: Record<Outlook, string> = {
  vide: 'border-slate-200 bg-white',
  insuffisant: 'border-amber-200 bg-amber-50',
  incertain: 'border-amber-200 bg-amber-50',
  ok: 'border-green-200 bg-green-50',
  foule: 'border-green-200 bg-green-50',
};

const TEXT: Record<Outlook, { label: string; title: string; body: string }> = {
  vide: { label: 'text-slate-500', title: 'text-slate-700', body: 'text-slate-600' },
  insuffisant: { label: 'text-amber-700', title: 'text-amber-900', body: 'text-amber-800' },
  incertain: { label: 'text-amber-700', title: 'text-amber-900', body: 'text-amber-800' },
  ok: { label: 'text-green-700', title: 'text-green-900', body: 'text-green-800' },
  foule: { label: 'text-green-700', title: 'text-green-900', body: 'text-green-800' },
};

/** Ce qui empêche un terrain, quand quelque chose l'empêche. */
const STATUS_NOTE: Record<ProposalStatus, string | null> = {
  ok: null,
  juste: 'compte sur les si besoin',
  trop_petit: 'trop de monde',
  insuffisant: 'pas assez de monde',
};

/** « 9 joueurs », et le maximum atteignable quand il diffère. */
function proposalCount(proposal: Proposal): string {
  const base = `${proposal.sure} joueur${proposal.sure > 1 ? 's' : ''}`;
  return proposal.possible > proposal.sure ? `${base}, ${proposal.possible} au mieux` : base;
}

/**
 * Le détail des deux terrains, sous la proposition retenue. Utile seulement
 * quand ils ne réunissent pas le même monde, c'est-à-dire quand quelqu'un a
 * répondu « si au parc » : sinon les deux lignes diraient la même chose.
 */
function ProposalTable({ proposals, className }: { proposals: Proposal[]; className: string }) {
  const differ = proposals.some((proposal) => proposal.sure !== proposals[0].sure);
  if (!differ) return null;

  return (
    <ul className={`mt-3 space-y-1 border-t pt-2 text-xs ${className}`}>
      {proposals.map((proposal) => {
        const note = STATUS_NOTE[proposal.status];
        return (
          <li key={proposal.venue?.id ?? proposal.status} className="flex flex-wrap gap-x-2">
            <span className="font-medium">{proposal.venue?.label}</span>
            <span className="tabular-nums">{proposalCount(proposal)}</span>
            {note && <span className="opacity-70">({note})</span>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Le lieu conseillé tant que le sondage est ouvert, puis le lieu retenu une fois
 * clôturé. La veille du match, on arrête de dire « pour l'instant ».
 */
export function VenueCard({ event }: { event: FootixEvent }) {
  const settled = event.status === 'cloture';

  if (settled) {
    const venue = event.chosenVenue;
    if (!venue) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          Sondage clôturé sans lieu retenu.
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <p className="text-sm font-medium text-green-700">On joue à</p>
        <p className="text-xl font-bold text-green-900 sm:text-2xl">{venue.label}</p>
        <p className="mt-1 text-sm text-green-800">{venue.note}</p>
      </div>
    );
  }

  const { venue, outlook, reason, proposals } = event.recommendation;
  const imminent = isTomorrowOrSooner(event.matchDate);
  const tone = TONE[outlook];
  const text = TEXT[outlook];

  // Sans lieu proposé, on affiche seulement l'état des réponses.
  if (!venue) {
    return (
      <div className={`rounded-xl border px-5 py-4 ${tone}`}>
        <p className={`text-sm font-medium ${text.label}`}>{imminent ? 'C’est bientôt' : 'Pas encore décidé'}</p>
        <p className={`mt-1 ${text.body}`}>{reason}</p>
        <ProposalTable proposals={proposals} className={`border-black/10 ${text.body}`} />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-5 py-4 ${tone}`}>
      <p className={`text-sm font-medium ${text.label}`}>{imminent ? 'On part sur' : 'Pour l’instant, ça part sur'}</p>
      <p className={`text-xl font-bold sm:text-2xl ${text.title}`}>{venue.label}</p>
      <p className={`mt-1 text-sm ${text.body}`}>{reason}</p>
      <ProposalTable proposals={proposals} className={`border-black/10 ${text.body}`} />
    </div>
  );
}
