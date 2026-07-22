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
 * Pas d'authentification, c'est le prénom qui identifie la personne. Ressaisir
 * le même prénom recharge sa réponse et la remplace.
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

  return (
    <Card>
      <h2 className="text-lg font-semibold">{existing ? 'Changer ta réponse' : 'Tu viens ?'}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {existing
          ? `Tu as répondu ${AVAILABILITY_LABELS[existing.availability]}. Tu peux changer jusqu’à la deadline.`
          : 'Ton prénom, ta réponse, et c’est réglé.'}
      </p>

      <div className="mt-4 space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton prénom"
          autoComplete="given-name"
          className={`${inputClass} sm:max-w-xs`}
        />

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

        <Button onClick={send} disabled={nameKey.length < 2 || !availability || sending}>
          {sending ? 'Envoi...' : existing ? 'Mettre à jour' : 'Envoyer'}
        </Button>
      </div>
    </Card>
  );
}
