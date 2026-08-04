import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { AdminEvents } from '../components/admin/AdminEvents';
import { AdminMaintenance } from '../components/admin/AdminMaintenance';
import { AdminPlayers } from '../components/admin/AdminPlayers';
import { AdminStats } from '../components/admin/AdminStats';
import { Alert, Button, Card, inputClass } from '../components/ui';
import { adminPassword, forgetAdminPassword, rememberAdminPassword } from '../lib/admin';
import type { AdminPlayer, AdminStats as Stats, AdminSubscriptions, AdminTickResult, FootixEvent } from '../types';

const TABS = ['Vue d’ensemble', 'Sondages', 'Joueurs', 'Maintenance'] as const;
type Tab = (typeof TABS)[number];

type Data = {
  stats: Stats;
  events: FootixEvent[];
  players: AdminPlayer[];
  subscriptions: AdminSubscriptions;
};

/**
 * Vue d'administration, derrière un mot de passe partagé.
 *
 * Le mot de passe ne vaut que pour l'onglet en cours (sessionStorage) et est
 * vérifié par le serveur à chaque appel : un 401 referme la porte au lieu de
 * laisser une page à moitié vide.
 */
export function AdminPage() {
  const [authed, setAuthed] = useState(() => Boolean(adminPassword()));
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>('Vue d’ensemble');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Identifiant de la ligne en cours de traitement, pour désactiver ses boutons. */
  const [busy, setBusy] = useState<string | null>(null);
  const [tickResult, setTickResult] = useState<AdminTickResult | null>(null);

  const lockOut = useCallback(() => {
    forgetAdminPassword();
    setAuthed(false);
    setData(null);
  }, []);

  const load = useCallback(async () => {
    try {
      const [stats, events, players, subscriptions] = await Promise.all([
        api.admin.stats(),
        api.admin.events(),
        api.admin.players(),
        api.admin.subscriptions(),
      ]);
      setData({ stats, events, players, subscriptions });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        lockOut();
        return;
      }
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [lockOut]);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  if (!authed) return <PasswordGate onUnlocked={() => setAuthed(true)} />;

  /** Enrobe une action : signale l'erreur, recharge, et libère la ligne. */
  const run = async (key: string, action: () => Promise<unknown>, message?: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (message) setNotice(message);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) lockOut();
      else setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(null);
    }
  };

  const confirmed = (question: string) => window.confirm(question);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="mt-1 text-sm text-slate-500">Accès par mot de passe, sans compte ni traçabilité.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()}>
            Rafraîchir
          </Button>
          <Button variant="ghost" onClick={lockOut}>
            Quitter
          </Button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            aria-current={tab === name}
            className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === name
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}

      {!data ? (
        <p className="py-16 text-center text-sm text-slate-500">Chargement…</p>
      ) : (
        <>
          {tab === 'Vue d’ensemble' && <AdminStats stats={data.stats} />}

          {tab === 'Sondages' && (
            <AdminEvents
              events={data.events}
              busy={busy}
              onClose={(event) =>
                void run(event.id, () =>
                  // Le lieu conseillé fait office de défaut, comme pour l'organisateur.
                  api.closeEvent(event.organizerToken!, event.recommendation.venue?.id ?? null),
                )
              }
              onReopen={(event) => void run(event.id, () => api.reopenEvent(event.organizerToken!))}
              onDelete={(event) => {
                if (!confirmed('Supprimer ce sondage et toutes ses réponses ?')) return;
                void run(event.id, () => api.deleteEvent(event.organizerToken!));
              }}
            />
          )}

          {tab === 'Joueurs' && (
            <AdminPlayers
              players={data.players}
              busy={busy}
              onRename={(player, name) =>
                void run(
                  player.nameKey,
                  async () => {
                    const result = await api.admin.renamePlayer(player.nameKey, name);
                    if (result.merged > 0) {
                      setNotice(`${result.merged} réponse(s) fusionnée(s) avec un homonyme déjà présent.`);
                    }
                  },
                  undefined,
                )
              }
              onRemove={(player) => {
                if (!confirmed(`Retirer ${player.name} de tous les sondages ?`)) return;
                void run(player.nameKey, () => api.admin.removePlayer(player.nameKey));
              }}
            />
          )}

          {tab === 'Maintenance' && (
            <AdminMaintenance
              subscriptions={data.subscriptions}
              tickResult={tickResult}
              busy={busy}
              onTick={() =>
                void run('tick', async () => {
                  setTickResult(await api.admin.tick());
                })
              }
              onClearActivity={() => {
                if (!confirmed('Vider tout le fil d’activité ?')) return;
                void run('activity', () => api.admin.clearActivity());
              }}
              onRemoveSubscription={(id) => {
                if (!confirmed('Couper les notifications pour cet appareil ?')) return;
                void run(id, () => api.admin.removeSubscription(id));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

/** La porte d'entrée. Le mot de passe est validé par le serveur avant d'être retenu. */
function PasswordGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setChecking(true);
    setError(null);
    try {
      await api.admin.login(password);
      rememberAdminPassword(password);
      onUnlocked();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Mot de passe incorrect.' : 'Vérification impossible.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card className="space-y-4">
        <h1 className="text-lg font-semibold">Administration</h1>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            autoFocus
            className={inputClass}
          />

          {error && <Alert>{error}</Alert>}

          <Button type="submit" disabled={checking || password.length === 0} className="w-full">
            {checking ? 'Vérification...' : 'Entrer'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
