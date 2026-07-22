import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { OptionsEditor, type OptionDraft } from '../components/OptionsEditor';
import { Alert, Button, Card, Field, inputClass, PageState } from '../components/ui';
import { formatDateTime, WEEKDAYS } from '../lib/dates';
import type { RecurrenceTemplate } from '../types';

/**
 * Gestion d'un match récurrent. Le modèle décrit le rendez-vous hebdomadaire ;
 * un job quotidien crée l'événement de la semaine à l'approche de l'échéance.
 */
export function RecurrencePage() {
  const { organizerToken = '' } = useParams();

  const [template, setTemplate] = useState<RecurrenceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({ title: '', description: '', weekday: 5, matchTime: '19:00', leadTimeDays: 3, deadlineHoursBefore: 25 });
  const [options, setOptions] = useState<OptionDraft[]>([]);

  useEffect(() => {
    api
      .getTemplate(organizerToken)
      .then((loaded) => {
        setTemplate(loaded);
        setForm({
          title: loaded.title,
          description: loaded.description ?? '',
          weekday: loaded.weekday,
          matchTime: loaded.matchTime,
          leadTimeDays: loaded.leadTimeDays,
          deadlineHoursBefore: loaded.deadlineHoursBefore,
        });
        setOptions(loaded.options.map((option) => ({ label: option.label, capacity: option.capacity })));
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
          options: options
            .filter((option) => option.label.trim())
            .map((option) => ({ label: option.label.trim(), capacity: option.capacity })),
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
        <h1 className="text-2xl font-bold">Match récurrent</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chaque {WEEKDAYS[template.weekday]} à {template.matchTime}. Le sondage s’ouvre tout seul{' '}
          {template.leadTimeDays} jours avant.
        </p>
        {template.nextMatchDate && (
          <p className="mt-1 text-sm text-slate-400">Prochain match : {formatDateTime(template.nextMatchDate)}</p>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="info">Modèle enregistré.</Alert>}

      <Card className="space-y-5">
        <Field label="Titre des sondages générés">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={120}
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            maxLength={500}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jour du match">
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
          <Field label="Heure du match">
            <input
              type="time"
              value={form.matchTime}
              onChange={(e) => setForm({ ...form, matchTime: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Sondage ouvert (jours avant)" hint="3 = le mardi pour un match le vendredi.">
            <input
              type="number"
              min={1}
              max={14}
              value={form.leadTimeDays}
              onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Votes clos (heures avant)" hint="25 = jeudi 18h pour un match vendredi 19h.">
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

      <Card>
        <h2 className="mb-3 font-semibold">Options recopiées chaque semaine</h2>
        <OptionsEditor options={options} onChange={setOptions} />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()}>Enregistrer</Button>
        <Button variant="secondary" onClick={() => void save({ active: !template.active })}>
          {template.active ? 'Mettre en pause' : 'Réactiver'}
        </Button>
        {!template.active && <span className="text-sm text-amber-700">En pause : aucun sondage n’est généré.</span>}
      </div>
    </div>
  );
}
