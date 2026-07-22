# Footix

Le Doodle du foot du vendredi, en auto-hébergé.

Quelqu'un ouvre un sondage, colle le lien sur Teams, chacun répond **Oui / Si besoin / Non**
sur les lieux proposés, et l'organisateur tranche. Pas de compte, pas de mot de passe :
tout passe par des liens.

## Comment ça marche

Deux liens sont générés à la création d'un match :

| Lien | Forme | À qui |
| --- | --- | --- |
| Participant | `/e/<token>` | à partager sur Teams — voir et voter |
| Organisateur | `/manage/<token>` | à garder — modifier, clôturer, supprimer |

Le token dans l'URL est la seule preuve d'autorisation. C'est volontaire : ça évite les
comptes pour un outil interne. Le corollaire, c'est que le lien organisateur ne se partage pas.

Quelques partis pris, hérités de l'usage réel :

- **Les résultats sont visibles par tous, en temps réel.** Le tableau se rafraîchit par
  polling toutes les 7 secondes — largement suffisant pour une trentaine de personnes.
- **Un seul événement par jour de match.** Créer un doublon renvoie vers le sondage existant
  au lieu d'en ouvrir un second.
- **Les places sont indicatives.** Le nombre affiché ne bloque jamais un vote.
- **La décision finale reste humaine.** L'option en tête est mise en avant, mais c'est
  l'organisateur qui désigne le lieu retenu à la clôture.
- **Le prénom identifie le votant.** Ressaisir le même prénom (accents et casse indifférents)
  recharge son vote au lieu d'en créer un second.

Les matchs hebdomadaires s'appuient sur un **modèle récurrent** : un job quotidien crée
l'événement de la semaine quelques jours avant l'échéance, avec les mêmes options.

## Développement local

Deux terminaux, Node 22 :

```bash
cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Le front tourne sur http://localhost:5173 et proxifie `/api` vers le backend (port 3001).

Pour obtenir un jeu de données de démonstration (modèle « Foot du vendredi », un événement
et quelques votes), avec les liens affichés en sortie :

```bash
cd backend && npm run seed
```

## Déploiement

```bash
docker compose up -d --build
```

L'app est servie sur http://localhost:8080. Nginx sert le front et proxifie `/api` vers le
backend, donc tout est sur la même origine — pas de CORS à configurer.

Trois services : `frontend` (nginx), `backend` (Express + SQLite) et `cron`, qui exécute une
fois par jour la génération des événements récurrents. Le job est idempotent, le relancer
ne crée pas de doublon.

La base est un fichier SQLite dans le volume `footix-data`. Sauvegarde :

```bash
docker compose cp backend:/app/prisma/data/footix.db ./footix-backup.db
```

Passer à Kubernetes (k3s + DuckDNS, cf. `deploiement-docker-k8s-duckdns.md`) reste possible :
les images sont les mêmes, il suffit d'un Deployment par service, d'un Ingress et d'un
CronJob à la place du service `cron`.

## Structure

```
backend/    API Express + Prisma (SQLite)
  prisma/   schéma et migrations
  src/
    routes/     events (public), votes, manage (organisateur), templates (récurrence)
    jobs/       génération des événements récurrents
    domain.ts   règles transverses : tokens, normalisation des noms, anti-doublon
frontend/   React + Vite + Tailwind, PWA installable
  src/
    pages/      accueil, création, vote, gestion, historique, récurrence
    components/ tableau de vote, formulaire, éditeur d'options
```

## API

Publiques :

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/events?status=ouvert\|cloture` | liste des sondages |
| `POST` | `/api/events` | créer (409 + événement existant si la date est prise) |
| `GET` | `/api/events/:publicToken` | voir un sondage et ses résultats |
| `POST` | `/api/events/:publicToken/votes` | voter ou modifier son vote |

Organisateur (`:organizerToken`) :

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` `PATCH` `DELETE` | `/api/manage/:organizerToken` | consulter, modifier, supprimer |
| `POST` | `/api/manage/:organizerToken/close` | clôturer et désigner l'option retenue |
| `POST` | `/api/manage/:organizerToken/reopen` | rouvrir le vote |

Récurrence :

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` `POST` | `/api/templates` | lister, créer un modèle hebdomadaire |
| `GET` `PATCH` | `/api/templates/manage/:organizerToken` | consulter, modifier un modèle |
| `POST` | `/api/templates/generate` | forcer la génération (ce que fait le cron) |

## Pistes pour la suite

- Suggestion automatique du lieu selon les votes fermes et les « si besoin ».
- Export ICS / Google / Outlook.
- Rappel automatique sur Teams avant la deadline.
- Statistiques d'assiduité et lieux les plus retenus.
