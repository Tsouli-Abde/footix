import { AVAILABILITY_CHIP, AVAILABILITY_LABELS } from '../../lib/availability';
import { formatShortDate } from '../../lib/dates';
import { AVAILABILITY_VALUES, type AdminStats as Stats } from '../../types';
import { Card } from '../ui';

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Les chiffres de l'app en un écran : combien de sondages, de joueurs, de réponses. */
export function AdminStats({ stats }: { stats: Stats }) {
  const period =
    stats.firstMatch && stats.lastMatch
      ? `${formatShortDate(stats.firstMatch)} → ${formatShortDate(stats.lastMatch)}`
      : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Sondages" value={stats.events.total} hint={period} />
        <Tile label="Ouverts" value={stats.events.open} />
        <Tile label="Matchs joués" value={stats.events.played} hint={`${stats.events.cancelled} annulé(s)`} />
        <Tile label="Joueurs" value={stats.players.total} />
        <Tile
          label="Présents en moyenne"
          value={stats.attendance.averagePresent}
          hint={stats.attendance.bestMatch > 0 ? `record : ${stats.attendance.bestMatch}` : undefined}
        />
        <Tile label="Réponses" value={Object.values(stats.answers).reduce((total, n) => total + n, 0)} />
        <Tile label="Fil d’activité" value={stats.activityCount} hint="lignes" />
        <Tile
          label="Notifications"
          value={stats.push.subscriptions}
          hint={stats.push.enabled ? 'appareils abonnés' : 'push désactivé sur le serveur'}
        />
      </div>

      {/* Un sondage ouvert dont le match est passé veut dire que le job horaire
          ne tourne pas. C'est le seul signal d'alerte de cette page. */}
      {stats.events.overdue > 0 && (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          {stats.events.overdue} sondage(s) encore ouvert(s) alors que le match est passé. Le battement horaire n’a pas
          tourné, tu peux le lancer depuis l’onglet Maintenance.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold text-slate-700">Réponses par type</h3>
          <ul className="mt-3 space-y-2">
            {AVAILABILITY_VALUES.map((value) => (
              <li key={value} className="flex items-center justify-between gap-3 text-sm">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${AVAILABILITY_CHIP[value]}`}>
                  {AVAILABILITY_LABELS[value]}
                </span>
                <span className="tabular-nums text-slate-700">{stats.answers[value]}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700">Lieux retenus</h3>
          <ul className="mt-3 space-y-2">
            {stats.venues.map((venue) => (
              <li key={venue.venueId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{venue.label}</span>
                <span className="tabular-nums text-slate-700">{venue.count}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-sm">
              <span className="text-slate-500">Annulés</span>
              <span className="tabular-nums text-slate-500">{stats.events.cancelled}</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
