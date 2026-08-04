const matchDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const dayAndTime = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Intl produit "vendredi 7 août", on relève juste la première lettre. */
const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Le jour seul, sans heure : « Vendredi 7 août ». */
export const formatMatchDate = (iso: string) => capitalizeFirst(matchDay.format(new Date(iso)));

/**
 * Le créneau tel qu'on veut le lire : le jour seul quand on joue à l'heure
 * habituelle, jour et heure quand l'organisateur a fixé un autre créneau.
 */
export const formatMatchSlot = (event: { matchDate: string; hasTime?: boolean }) =>
  event.hasTime ? capitalizeFirst(dayAndTime.format(new Date(event.matchDate))) : formatMatchDate(event.matchDate);

/** Titre à afficher : celui saisi, ou la date à défaut, pour ne jamais avoir de vide. */
export const eventTitle = (event: { title: string | null; matchDate: string }) =>
  event.title ?? formatMatchDate(event.matchDate);

/** Vrai si le match a lieu dans les prochaines 24h, pour appuyer le message. */
export function isTomorrowOrSooner(iso: string, now = Date.now()): boolean {
  const diff = new Date(iso).getTime() - now;
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** "dans 2 jours", "dans 3 h", "c'est passé". */
export function formatCountdown(iso: string, now = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  if (diffMs <= 0) return "c'est passé";

  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return `dans ${Math.max(1, Math.round(diffMs / 60_000))} min`;
  if (hours < 24) return `dans ${hours} h`;

  const days = Math.round(hours / 24);
  return `dans ${days} jour${days > 1 ? 's' : ''}`;
}

/** Valeur d'un `<input type="date">`, qui attend YYYY-MM-DD en heure locale. */
export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Valeur d'un `<input type="time">`, qui attend HH:MM. */
export function formatTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Les prochains vendredis, pour proposer une date en un clic. */
export function upcomingFridays(count = 3, from = new Date()): Date[] {
  const first = new Date(from);
  first.setHours(12, 0, 0, 0);
  first.setDate(first.getDate() + ((5 - first.getDay() + 7) % 7));
  if (first.getTime() <= from.getTime()) first.setDate(first.getDate() + 7);

  return Array.from({ length: count }, (_, index) => {
    const friday = new Date(first);
    friday.setDate(friday.getDate() + index * 7);
    return friday;
  });
}

