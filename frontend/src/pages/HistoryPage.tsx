import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card, PageState } from '../components/ui';
import { formatShortDate } from '../lib/dates';
import type { EventSummary } from '../types';

/** Où on a joué et combien on était, en lecture seule. */
export function HistoryPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listEvents('cloture')
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique</h1>
        <p className="mt-1 text-sm text-slate-500">Les matchs déjà passés.</p>
      </div>

      {events.length === 0 ? (
        <Card className="text-center text-slate-600">Aucun match clôturé pour l’instant.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Match</th>
                <th className="px-5 py-3 font-semibold">Lieu</th>
                <th className="px-5 py-3 text-right font-semibold">Présents</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatShortDate(event.matchDate)}</td>
                  <td className="px-5 py-3">
                    <Link to={`/e/${event.publicToken}`} className="font-medium text-slate-800 hover:underline">
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {event.chosenVenue ? (
                      <span className="whitespace-nowrap rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        {event.chosenVenue.label}
                      </span>
                    ) : (
                      <span className="text-slate-400">Annulé</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{event.counts.oui}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
