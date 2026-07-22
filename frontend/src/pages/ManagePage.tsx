import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { AnswerList } from '../components/AnswerList';
import { CopyLink } from '../components/CopyLink';
import { EventHeader } from '../components/EventHeader';
import { VenueCard } from '../components/VenueCard';
import { Alert, Button, Card, Field, inputClass, PageState } from '../components/ui';
import { usePolledEvent } from '../hooks/usePolledEvent';
import { toDateInput, toDateTimeLocal } from '../lib/dates';
import type { FootixEvent } from '../types';

/**
 * Vue organisateur. Avoir le lien suffit à gérer le sondage depuis n'importe
 * quel appareil, sans compte.
 */
export function ManagePage() {
  const { organizerToken = '' } = useParams();
  const navigate = useNavigate();

  const load = useCallback(() => api.getManagedEvent(organizerToken), [organizerToken]);
  const { event, setEvent, loading, error } = usePolledEvent(load);

  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!event) return <PageState loading={loading} error={error} />;

  const run = async (action: () => Promise<FootixEvent>) => {
    setActionError(null);
    try {
      setEvent(await action());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action impossible, réessaie.');
    }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer ce sondage et toutes les réponses ?')) return;
    try {
      await api.deleteEvent(organizerToken);
      navigate('/', { replace: true });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <EventHeader event={event} />
      <VenueCard event={event} />

      {actionError && <Alert>{actionError}</Alert>}

      <Card className="space-y-4">
        <CopyLink path={`/e/${event.publicToken}`} label="Lien à partager" hint="Celui qu’on colle sur Teams." />
        <CopyLink
          path={`/manage/${organizerToken}`}
          label="Ton lien de gestion"
          hint="Garde-le pour toi, il permet de clôturer et de modifier."
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Qui vient</h2>
        <AnswerList event={event} onRemove={event.votingOpen ? (id) => void run(() => api.removeParticipant(event.publicToken, id)) : undefined} />
      </Card>

      {event.status === 'ouvert' ? (
        <CloseCard event={event} onClose={(venueId) => void run(() => api.closeEvent(organizerToken, venueId))} />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Le sondage est clôturé. Tu peux le rouvrir si tu as été trop vite.</p>
          <Button variant="secondary" onClick={() => void run(() => api.reopenEvent(organizerToken))}>
            Rouvrir
          </Button>
        </Card>
      )}

      {editing ? (
        <EditCard
          event={event}
          onCancel={() => setEditing(false)}
          onSave={async (input) => {
            await run(() => api.updateEvent(organizerToken, input));
            setEditing(false);
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <Button variant="danger" onClick={remove}>
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}

/** Clôture : l'app conseille un lieu, l'organisateur valide ou choisit autre chose. */
function CloseCard({ event, onClose }: { event: FootixEvent; onClose: (venueId: string | null) => void }) {
  const suggested = event.recommendation.venue?.id ?? '';
  const [choice, setChoice] = useState(suggested);

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Clôturer</h2>
        <p className="mt-1 text-sm text-slate-500">
          {event.recommendation.venue
            ? `L’app propose ${event.recommendation.venue.label}, mais tu décides.`
            : 'Choisis le lieu, ou clôture sans si le match tombe à l’eau.'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="On joue où">
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className={`${inputClass} sm:w-80`}>
            <option value="">Nulle part, match annulé</option>
            {event.venues?.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.label}
                {venue.id === suggested ? ' (conseillé)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Button onClick={() => onClose(choice || null)}>Clôturer</Button>
      </div>
    </Card>
  );
}

function EditCard({
  event,
  onSave,
  onCancel,
}: {
  event: FootixEvent;
  onSave: (input: { title: string; description: string | null; matchDate: string; voteDeadline: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [matchDate, setMatchDate] = useState(toDateInput(new Date(event.matchDate)));
  const [voteDeadline, setVoteDeadline] = useState(toDateTimeLocal(new Date(event.voteDeadline)));

  return (
    <Card className="space-y-5">
      <h2 className="text-lg font-semibold">Modifier</h2>

      <Field label="Titre">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputClass} />
      </Field>

      <Field label="Précision">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jour du match" hint="L’heure reste midi.">
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Fin des réponses">
          <input
            type="datetime-local"
            value={voteDeadline}
            onChange={(e) => setVoteDeadline(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => {
            const [year, month, day] = matchDate.split('-').map(Number);
            onSave({
              title: title.trim(),
              description: description.trim() || null,
              matchDate: new Date(year, month - 1, day, 12, 0, 0, 0).toISOString(),
              voteDeadline: new Date(voteDeadline).toISOString(),
            });
          }}
        >
          Enregistrer
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </Card>
  );
}
