import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { Alert, Button, Card, inputClass } from '../components/ui';
import { defaultDeadlineFor, formatMatchDate, toDateInput, toDateTimeLocal, upcomingFridays } from '../lib/dates';
import type { EventSummary } from '../types';

const FRIDAYS = upcomingFridays(3);

/**
 * Créer un sondage tient en un clic : la date suffit, tout le reste a une valeur
 * par défaut. Les champs facultatifs restent cachés derrière un bouton pour que
 * ça se voie qu'ils le sont.
 */
export function CreateEventPage() {
  const navigate = useNavigate();

  const [matchDate, setMatchDate] = useState(FRIDAYS[0]);
  const [customDate, setCustomDate] = useState(false);

  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Sondage déjà présent ce jour-là : on y renvoie au lieu d'en créer un deuxième. */
  const [duplicate, setDuplicate] = useState<EventSummary | null>(null);

  const create = async () => {
    setSubmitting(true);
    setError(null);
    setDuplicate(null);

    try {
      const created = await api.createEvent({
        matchDate: matchDate.toISOString(),
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        voteDeadline: deadline ? new Date(deadline).toISOString() : undefined,
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

  const pickDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (year && month && day) setMatchDate(new Date(year, month - 1, day, 12, 0, 0, 0));
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">On joue quand ?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choisis un jour et c’est parti. Le reste est facultatif, tu peux tout laisser tel quel.
        </p>
      </div>

      {duplicate && (
        <Alert tone="info">
          <p className="font-medium">Il y a déjà un sondage ce jour-là.</p>
          <p className="mt-1">
            Pas la peine d’en ouvrir un deuxième,{' '}
            <Link to={`/e/${duplicate.publicToken}`} className="font-medium underline">
              réponds sur celui-ci
            </Link>{' '}
            ou prends un autre jour.
          </p>
        </Alert>
      )}

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FRIDAYS.map((friday) => {
            const selected = !customDate && friday.getTime() === matchDate.getTime();
            return (
              <button
                key={friday.toISOString()}
                type="button"
                onClick={() => {
                  setCustomDate(false);
                  setMatchDate(friday);
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-green-500'
                }`}
              >
                {formatMatchDate(friday.toISOString())}
              </button>
            );
          })}

          {!customDate && (
            <button
              type="button"
              onClick={() => setCustomDate(true)}
              className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-green-400 hover:text-green-700"
            >
              + Un autre jour
            </button>
          )}
        </div>

        {customDate && (
          <input type="date" value={toDateInput(matchDate)} onChange={(e) => pickDate(e.target.value)} className={`${inputClass} sm:max-w-xs`} />
        )}

        <p className="text-sm text-slate-500">
          On joue sur la pause déj, pas besoin de préciser l’heure. Les réponses ferment{' '}
          {deadline ? 'à l’heure que tu as choisie' : 'la veille à 18h'}.
        </p>
      </Card>

      <div className="space-y-3">
        {title === null ? (
          <OptionalButton onClick={() => setTitle('')}>+ Changer le titre</OptionalButton>
        ) : (
          <OptionalField label="Titre" onRemove={() => setTitle(null)}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Foot vendredi ?"
              maxLength={120}
              className={inputClass}
            />
          </OptionalField>
        )}

        {description === null ? (
          <OptionalButton onClick={() => setDescription('')}>+ Ajouter un mot</OptionalButton>
        ) : (
          <OptionalField label="Précision" onRemove={() => setDescription(null)}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="On se retrouve devant l’entrée à midi pile."
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </OptionalField>
        )}

        {deadline === null ? (
          <OptionalButton onClick={() => setDeadline(toDateTimeLocal(defaultDeadlineFor(matchDate)))}>
            + Changer la deadline
          </OptionalButton>
        ) : (
          <OptionalField label="Fin des réponses" onRemove={() => setDeadline(null)}>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`${inputClass} sm:max-w-xs`}
            />
          </OptionalField>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="flex gap-3">
        <Button onClick={create} disabled={submitting}>
          {submitting ? 'Création...' : 'Créer le sondage'}
        </Button>
        <Link to="/">
          <Button variant="ghost">Annuler</Button>
        </Link>
      </div>
    </div>
  );
}

function OptionalButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mr-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-green-400 hover:text-green-700"
    >
      {children}
    </button>
  );
}

function OptionalField({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button type="button" onClick={onRemove} className="text-xs text-slate-400 hover:text-slate-700">
          Retirer
        </button>
      </div>
      {children}
    </Card>
  );
}
