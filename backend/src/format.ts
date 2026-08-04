const matchDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** « vendredi 7 août », pour le texte des notifications. Le conteneur tourne en TZ Paris. */
export const formatMatchDate = (date: Date) => matchDay.format(date);
