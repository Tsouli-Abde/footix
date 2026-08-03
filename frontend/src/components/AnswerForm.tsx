import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { AVAILABILITY_BUTTON, AVAILABILITY_HINTS, AVAILABILITY_LABELS } from '../lib/availability';
import { normalizeName, rememberAnswer, rememberedAnswer, rememberName, rememberedName } from '../lib/names';
import { AVAILABILITY_VALUES, type Availability, type FootixEvent, type Participant } from '../types';
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
 * local). Si le prénom saisi appartient à quelqu'un d'autre, on demande
 * confirmation avant d'écraser sa réponse — mais seulement au moment d'envoyer,
 * jamais pendant la frappe ni au rafraîchissement, sinon on accuse à tort
 * quelqu'un qui vient simplement de répondre.
 */
export function AnswerForm({ event, onAnswered }: Props) {
  const [name, setName] = useState(rememberedName);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Réponse existante portant ce prénom, sans être la nôtre. */
  const [clash, setClash] = useState<Participant | null>(null);

  const myAnswerId = rememberedAnswer(event.publicToken);
  const mine = myAnswerId ? event.participants.find((person) => person.id === myAnswerId) : undefined;

  // On présélectionne sa propre réponse : changer d'avis devient un seul clic.
  useEffect(() => {
    if (mine) setAvailability(mine.availability);
  }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * `force` passe outre la confirmation d'homonyme. Sans lui, on relit d'abord
   * l'événement : la liste affichée peut avoir jusqu'à 7 secondes de retard, et
   * on ne veut pas écraser une réponse arrivée entre-temps sans le dire.
   */
  const send = async (force = false) => {
    if (!availability) return;
    setSending(true);
    setError(null);
    try {
      if (!force) {
        const fresh = await api.getEvent(event.publicToken);
        const nameKey = normalizeName(name);
        const taken = fresh.participants.find(
          (person) => normalizeName(person.name) === nameKey && person.id !== myAnswerId,
        );
        if (taken) {
          setClash(taken);
          return;
        }
      }

      const result = await api.answer(event.publicToken, name.trim(), availability);
      rememberName(name.trim());
      rememberAnswer(event.publicToken, result.participantId);
      setClash(null);
      onAnswered(result.event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible, réessaie.');
    } finally {
      setSending(false);
    }
  };

  const editName = (value: string) => {
    setName(value);
    setClash(null);
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">{mine ? 'Changer ta réponse' : 'Tu viens ?'}</h2>

      <div className="mt-4 space-y-4">
        <input
          value={name}
          onChange={(e) => editName(e.target.value)}
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

        {clash ? (
          <Alert tone="info">
            <p>
              <span className="font-medium">{clash.name}</span> a déjà répondu. C’est toi ?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void send(true)} disabled={sending}>
                {sending ? 'Envoi...' : 'Oui, mettre à jour'}
              </Button>
              <Button variant="secondary" onClick={() => setClash(null)}>
                Non, changer de prénom
              </Button>
            </div>
          </Alert>
        ) : (
          <Button
            onClick={() => void send()}
            disabled={name.trim().length < 2 || !availability || sending}
            className="w-full sm:w-auto"
          >
            {sending ? 'Envoi...' : mine ? 'Mettre à jour' : 'Envoyer'}
          </Button>
        )}
      </div>
    </Card>
  );
}
