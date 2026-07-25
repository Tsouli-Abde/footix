import { useEffect, useState } from 'react';
import { disablePush, enablePush, pushState, type PushState } from '../lib/push';
import { Button } from './ui';

/**
 * Active ou coupe les notifications push sur cet appareil.
 *
 * Se cache tout seul si le navigateur ne gère pas le push ou si le serveur n'a
 * pas de clés VAPID : pas de bouton mort à l'écran.
 */
export function NotificationToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushState().then(setState);
  }, []);

  // Rien à montrer tant qu'on ne sait pas, ou si le push est indisponible ici.
  if (state === null || state === 'unsupported' || state === 'unavailable') return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === 'granted') {
        await disablePush();
        setState('default');
      } else {
        setState(await enablePush());
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === 'denied') {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        Notifications bloquées par ton navigateur. Réautorise-les dans ses réglages pour être prévenu des nouveaux matchs.
      </p>
    );
  }

  const on = state === 'granted';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">
          {on ? 'Notifications activées' : 'Être prévenu des nouveaux matchs'}
        </p>
        <p className="text-xs text-slate-500">
          {on
            ? 'Tu reçois une notif quand un sondage s’ouvre, même app fermée.'
            : 'Une notif sur ton téléphone dès qu’un sondage s’ouvre, en plus du lien Teams.'}
        </p>
      </div>
      <Button variant={on ? 'secondary' : 'primary'} onClick={toggle} disabled={busy}>
        {busy ? '…' : on ? 'Couper' : 'Activer'}
      </Button>
    </div>
  );
}
