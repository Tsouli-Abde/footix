import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { AVAILABILITY_BUTTON, AVAILABILITY_HINTS, AVAILABILITY_LABELS } from '../lib/availability';
import { normalizeName, rememberName, rememberedName } from '../lib/names';
import { AVAILABILITY_VALUES, type Availability, type FootixEvent } from '../types';
import { Alert, Button, Card, inputClass } from './ui';

type Props = {
  event: FootixEvent;
  onAnswered: (event: FootixEvent) => void;
};

/**
 * Une seule question : tu viens ou pas.
 *
 * Pas d'authentification, c'est le prénom qui identifie la personne, comme sur
 * Doodle. Ressaisir le même prénom recharge sa réponse et la remplace, sauf si
 * la personne indique être un homonyme.
 */
export function AnswerForm({ event, onAnswered }: Props) {
  const [name, setName] = useState(rememberedName);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameKey = normalizeName(name);
  const existing = useMemo(
    () => (nameKey ? event.participants.find((person) => normalizeName(person.name) === nameKey) : undefined),
    [event.participants, nameKey],
  );

  // Dès qu'on reconnaît la personne, on présélectionne sa réponse actuelle :
  // changer d'avis devient un seul clic.
  useEffect(() => {
    if (existing) setAvailability(existing.availability);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!availability) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.answer(event.publicToken, name.trim(), availability);
      rememberName(name.trim());
      onAnswered(result.event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible, réessaie.');
    } finally {
      setSending(false);
    }
  };

  const knownAnswer = Boolean(existing);

  return (
    <Card>
      <h2 className="text-lg font-semibold">{knownAnswer ? 'Changer ta réponse' : 'Tu viens ?'}</h2>
      {/* Quand le prénom est déjà pris, le bandeau plus bas dit tout, pas la
          peine de répéter la réponse actuelle ici. */}
      {!knownAnswer && <p className="mt-1 text-sm text-slate-500">Ton prénom, ta réponse, et c’est réglé.</p>}

      <div className="mt-4 space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton prénom"
          autoComplete="given-name"
          className={`${inputClass} sm:max-w-xs`}
        />

        {/* Le prénom fait office d'identité, premier arrivé premier servi. On
            prévient donc avant d'écraser la réponse de quelqu'un d'autre. */}
        {existing && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p>
              <span className="font-medium">{existing.name}</span> a déjà répondu{' '}
              {AVAILABILITY_LABELS[existing.availability].toLowerCase()}.
            </p>
            <p className="mt-1">
              Si c’est toi, continue, ta réponse sera mise à jour. Sinon ajoute de quoi vous distinguer, par exemple{' '}
              <span className="font-medium">{name.trim()} B</span>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {AVAILABILITY_VALUES.map((value) => {
            const selected = availability === value;
            const styles = AVAILABILITY_BUTTON[value];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setAvailability(value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${selected ? styles.active : styles.idle}`}
              >
                <span className="block font-semibold">{AVAILABILITY_LABELS[value]}</span>
                <span className={`block text-xs ${selected ? 'opacity-90' : 'text-slate-400'}`}>
                  {AVAILABILITY_HINTS[value]}
                </span>
              </button>
            );
          })}
        </div>

        {error && <Alert>{error}</Alert>}

        <Button onClick={send} disabled={nameKey.length < 2 || !availability || sending} className="w-full sm:w-auto">
          {sending ? 'Envoi...' : knownAnswer ? 'Mettre à jour' : 'Envoyer'}
        </Button>
      </div>
    </Card>
  );
}
