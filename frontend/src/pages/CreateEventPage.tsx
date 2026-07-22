import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { OptionsEditor, SUGGESTED_OPTIONS, type OptionDraft } from '../components/OptionsEditor';
import { Alert, Button, Card, Field, inputClass } from '../components/ui';
import { nextFridayEvening, toDateTimeLocal } from '../lib/dates';
import type { EventSummary } from '../types';

const defaultMatchDate = nextFridayEvening();
const defaultDeadline = new Date(defaultMatchDate.getTime() - 25 * 60 * 60 * 1000);

export function CreateEventPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('Foot du vendredi');
  const [description, setDescription] = useState('');
  const [matchDate, setMatchDate] = useState(toDateTimeLocal(defaultMatchDate));
  const [voteDeadline, setVoteDeadline] = useState(toDateTimeLocal(defaultDeadline));
  const [options, setOptions] = useState<OptionDraft[]>(
    SUGGESTED_OPTIONS.slice(0, 3).map((label) => ({ label, capacity: null })),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Événement déjà présent à cette date : on y renvoie plutôt que d'en créer un second. */
  const [duplicate, setDuplicate] = useState<EventSummary | null>(null);

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    setSubmitting(true);
    setError(null);
    setDuplicate(null);

    try {
      const created = await api.createEvent({
        title: title.trim(),
        description: description.trim() || null,
        matchDate: new Date(matchDate).toISOString(),
        voteDeadline: new Date(voteDeadline).toISOString(),
        options: options
          .filter((option) => option.label.trim())
          .map((option) => ({ label: option.label.trim(), capacity: option.capacity })),
      });

      navigate(`/manage/${created.organizerToken}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDuplicate((err.details as { event: EventSummary }).event);
      } else {
        setError(err instanceof ApiError ? err.message : 'Création impossible, réessaie.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nouveau match</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tu recevras deux liens : un à partager sur Teams, un à garder pour clôturer le vote.
        </p>
      </div>

      {duplicate && (
        <Alert tone="info">
          <p className="font-medium">Un sondage existe déjà pour cette date : « {duplicate.title} ».</p>
          <p className="mt-1">
            Inutile d’en créer un second —{' '}
            <Link to={`/e/${duplicate.publicToken}`} className="font-medium underline">
              va voter sur celui-ci
            </Link>
            , ou change la date du match ci-dessous.
          </p>
        </Alert>
      )}

      <Card className="space-y-5">
        <Field label="Titre">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={inputClass} />
        </Field>

        <Field label="Description" hint="Facultatif : rappel du créneau, consignes, etc.">
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
              required
              className={inputClass}
            />
          </Field>
          <Field label="Fin des votes" hint="Après cette heure, plus personne ne peut voter.">
            <input
              type="datetime-local"
              value={voteDeadline}
              onChange={(e) => setVoteDeadline(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Options proposées au vote</h2>
        <OptionsEditor options={options} onChange={setOptions} />
      </Card>

      {error && <Alert>{error}</Alert>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer le sondage'}
        </Button>
        <Link to="/">
          <Button type="button" variant="ghost">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  );
}
