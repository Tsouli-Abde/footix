import { Link } from 'react-router-dom';
import { eventTitle, formatMatchSlot } from '../../lib/dates';
import type { FootixEvent } from '../../types';
import { Badge, Button, Card } from '../ui';

type Props = {
  events: FootixEvent[];
  busy: string | null;
  onClose: (event: FootixEvent) => void;
  onReopen: (event: FootixEvent) => void;
  onDelete: (event: FootixEvent) => void;
};

function StatusBadge({ event }: { event: FootixEvent }) {
  if (event.status === 'cloture') return <Badge className="bg-slate-200 text-slate-700">Clôturé</Badge>;
  if (event.votingOpen) return <Badge className="bg-green-100 text-green-800">Ouvert</Badge>;
  return <Badge className="bg-amber-100 text-amber-800">Match passé</Badge>;
}

/**
 * Tous les sondages, en cours et passés, avec de quoi agir.
 *
 * Les actions passent par les routes /manage et le token de gestion que la liste
 * admin renvoie : c'est exactement ce que fait l'organisateur, sans dupliquer
 * l'API côté serveur.
 */
export function AdminEvents({ events, busy, onClose, onReopen, onDelete }: Props) {
  if (events.length === 0) {
    return (
      <Card className="text-center text-sm text-slate-500">Aucun sondage. Il n’y a rien à administrer encore.</Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const working = busy === event.id;
        return (
          <Card key={event.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{eventTitle(event)}</h3>
                  <StatusBadge event={event} />
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{formatMatchSlot(event)}</p>
              </div>

              <p className="text-right text-xs text-slate-500">
                <span className="tabular-nums">{event.counts.oui}</span> présent(s)
                {event.counts.si_sceaux > 0 && (
                  <>
                    <br />
                    <span className="tabular-nums">{event.counts.si_sceaux}</span> si au parc
                  </>
                )}
                {event.chosenVenue && (
                  <>
                    <br />
                    {event.chosenVenue.label}
                  </>
                )}
                {event.score && (
                  <>
                    <br />
                    Score {event.score}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/manage/${event.organizerToken}`}>
                <Button variant="secondary">Gérer</Button>
              </Link>
              <Link to={`/e/${event.publicToken}`}>
                <Button variant="ghost">Voir</Button>
              </Link>

              {event.status === 'ouvert' ? (
                <Button variant="secondary" disabled={working} onClick={() => onClose(event)}>
                  Clôturer
                </Button>
              ) : (
                <Button variant="secondary" disabled={working} onClick={() => onReopen(event)}>
                  Rouvrir
                </Button>
              )}

              <Button variant="danger" disabled={working} onClick={() => onDelete(event)}>
                Supprimer
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
