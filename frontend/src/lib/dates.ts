const dateTime = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Intl produit « vendredi 7 août à 19:00 » : on ne relève que la première lettre. */
const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatDateTime = (iso: string) => capitalizeFirst(dateTime.format(new Date(iso)));
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « dans 2 jours », « dans 3 h », « échue » — pour situer la deadline d'un coup d'œil. */
export function formatDeadline(iso: string, now = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  if (diffMs <= 0) return 'échue';

  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return `dans ${Math.max(1, Math.round(diffMs / 60_000))} min`;
  if (hours < 24) return `dans ${hours} h`;

  const days = Math.round(hours / 24);
  return `dans ${days} jour${days > 1 ? 's' : ''}`;
}

/**
 * Convertit une date en valeur d'`<input type="datetime-local">`, qui attend
 * l'heure locale sans fuseau (YYYY-MM-DDTHH:MM).
 */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Le vendredi suivant à 19h : valeur par défaut raisonnable pour un nouveau match. */
export function nextFridayEvening(from = new Date()): Date {
  const date = new Date(from);
  date.setHours(19, 0, 0, 0);
  date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7);
  return date;
}
