/**
 * Charge le fichier .env dans process.env, si présent.
 *
 * À importer en tout premier dans les points d'entrée (index, jobs) : les imports
 * ES étant évalués dans l'ordre, ça garantit que les variables sont là avant que
 * Prisma ou le module push ne les lisent. En conteneur il n'y a pas de .env, les
 * variables viennent alors de l'environnement et l'absence de fichier est normale.
 */
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : on se contente des variables déjà présentes dans l'environnement.
}
