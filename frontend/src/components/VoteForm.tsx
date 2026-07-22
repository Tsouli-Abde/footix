import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { normalizeName, rememberName, rememberedName } from '../lib/names';
import { VOTE_BUTTON_STYLES, VOTE_LABELS } from '../lib/votes';
import type { FootixEvent, VoteValue } from '../types';
import { VOTE_VALUES } from '../types';
import { Alert, Button, Card, Field, inputClass } from './ui';

type Props = {
  event: FootixEvent;
  onVoted: (event: FootixEvent) => void;
};

/**
 * Saisie du vote : un prénom, puis Oui / Si besoin / Non sur chaque option.
 *
 * Pas d'authentification — c'est le prénom qui identifie le votant. Ressaisir le
 * même prénom recharge et remplace le vote précédent.
 */
export function VoteForm({ event, onVoted }: Props) {
  const [name, setName] = useState(rememberedName);
  const [choices, setChoices] = useState<Record<string, VoteValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameKey = normalizeName(name);
  const existing = useMemo(
    () => (nameKey ? event.participants.find((participant) => normalizeName(participant.name) === nameKey) : undefined),
    [event.participants, nameKey],
  );

  // Quand on reconnaît le votant, on repart de ses réponses actuelles plutôt
  // que d'un formulaire vide : modifier un seul choix devient immédiat.
  useEffect(() => {
    if (existing) setChoices(existing.votes);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = event.options.filter((option) => !choices[option.id]).length;
  const canSubmit = nameKey.length >= 2 && missing === 0 && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const votes = event.options.map((option) => ({ optionId: option.id, value: choices[option.id] }));
      const result = await api.submitVote(event.publicToken, name.trim(), votes);
      rememberName(name.trim());
      onVoted(result.event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible, réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{existing ? 'Modifier ton vote' : 'Ton vote'}</h2>

      <div className="space-y-5">
        <Field
          label="Ton prénom"
          hint={existing ? 'Un vote existe déjà sous ce nom : il sera remplacé.' : 'Utilise toujours le même, pour te retrouver.'}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Tsouli"
            autoComplete="given-name"
            className={inputClass}
          />
        </Field>

        <div className="space-y-3">
          {event.options.map((option) => (
            <div key={option.id} className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
              <span className="flex-1 font-medium text-slate-800">
                {option.label}
                {option.capacity && <span className="ml-2 text-xs font-normal text-slate-400">{option.capacity} places</span>}
              </span>

              <div className="flex gap-1.5" role="group" aria-label={`Ta réponse pour ${option.label}`}>
                {VOTE_VALUES.map((value) => {
                  const selected = choices[option.id] === value;
                  const styles = VOTE_BUTTON_STYLES[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setChoices((current) => ({ ...current, [option.id]: value }))}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                        selected ? styles.active : styles.idle
                      }`}
                    >
                      {VOTE_LABELS[value]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Envoi…' : existing ? 'Mettre à jour mon vote' : 'Envoyer mon vote'}
          </Button>
          {missing > 0 && (
            <span className="text-sm text-slate-500">
              Encore {missing} option{missing > 1 ? 's' : ''} à renseigner
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
