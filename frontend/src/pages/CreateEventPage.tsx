import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { Alert, Button, Card, inputClass } from '../components/ui';
import { formatMatchDate, toDateInput, upcomingFridays } from '../lib/dates';
import { rememberName, rememberedName } from '../lib/names';
import type { EventSummary } from '../types';

const FRIDAYS = upcomingFridays(3);

/** La date suffit à créer un sondage, tout le reste a une valeur par défaut. */
export function CreateEventPage() {
  const navigate = useNavigate();

  const [matchDate, setMatchDate] = useState(FRIDAYS[0]);
  const [customDate, setCustomDate] = useState(false);

  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  /** Heure explicite. Null tant qu'on garde le créneau de midi. */
  const [time, setTime] = useState<string | null>(null);
  const [organizerName, setOrganizerName] = useState(rememberedName);

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
        matchTime: time || undefined,
        organizerName: organizerName.trim() || undefined,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
      });
      if (organizerName.trim()) rememberName(organizerName.trim());
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
      <h1 className="text-2xl font-bold">On joue quand ?</h1>

      {duplicate && (
        <Alert tone="info">
          Un sondage existe déjà ce jour-là.{' '}
          <Link to={`/e/${duplicate.publicToken}`} className="font-medium underline">
            L’ouvrir
          </Link>
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

      </Card>

      <Card className="space-y-2">
        <label htmlFor="organizer" className="block text-sm font-medium text-slate-700">
          Ton prénom
        </label>
        <input
          id="organizer"
          value={organizerName}
          onChange={(e) => setOrganizerName(e.target.value)}
          placeholder="Prénom"
          maxLength={60}
          className={`${inputClass} sm:max-w-xs`}
        />
      </Card>

      <div className="space-y-3">
        {time === null ? (
          <OptionalButton onClick={() => setTime('12:00')}>+ Fixer une heure</OptionalButton>
        ) : (
          <OptionalField label="Heure du match" onRemove={() => setTime(null)}>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${inputClass} sm:max-w-xs`}
            />
          </OptionalField>
        )}

        {title === null ? (
          <OptionalButton onClick={() => setTitle('')}>+ Changer le titre</OptionalButton>
        ) : (
          <OptionalField label="Titre" onRemove={() => setTitle(null)}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={formatMatchDate(matchDate.toISOString())}
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
