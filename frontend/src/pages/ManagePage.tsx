import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { CopyLink } from '../components/CopyLink';
import { EventHeader, WinnerBanner } from '../components/EventHeader';
import { OptionsEditor, type OptionDraft } from '../components/OptionsEditor';
import { VoteTable } from '../components/VoteTable';
import { Alert, Button, Card, Field, inputClass, PageState } from '../components/ui';
import { usePolledEvent } from '../hooks/usePolledEvent';
import { toDateTimeLocal } from '../lib/dates';
import { leadingOption } from '../lib/votes';
import type { FootixEvent } from '../types';

/**
 * Vue organisateur. La possession du lien fait office d'autorisation : il ouvre
 * l'édition et la clôture depuis n'importe quel appareil, sans compte.
 */
export function ManagePage() {
  const { organizerToken = '' } = useParams();
  const navigate = useNavigate();

  const load = useCallback(() => api.getManagedEvent(organizerToken), [organizerToken]);
  const { event, setEvent, loading, error } = usePolledEvent(load);

  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!event) return <PageState loading={loading} error={error} />;

  const leader = leadingOption(event.options);

  const run = async (action: () => Promise<FootixEvent>) => {
    setActionError(null);
    try {
      setEvent(await action());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action impossible, réessaie.');
    }
  };

  const removeParticipant = (participantId: string) =>
    void run(() => api.removeParticipant(event.publicToken, participantId));

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement ce sondage et tous ses votes ?')) return;
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
      <WinnerBanner event={event} />

      {actionError && <Alert>{actionError}</Alert>}

      <Card className="space-y-4">
        <CopyLink
          path={`/e/${event.publicToken}`}
          label="Lien participant"
          hint="C’est celui-ci qu’on partage sur Teams."
        />
        <CopyLink
          path={`/manage/${organizerToken}`}
          label="Lien organisateur"
          hint="Garde-le pour toi : il permet de modifier et de clôturer le vote."
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Résultats</h2>
        <VoteTable
          event={event}
          highlightOptionId={event.winningOptionId ?? leader?.id}
          onRemoveParticipant={event.votingOpen ? removeParticipant : undefined}
        />
      </Card>

      {event.status === 'ouvert' ? (
        <CloseCard event={event} leaderId={leader?.id ?? null} onClose={(id) => run(() => api.closeEvent(organizerToken, id))} />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Le vote est clôturé. Tu peux le rouvrir si c’était prématuré.</p>
          <Button variant="secondary" onClick={() => void run(() => api.reopenEvent(organizerToken))}>
            Rouvrir le vote
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
            Modifier le sondage
          </Button>
          <Button variant="danger" onClick={remove}>
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}

/** Clôture : l'organisateur tranche lui-même, l'option en tête n'est qu'une suggestion. */
function CloseCard({
  event,
  leaderId,
  onClose,
}: {
  event: FootixEvent;
  leaderId: string | null;
  onClose: (winningOptionId: string | null) => void;
}) {
  const [choice, setChoice] = useState(leaderId ?? '');

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Clôturer le vote</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choisis l’option retenue et annonce-la. Rien n’est décidé automatiquement.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Option retenue">
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className={`${inputClass} sm:w-72`}>
            <option value="">Aucune (match annulé)</option>
            {event.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} — {option.counts.oui} oui, {option.counts.si_besoin} si besoin
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
  onSave: (input: {
    title: string;
    description: string | null;
    matchDate: string;
    voteDeadline: string;
    options: OptionDraft[];
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [matchDate, setMatchDate] = useState(toDateTimeLocal(new Date(event.matchDate)));
  const [voteDeadline, setVoteDeadline] = useState(toDateTimeLocal(new Date(event.voteDeadline)));
  const [options, setOptions] = useState<OptionDraft[]>(
    event.options.map((option) => ({ id: option.id, label: option.label, capacity: option.capacity })),
  );

  return (
    <Card className="space-y-5">
      <h2 className="text-lg font-semibold">Modifier le sondage</h2>

      <Field label="Titre">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputClass} />
      </Field>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date et heure du match">
          <input
            type="datetime-local"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Fin des votes">
          <input
            type="datetime-local"
            value={voteDeadline}
            onChange={(e) => setVoteDeadline(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Options</p>
        <OptionsEditor options={options} onChange={setOptions} warnOnRemove />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.trim() || null,
              matchDate: new Date(matchDate).toISOString(),
              voteDeadline: new Date(voteDeadline).toISOString(),
              options: options
                .filter((option) => option.label.trim())
                .map((option) => ({ ...option, label: option.label.trim() })),
            })
          }
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
