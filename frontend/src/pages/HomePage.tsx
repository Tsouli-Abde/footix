import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { NotificationToggle } from '../components/NotificationToggle';
import { Badge, Button, Card, PageState } from '../components/ui';
import { eventTitle, formatCountdown, formatMatchSlot } from '../lib/dates';
import type { EventSummary } from '../types';

export function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listEvents('ouvert')
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sondages en cours</h1>
          <p className="mt-1 text-sm text-slate-500">Dis si tu viens, le lieu se décide tout seul après.</p>
        </div>
        <Link to="/nouveau" className="max-sm:w-full">
          <Button className="max-sm:w-full">Lancer un sondage</Button>
        </Link>
      </div>

      <NotificationToggle />

      {events.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-600">Rien d’ouvert pour le moment.</p>
          <Link to="/nouveau" className="mt-3 inline-block text-sm font-medium text-green-700 hover:underline">
            Lancer le prochain match
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link to={`/e/${event.publicToken}`} className="block h-full">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{eventTitle(event)}</h2>
                    <Badge className={event.votingOpen ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                      {event.votingOpen ? 'Ouvert' : 'Deadline passée'}
                    </Badge>
                  </div>
                  {(event.title || event.hasTime) && (
                    <p className="mt-1 text-sm text-slate-600">{formatMatchSlot(event)}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    {event.counts.oui} présent{event.counts.oui > 1 ? 's' : ''}
                    {event.counts.si_besoin > 0 && `, ${event.counts.si_besoin} si besoin`} ·{' '}
                    {event.votingOpen ? `réponses ${formatCountdown(event.voteDeadline)}` : 'réponses closes'}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
