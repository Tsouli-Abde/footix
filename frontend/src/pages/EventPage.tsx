import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { CopyLink } from '../components/CopyLink';
import { EventHeader, WinnerBanner } from '../components/EventHeader';
import { VoteForm } from '../components/VoteForm';
import { VoteTable } from '../components/VoteTable';
import { Card, PageState } from '../components/ui';
import { usePolledEvent } from '../hooks/usePolledEvent';
import { leadingOption } from '../lib/votes';

/**
 * Page de vote : c'est le lien partagé sur Teams.
 * Les résultats sont visibles par tous en temps réel, comme le sondage Doodle
 * qu'elle remplace.
 */
export function EventPage() {
  const { publicToken = '' } = useParams();
  const load = useCallback(() => api.getEvent(publicToken), [publicToken]);
  const { event, setEvent, loading, error } = usePolledEvent(load);

  if (!event) return <PageState loading={loading} error={error} />;

  const leader = leadingOption(event.options);

  return (
    <div className="space-y-6">
      <EventHeader event={event} />
      <WinnerBanner event={event} />

      {event.votingOpen && <VoteForm event={event} onVoted={setEvent} />}

      <Card>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Résultats</h2>
          {event.status === 'ouvert' && leader && (
            <p className="text-sm text-slate-500">
              En tête : <span className="font-medium text-slate-700">{leader.label}</span>
            </p>
          )}
        </div>

        <VoteTable event={event} highlightOptionId={event.winningOptionId ?? leader?.id} />

        {event.status === 'ouvert' && (
          <p className="mt-4 text-xs text-slate-400">Le tableau se rafraîchit tout seul toutes les 7 secondes.</p>
        )}
      </Card>

      <Card>
        <CopyLink path={`/e/${event.publicToken}`} label="Lien à partager" hint="Colle-le dans le canal Teams." />
      </Card>
    </div>
  );
}
