import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { AVAILABILITY_BUTTON, AVAILABILITY_HINTS, AVAILABILITY_LABELS } from '../lib/availability';
import { rememberAnswer, rememberedAnswer, rememberName, rememberedName } from '../lib/names';
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
 * Doodle : réutiliser le même prénom remplace la réponse précédente.
 *
 * « Ma » réponse est celle envoyée depuis cet appareil (son id est gardé en
 * local), jamais celle que la liste contiendrait sous un prénom identique.
 */
export function AnswerForm({ event, onAnswered }: Props) {
  const [name, setName] = useState(rememberedName);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myAnswerId = rememberedAnswer(event.publicToken);
  const mine = myAnswerId ? event.participants.find((person) => person.id === myAnswerId) : undefined;

  // On présélectionne sa propre réponse : changer d'avis devient un seul clic.
  useEffect(() => {
    if (mine) setAvailability(mine.availability);
  }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!availability) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.answer(event.publicToken, name.trim(), availability);
      rememberName(name.trim());
      rememberAnswer(event.publicToken, result.participantId);
      onAnswered(result.event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible, réessaie.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">{mine ? 'Changer ta réponse' : 'Tu viens ?'}</h2>

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

        <Button
          onClick={send}
          disabled={name.trim().length < 2 || !availability || sending}
          className="w-full sm:w-auto"
        >
          {sending ? 'Envoi...' : mine ? 'Mettre à jour' : 'Envoyer'}
        </Button>
      </div>
    </Card>
  );
}
