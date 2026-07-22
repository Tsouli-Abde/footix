import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Card, PageState } from '../components/ui';
import type { FootixEvent } from '../types';

/**
 * Lien permanent d'un rendez-vous hebdo : /hebdo/:templateId.
 *
 * On l'épingle une fois pour toutes sur Teams et il renvoie toujours vers le
 * sondage de la semaine en cours, sans avoir à repartager une URL différente.
 */
export function HebdoPage() {
  const { templateId = '' } = useParams();
  const [event, setEvent] = useState<FootixEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCurrentTemplateEvent(templateId)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading || error) return <PageState loading={loading} error={error} />;

  // On redirige vers le sondage réel : les liens de réponse restent uniformes.
  if (event) return <Navigate to={`/e/${event.publicToken}`} replace />;

  return (
    <Card className="mx-auto max-w-lg text-center">
      <p className="text-slate-600">Le sondage de la semaine n’est pas encore ouvert.</p>
      <p className="mt-1 text-sm text-slate-500">Il apparaît quelques jours avant le match. Repasse bientôt.</p>
      <Link to="/" className="mt-3 inline-block text-sm font-medium text-green-700 hover:underline">
        Voir les sondages en cours
      </Link>
    </Card>
  );
}
