import type { Availability, EventSummary, FootixEvent, RecurrenceTemplate } from './types';

/** En dev, Vite proxifie /api vers le backend. En prod, nginx fait la même chose. */
const BASE = import.meta.env.VITE_API_URL ?? '/api';

/** Erreur renvoyée par l'API, avec le détail exploitable par l'UI. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? 'Une erreur est survenue';
    throw new ApiError(response.status, message, (payload as { details?: unknown } | null)?.details);
  }

  return payload as T;
}

export type CreateEventInput = {
  matchDate: string;
  title?: string;
  description?: string | null;
  voteDeadline?: string;
};

export const api = {
  listEvents: (status?: 'ouvert' | 'cloture') =>
    request<{ events: EventSummary[] }>(`/events${status ? `?status=${status}` : ''}`).then((r) => r.events),

  createEvent: (input: CreateEventInput) =>
    request<{ event: FootixEvent }>('/events', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.event),

  getEvent: (publicToken: string) => request<{ event: FootixEvent }>(`/events/${publicToken}`).then((r) => r.event),

  answer: (publicToken: string, name: string, availability: Availability) =>
    request<{ participantId: string; event: FootixEvent }>(`/events/${publicToken}/answers`, {
      method: 'POST',
      body: JSON.stringify({ name, availability }),
    }),

  removeParticipant: (publicToken: string, participantId: string) =>
    request<{ event: FootixEvent }>(`/events/${publicToken}/answers/${participantId}`, { method: 'DELETE' }).then(
      (r) => r.event,
    ),

  getManagedEvent: (organizerToken: string) =>
    request<{ event: FootixEvent }>(`/manage/${organizerToken}`).then((r) => r.event),

  updateEvent: (organizerToken: string, input: Partial<CreateEventInput>) =>
    request<{ event: FootixEvent }>(`/manage/${organizerToken}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then((r) => r.event),

  closeEvent: (organizerToken: string, chosenVenue: string | null) =>
    request<{ event: FootixEvent }>(`/manage/${organizerToken}/close`, {
      method: 'POST',
      body: JSON.stringify({ chosenVenue }),
    }).then((r) => r.event),

  reopenEvent: (organizerToken: string) =>
    request<{ event: FootixEvent }>(`/manage/${organizerToken}/reopen`, { method: 'POST' }).then((r) => r.event),

  deleteEvent: (organizerToken: string) => request<void>(`/manage/${organizerToken}`, { method: 'DELETE' }),

  listTemplates: () => request<{ templates: RecurrenceTemplate[] }>('/templates').then((r) => r.templates),

  getTemplate: (organizerToken: string) =>
    request<{ template: RecurrenceTemplate }>(`/templates/manage/${organizerToken}`).then((r) => r.template),

  updateTemplate: (organizerToken: string, input: Record<string, unknown>) =>
    request<{ template: RecurrenceTemplate }>(`/templates/manage/${organizerToken}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then((r) => r.template),
};
