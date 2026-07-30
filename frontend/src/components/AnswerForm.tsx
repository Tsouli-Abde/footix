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
  /** L'utilisateur a confirmé être une autre personne portant le même prénom. */
  const [isHomonym, setIsHomonym] = useState(false);

  const nameKey = normalizeName(name);
  const existing = useMemo(
    () => (nameKey ? event.participants.find((person) => normalizeName(person.name) === nameKey) : undefined),
    [event.participants, nameKey],
  );

  // Dès qu'on reconnaît la personne, on présélectionne sa réponse actuelle :
  // changer d'avis devient un seul clic.
  useEffect(() => {
    if (existing && !isHomonym) setAvailability(existing.availability);
  }, [existing?.id, isHomonym]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changer de prénom annule la déclaration d'homonymie, qui ne vaut que pour
  // le prénom sur lequel elle a été faite.
  useEffect(() => setIsHomonym(false), [nameKey]);

  const send = async () => {
    if (!availability) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.answer(event.publicToken, name.trim(), availability, isHomonym);
      rememberName(name.trim());
      setIsHomonym(false);
      onAnswered(result.event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible, réessaie.');
    } finally {
      setSending(false);
    }
  };

  const knownAnswer = existing && !isHomonym;

  return (
    <Card>
      <h2 className="text-lg font-semibold">{knownAnswer ? 'Changer ta réponse' : 'Tu viens ?'}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {knownAnswer
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

        {/* Deux personnes peuvent porter le même prénom. Plutôt que d'écraser en
            silence la réponse de l'autre, on demande. */}
        {existing && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
            {isHomonym ? (
              <p className="text-sky-900">
                Compris, tu es un autre {name.trim()}. Ta réponse sera ajoutée à part.{' '}
                <button type="button" onClick={() => setIsHomonym(false)} className="font-medium underline">
                  Non, c’est bien moi
                </button>
              </p>
            ) : (
              <p className="text-sky-900">
                Un {existing.name} a déjà répondu {AVAILABILITY_LABELS[existing.availability].toLowerCase()}. Si c’est
                toi, continue.{' '}
                <button type="button" onClick={() => setIsHomonym(true)} className="font-medium underline">
                  Je suis quelqu’un d’autre
                </button>
              </p>
            )}
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
