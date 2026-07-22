import { useCallback, useEffect, useRef, useState } from 'react';
import type { FootixEvent } from '../types';

const POLL_INTERVAL_MS = 7_000;

/**
 * Charge un événement puis le rafraîchit périodiquement, pour que le tableau
 * reflète les votes des collègues sans avoir à recharger la page.
 *
 * Un simple polling suffit : quelques dizaines de personnes, un vote par semaine.
 * Des websockets seraient plus de complexité opérationnelle que de valeur.
 */
export function usePolledEvent(load: () => Promise<FootixEvent>) {
  const [event, setEvent] = useState<FootixEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // `load` est recréée à chaque rendu par les pages appelantes : on la garde
  // dans une ref pour que l'intervalle ne soit pas reconstruit en boucle.
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async () => {
    try {
      setEvent(await loadRef.current());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const timer = setInterval(() => {
      // Inutile d'interroger l'API quand l'onglet est en arrière-plan.
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [refresh]);

  return { event, setEvent, error, loading, refresh };
}
