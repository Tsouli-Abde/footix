# Footix

Le Doodle du foot du vendredi, en auto-hébergé.

Quelqu'un ouvre un sondage, colle le lien sur Teams, chacun dit s'il vient, et l'app propose
le lieu qui colle au nombre de présents. Pas de compte, pas de mot de passe, tout passe par
des liens.

## Le principe

On ne vote pas sur des lieux, on dit juste **Oui / Si besoin / Non**. Le lieu se déduit du
nombre de personnes, parce que c'est comme ça que ça se passe en vrai : on demande "foot
vendredi ?", et une fois qu'on sait combien on est, on sait où aller.

Les deux terrains sont en dur dans le code (`backend/src/domain.ts`) :

| Présents | Où on joue |
| --- | --- |
| moins de 6 | nulle part, ça ne vaut pas le coup |
| 6 à 11 | Le Five |
| 12 et plus | Parc de Sceaux |

Les "si besoin" ne comptent jamais comme des présents. Ils servent seulement à signaler
qu'on pourrait basculer au parc s'ils se confirment. L'app conseille, l'organisateur tranche
au moment de clôturer, et il peut choisir autre chose (le match contre une autre boîte est
proposé uniquement de son côté, jamais aux votants).

L'heure ne se saisit pas : on joue toujours sur la pause déj.

## Les liens

Deux liens sont générés à la création :

| Lien | Forme | À qui |
| --- | --- | --- |
| Réponse | `/e/<token>` | à partager sur Teams |
| Gestion | `/manage/<token>` | à garder, permet de modifier et clôturer |

Le token dans l'URL est la seule preuve d'autorisation. C'est volontaire, ça évite les
comptes pour un outil interne. Le corollaire, c'est que le lien de gestion ne se partage pas.

Autres partis pris, hérités de l'usage réel :

- **Les réponses sont visibles par tous, en direct.** La page se rafraîchit toutes les 7
  secondes, largement suffisant pour une trentaine de personnes.
- **Un seul sondage par jour.** Créer un doublon renvoie vers celui qui existe déjà.
- **Le prénom identifie la personne.** Ressaisir le même prénom (accents et casse
  indifférents) recharge sa réponse au lieu d'en créer une deuxième.

Une fois le match joué, l'organisateur peut noter le **score**, visible ensuite par tout le
monde et dans l'historique.

Les matchs hebdomadaires s'appuient sur un **rendez-vous récurrent** : un job quotidien crée
le sondage de la semaine quelques jours avant. Ce rendez-vous a un **lien permanent**
(`/hebdo/<id>`) qu'on épingle une fois pour toutes sur Teams : il renvoie toujours vers le
sondage de la semaine en cours, sans avoir à repartager une URL chaque semaine. La page de
gestion du rendez-vous (`/recurrence/<token>`) liste tous les sondages produits avec leur
lien de gestion, pour pouvoir les clôturer et noter les scores.

## Développement local

Deux terminaux, Node 22 :

```bash
cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Le front tourne sur http://localhost:5173 et proxifie `/api` vers le backend (port 3001).

Pour avoir des données sous les yeux (rendez-vous du vendredi, sondage de la semaine, puis
une équipe et des matchs passés), avec les liens affichés en sortie :

```bash
cd backend && npm run seed && npm run seed:demo
```

## Tests

Le backend est couvert par Vitest : l'algo de recommandation et les règles
transverses en unitaire, les routes en intégration sur une base SQLite jetable
(migrée à part, la base de dev n'est jamais touchée).

```bash
cd backend && npm test
```

## Déploiement

```bash
docker compose up -d --build
```

L'app est servie sur http://localhost:8090 (8080 étant souvent déjà pris en local).

L'app est servie sur http://localhost:8090. Nginx sert le front et proxifie `/api` vers le
backend, donc tout est sur la même origine et il n'y a pas de CORS à configurer. Les routes
type `/e/<token>` fonctionnent en accès direct grâce au fallback SPA de nginx.

Trois services : `frontend` (nginx), `backend` (Express + SQLite) et `cron`, qui lance une
fois par jour la génération des sondages récurrents. Le job est idempotent, le relancer ne
crée pas de doublon.

La base est un fichier SQLite dans le volume `footix-data`. Sauvegarde :

```bash
docker compose cp backend:/app/prisma/data/footix.db ./footix-backup.db
```

Passer à Kubernetes (k3s + DuckDNS, cf. `deploiement-docker-k8s-duckdns.md`) reste possible :
les images sont les mêmes, il faut un Deployment par service, un Ingress, et un CronJob à la
place du service `cron`.

## Structure

```
backend/    API Express + Prisma (SQLite)
  prisma/   schéma et migrations
  src/
    routes/     events (public), answers, manage (organisateur), templates (récurrence)
    jobs/       génération des sondages récurrents
    domain.ts   lieux, seuils, algo de recommandation, tokens, anti-doublon
frontend/   React + Vite + Tailwind, PWA installable
  src/
    pages/      accueil, création, réponse, gestion, historique, récurrence
    components/ formulaire de réponse, liste des présents, carte du lieu
```

## API

Publiques :

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/events?status=ouvert\|cloture` | liste des sondages |
| `POST` | `/api/events` | créer, seul `matchDate` est requis (409 si le jour est pris) |
| `GET` | `/api/events/:publicToken` | voir un sondage, ses réponses et le lieu conseillé |
| `POST` | `/api/events/:publicToken/answers` | répondre ou changer sa réponse |

Organisateur (`:organizerToken`) :

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` `PATCH` `DELETE` | `/api/manage/:organizerToken` | consulter, modifier, supprimer |
| `POST` | `/api/manage/:organizerToken/close` | clôturer et fixer le lieu |
| `PATCH` | `/api/manage/:organizerToken/result` | noter le score après le match |
| `POST` | `/api/manage/:organizerToken/reopen` | rouvrir (efface lieu et score) |

Récurrence :

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` `POST` | `/api/templates` | lister, créer un rendez-vous hebdo |
| `GET` | `/api/templates/:templateId/current` | le sondage courant (cible du lien permanent) |
| `GET` `PATCH` | `/api/templates/manage/:organizerToken` | consulter, modifier |
| `GET` | `/api/templates/manage/:organizerToken/events` | les sondages produits, avec leur lien de gestion |
| `POST` | `/api/templates/generate` | forcer la génération (ce que fait le cron) |

## Pistes pour la suite

- Export ICS / Google / Outlook.
- Rappel automatique sur Teams avant la deadline.
- Statistiques d'assiduité, lieux les plus retenus, buteurs.
