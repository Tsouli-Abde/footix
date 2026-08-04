import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { AnswerForm } from '../components/AnswerForm';
import { AnswerList } from '../components/AnswerList';
import { CopyLink } from '../components/CopyLink';
import { EventHeader } from '../components/EventHeader';
import { VenueCard } from '../components/VenueCard';
import { Card, PageState } from '../components/ui';
import { usePolledEvent } from '../hooks/usePolledEvent';

/** La page de réponse : le lien qu'on colle sur Teams. */
export function EventPage() {
  const { publicToken = '' } = useParams();
  const load = useCallback(() => api.getEvent(publicToken), [publicToken]);
  const { event, setEvent, loading, error } = usePolledEvent(load);

  if (!event) return <PageState loading={loading} error={error} />;

  return (
    <div className="space-y-6">
      <EventHeader event={event} />
      <VenueCard event={event} />

      {event.votingOpen && <AnswerForm event={event} onAnswered={setEvent} />}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Qui vient</h2>
        <AnswerList event={event} />
      </Card>

      <Card>
        <CopyLink path={`/e/${event.publicToken}`} label="Lien à partager" />
      </Card>
    </div>
  );
}
