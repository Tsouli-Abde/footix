import { useEffect, useState } from 'react';
import { disablePush, enablePush, pushState, type PushState } from '../lib/push';
import { BellIcon } from './icons';
import { Button } from './ui';

/**
 * Active ou coupe les notifications sur cet appareil.
 *
 * Se cache tout seul si le navigateur ne gère pas le push ou si le serveur n'a
 * pas de clés VAPID : pas de bouton mort à l'écran. Une fois activées, on ne
 * garde qu'une ligne discrète, l'information n'a plus besoin de place.
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

  // Refus explicite du navigateur : on ne peut plus rien proposer, seulement
  // expliquer. Une ligne de texte suffit, pas la peine d'un encadré.
  if (state === 'denied') {
    return (
      <p className="text-xs text-slate-500">
        Notifications bloquées dans les réglages de ton navigateur.
      </p>
    );
  }

  // Déjà actives : une ligne sobre, avec de quoi les couper.
  if (state === 'granted') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BellIcon className="h-4 w-4 shrink-0 text-green-600" />
        <span>Notifications activées sur cet appareil.</span>
        <button type="button" onClick={toggle} disabled={busy} className="font-medium text-slate-600 underline">
          Couper
        </button>
      </div>
    );
  }

  // Proposition : la carte reste compacte et passe en colonne sur téléphone,
  // pour que le bouton ne se retrouve jamais coincé à côté du texte.
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <BellIcon className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">Être prévenu des matchs</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Deux notifications par match au maximum : à l’ouverture du sondage, et la veille.
        </p>
      </div>
      <Button onClick={toggle} disabled={busy} className="w-full shrink-0 sm:w-auto">
        {busy ? 'Un instant' : 'Activer'}
      </Button>
    </div>
  );
}
