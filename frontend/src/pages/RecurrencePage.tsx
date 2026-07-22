import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { Alert, Button, Card, Field, inputClass, PageState } from '../components/ui';
import { formatMatchDate, WEEKDAYS } from '../lib/dates';
import type { RecurrenceTemplate } from '../types';

/**
 * Le rendez-vous hebdomadaire. Un job quotidien crée le sondage de la semaine
 * quelques jours avant, avec ces réglages.
 */
export function RecurrencePage() {
  const { organizerToken = '' } = useParams();

  const [template, setTemplate] = useState<RecurrenceTemplate | null>(null);
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
    api
      .getTemplate(organizerToken)
      .then((loaded) => {
        setTemplate(loaded);
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
