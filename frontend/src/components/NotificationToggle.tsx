import { useEffect, useState } from 'react';
import { disablePush, enablePush, pushState, type PushState } from '../lib/push';
import { BellIcon } from './icons';
import { Button } from './ui';

/**
 * Active ou coupe les notifications sur cet appareil. Se cache si le navigateur
 * ne gère pas le push ou si le serveur n'a pas de clés VAPID.
 */
export function NotificationToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushState().then(setState);
  }, []);

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
    return <p className="text-xs text-slate-500">Notifications bloquées par le navigateur.</p>;
  }

  if (state === 'granted') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BellIcon className="h-4 w-4 shrink-0 text-green-600" />
        <span>Notifications activées.</span>
        <button type="button" onClick={toggle} disabled={busy} className="font-medium text-slate-600 underline">
          Couper
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <BellIcon className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">Être prévenu des matchs</p>
        <p className="mt-0.5 text-xs text-slate-500">À l’ouverture du sondage et la veille du match.</p>
      </div>
      <Button onClick={toggle} disabled={busy} className="w-full shrink-0 sm:w-auto">
        {busy ? 'Un instant' : 'Activer'}
      </Button>
    </div>
  );
}
