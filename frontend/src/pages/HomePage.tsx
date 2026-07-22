import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDateTime, formatDeadline, WEEKDAYS } from '../lib/dates';
import type { EventSummary, RecurrenceTemplate } from '../types';
import { Badge, Button, Card, PageState } from '../components/ui';

export function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [templates, setTemplates] = useState<RecurrenceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listEvents('ouvert'), api.listTemplates()])
      .then(([openEvents, activeTemplates]) => {
        setEvents(openEvents);
        setTemplates(activeTemplates);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Votes en cours</h1>
          <p className="mt-1 text-sm text-slate-500">Ouvre un sondage, partage le lien sur Teams, et c’est réglé.</p>
        </div>
        <Link to="/nouveau">
          <Button>Créer un match</Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-600">Aucun vote ouvert pour le moment.</p>
          <Link to="/nouveau" className="mt-3 inline-block text-sm font-medium text-green-700 hover:underline">
            Lancer le prochain match →
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link to={`/e/${event.publicToken}`} className="block h-full">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{event.title}</h2>
                    <Badge className={event.votingOpen ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                      {event.votingOpen ? 'Ouvert' : 'Votes clos'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{formatDateTime(event.matchDate)}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {event.participantCount} votant{event.participantCount > 1 ? 's' : ''} · deadline{' '}
                    {formatDeadline(event.voteDeadline)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {templates.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Matchs récurrents</h2>
          <ul className="space-y-2">
            {templates.map((template) => (
              <li key={template.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">{template.title}</span>
                <span className="text-slate-500">
                  {' '}
                  — chaque {WEEKDAYS[template.weekday]} à {template.matchTime}, sondage ouvert {template.leadTimeDays}{' '}
                  jours avant.
                </span>
                {template.nextMatchDate && (
                  <span className="mt-1 block text-xs text-slate-400">
                    Prochain : {formatDateTime(template.nextMatchDate)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
