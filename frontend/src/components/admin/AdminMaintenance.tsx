import { formatShortDate } from '../../lib/dates';
import type { AdminSubscriptions, AdminTickResult } from '../../types';
import { Button, Card } from '../ui';

type Props = {
  subscriptions: AdminSubscriptions;
  tickResult: AdminTickResult | null;
  busy: string | null;
  onTick: () => void;
  onClearActivity: () => void;
  onRemoveSubscription: (id: string) => void;
};

/**
 * Les opérations qui ne concernent pas un sondage en particulier : lancer le
 * job, vider le fil, couper un appareil abonné aux notifications.
 */
export function AdminMaintenance({
  subscriptions,
  tickResult,
  busy,
  onTick,
  onClearActivity,
  onRemoveSubscription,
}: Props) {
  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800">Battement horaire</h3>
          <p className="mt-1 text-sm text-slate-600">
            Envoie les récapitulatifs de la veille et clôture les sondages dont le match est passé.
          </p>
        </div>

        <Button disabled={busy === 'tick'} onClick={onTick}>
          {busy === 'tick' ? 'En cours...' : 'Lancer maintenant'}
        </Button>

        {tickResult && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>
              {tickResult.reminders.length} rappel(s) envoyé(s), {tickResult.closed.length} clôture(s).
            </p>
            {tickResult.closed.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
                {tickResult.closed.map((closed) => (
                  <li key={closed.eventId}>{closed.venue ?? 'aucun lieu retenu'}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800">Notifications</h3>
          <p className="mt-1 text-sm text-slate-600">
            {subscriptions.enabled
              ? `${subscriptions.subscriptions.length} appareil(s) abonné(s).`
              : 'Le push est désactivé sur le serveur : aucune clé VAPID configurée.'}
          </p>
        </div>

        {subscriptions.subscriptions.length > 0 && (
          <ul className="divide-y divide-slate-100 text-sm">
            {subscriptions.subscriptions.map((subscription) => (
              <li key={subscription.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-slate-700">
                  {subscription.host}
                  <span className="ml-2 font-mono text-xs text-slate-400">…{subscription.tail}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{formatShortDate(subscription.createdAt)}</span>
                  <Button
                    variant="danger"
                    disabled={busy === subscription.id}
                    onClick={() => onRemoveSubscription(subscription.id)}
                  >
                    Couper
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800">Fil d’activité</h3>
          <p className="mt-1 text-sm text-slate-600">
            Le fil alimente la cloche et les toasts. Le vider ne touche ni aux sondages ni aux réponses.
          </p>
        </div>

        <Button variant="danger" disabled={busy === 'activity'} onClick={onClearActivity}>
          {busy === 'activity' ? 'En cours...' : 'Vider le fil'}
        </Button>
      </Card>
    </div>
  );
}
