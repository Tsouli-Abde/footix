import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { CopyLink } from '../components/CopyLink';
import { Alert, Badge, Button, Card, Field, inputClass, PageState } from '../components/ui';
import { formatMatchDate, formatShortDate, WEEKDAYS } from '../lib/dates';
import type { EventSummary, RecurrenceTemplate } from '../types';

/**
 * Le rendez-vous hebdomadaire. Un job quotidien crée le sondage de la semaine
 * quelques jours avant, avec ces réglages.
 */
export function RecurrencePage() {
  const { organizerToken = '' } = useParams();

  const [template, setTemplate] = useState<RecurrenceTemplate | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    weekday: 5,
    leadTimeDays: 3,
    deadlineHoursBefore: 18,
  });

  useEffect(() => {
    Promise.all([api.getTemplate(organizerToken), api.getTemplateEvents(organizerToken)])
      .then(([loaded, generated]) => {
        setTemplate(loaded);
        setEvents(generated);
        setForm({
          title: loaded.title,
          description: loaded.description ?? '',
          weekday: loaded.weekday,
          leadTimeDays: loaded.leadTimeDays,
          deadlineHoursBefore: loaded.deadlineHoursBefore,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, [organizerToken]);

  if (!template) return <PageState loading={loading} error={error} />;

  const save = async (patch: Record<string, unknown> = {}) => {
    setError(null);
    try {
      setTemplate(
        await api.updateTemplate(organizerToken, {
          ...form,
          description: form.description.trim() || null,
          ...patch,
        }),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rendez-vous hebdo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chaque {WEEKDAYS[template.weekday]}, sondage ouvert {template.leadTimeDays} jours avant.
        </p>
        {template.nextMatchDate && (
          <p className="mt-1 text-sm text-slate-400">Prochain match : {formatMatchDate(template.nextMatchDate)}</p>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="info">C’est enregistré.</Alert>}

      <Card className="space-y-2">
        <CopyLink
          path={`/hebdo/${template.id}`}
          label="Lien permanent à épingler"
          hint="Colle-le une fois sur Teams : il renvoie toujours vers le sondage de la semaine."
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Les sondages de ce rendez-vous</h2>
        <p className="mb-4 text-sm text-slate-500">
          Chacun a son propre lien de gestion, pour le clôturer et noter le score.
        </p>

        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun sondage pour l’instant, le prochain arrive tout seul.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="text-sm font-medium text-slate-700">{formatShortDate(event.matchDate)}</span>
                <Badge className={event.votingOpen ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                  {event.votingOpen ? 'Ouvert' : event.status === 'cloture' ? 'Clôturé' : 'Fermé'}
                </Badge>
                <span className="text-xs text-slate-400">
                  {event.counts.oui} présents
                  {event.chosenVenue && ` · ${event.chosenVenue.label}`}
                  {event.score && ` · ${event.score}`}
                </span>
                {event.organizerToken && (
                  <Link
                    to={`/manage/${event.organizerToken}`}
                    className="ml-auto text-sm font-medium text-green-700 hover:underline"
                  >
                    Gérer
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-5">
        <Field label="Titre des sondages">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={120}
            className={inputClass}
          />
        </Field>

        <Field label="Précision">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            maxLength={500}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Jour">
            <select
              value={form.weekday}
              onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
              className={inputClass}
            >
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ouvert (jours avant)" hint="3 = le mardi pour un vendredi.">
            <input
              type="number"
              min={1}
              max={14}
              value={form.leadTimeDays}
              onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Fermé (heures avant)" hint="18 = la veille à 18h.">
            <input
              type="number"
              min={1}
              max={336}
              value={form.deadlineHoursBefore}
              onChange={(e) => setForm({ ...form, deadlineHoursBefore: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()}>Enregistrer</Button>
        <Button variant="secondary" onClick={() => void save({ active: !template.active })}>
          {template.active ? 'Mettre en pause' : 'Réactiver'}
        </Button>
        {!template.active && <span className="text-sm text-amber-700">En pause, aucun sondage n’est créé.</span>}
      </div>
    </div>
  );
}
