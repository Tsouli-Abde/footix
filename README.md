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
au moment de clôturer : il valide le lieu proposé, prend l'autre, ou clôture sans lieu si le
match tombe à l'eau.

L'heure est facultative : par défaut on joue sur la pause déj et l'app ne l'affiche pas.
L'organisateur peut en fixer une quand on sort du créneau habituel.

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
  indifférents) recharge sa réponse au lieu d'en créer une deuxième. L'appareil qui a répondu
  retient l'id de sa réponse : c'est ce qui permet de distinguer « je reviens changer d'avis »,
  silencieux, de « je porte le même prénom qu'un autre », qui demande confirmation.

Une fois le match joué, l'organisateur peut noter le **score**, visible ensuite par tout le
monde.

Si personne ne clôture, l'app le fait toute seule **trois heures avant le coup d'envoi**, en
retenant le lieu qu'elle conseillait. C'est volontairement silencieux : c'est du ménage, pas
une décision, ça ne mérite pas de notification.

## Lancer l'app sur sa machine

Il faut Docker et Node 22. Deux façons de faire, selon ce qu'on veut.

### Juste l'essayer

Tout dans Docker, une commande depuis la racine :

```bash
docker compose up -d --build
```

L'app est sur **http://localhost:29090**. Les migrations sont appliquées au démarrage du
conteneur, il n'y a rien d'autre à faire. Pour avoir des données sous les yeux (un sondage
pour le prochain vendredi, puis une équipe et des matchs passés), avec les liens affichés
en sortie :

```bash
docker compose exec backend node dist/scripts/seed.js
```

```bash
docker compose exec backend node dist/scripts/seed-demo.js
```

Pour arrêter, `docker compose down` (ajouter `-v` pour repartir d'une base vide).

### Développer dessus

Là on veut le rechargement à chaud, donc seule la base reste dans Docker. Trois terminaux,
depuis la racine puis dans chaque dossier :

```bash
docker compose up -d db
```

```bash
cd backend && cp .env.example .env && npm install && npx prisma migrate deploy && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Le front tourne sur **http://localhost:29173** et proxifie `/api` vers le backend
(port **29301**). Le conteneur de base publie le port **29433**, ce que pointe déjà
`.env.example`.

Tous les ports ouverts sur la machine sont en **29xxx**, choisis exprès : cette plage n'est
utilisée par presque rien, et elle est hors de la plage éphémère de Windows (qui commence à
49152), donc jamais tirée au sort par le système. Les ports habituels — 3001, 5173, 5432,
8080 — restent libres pour tes autres projets. Récapitulatif :

| Port | Quoi |
| --- | --- |
| 29090 | l'app en Docker |
| 29173 | le front Vite en dev |
| 29301 | l'API en dev |
| 29433 | PostgreSQL (bases `footix` et `footix_test`) |

À l'intérieur des conteneurs le backend écoute toujours sur 3001, mais ce port n'est jamais
publié : il ne peut entrer en conflit avec rien.

Les données de démonstration, ici, se chargent directement :

```bash
cd backend && npm run seed && npm run seed:demo
```

### Les tests

La base de test (`footix_test`) est créée au premier démarrage du conteneur, il n'y a donc
rien à préparer :

```bash
cd backend && npm test
```

## Cas particuliers déjà gérés

La vie d'un sondage n'est pas toujours propre, voici ce qui est prévu :

| Situation | Ce que fait l'app |
| --- | --- |
| Deux personnes portent le même prénom | Au clic sur *Envoyer*, l'app relit les réponses : si ce prénom appartient à quelqu'un d'autre, elle demande « C'est toi ? » avant d'écraser. On confirme, ou on ajoute une initiale (« Thomas B ») |
| Quelqu'un revient changer d'avis | Le même prénom écrase sa propre réponse, accents et casse indifférents. Sur l'appareil qui a répondu, le formulaire préremplit la réponse envoyée et ne demande rien |
| Personne n'a répondu | Message distinct de « personne n'est dispo », pour ne pas confondre silence et refus |
| Trop peu de monde | On annonce le nombre de joueurs et le minimum, plutôt qu'un lieu |
| Ça ne tient qu'aux indécis | Les « si besoin » sont comptés à part, la carte passe en orange |
| Vraiment trop de monde | La carte reste verte, l'organisateur voit le total |
| Match ou deadline déjà passés | Refusé à la création, la deadline est recalée si besoin |
| Deux sondages le même jour | Contrainte en base, on renvoie vers celui qui existe |
| Réponse après la deadline | Refusée, le sondage est en lecture seule |
| Sondage jamais clôturé | Clôturé tout seul trois heures avant le match, sans notification |

## Notifications

Deux canaux complémentaires, alimentés par le même **fil d'activité** (modèle `Activity`) :
chaque moment notable (sondage ouvert, réponse, rappel de la veille, clôture, score) y laisse
une ligne.

- **In-app** : une cloche dans l'en-tête (compteur de non-lus + panneau déroulant) et des
  **toasts** qui surgissent quand quelque chose se passe pendant qu'on utilise l'app. Le front
  interroge `/api/activity` par polling ; le toast n'apparaît que si l'onglet est visible, la
  cloche se met à jour en continu. On ne se notifie jamais de sa propre réponse.
- **Push OS** (ci-dessous) : pour l'écran verrouillé ou l'app fermée. Volontairement limité
  aux deux seuls moments qui demandent quelque chose aux gens, soit **deux notifications par
  match au maximum** : à l'ouverture du sondage, et le récapitulatif de la veille. Les
  réponses, la clôture et le score restent dans l'app, pour qu'une notification garde du sens.

## Notifications push

En plus du lien partagé sur Teams, on peut recevoir une **notification push** quand un
sondage s'ouvre, même téléphone verrouillé et app fermée. C'est opt-in : un bouton
« Être prévenu des nouveaux matchs » sur l'accueil, qui demande la permission puis abonne
le navigateur.

Ça repose sur la Web Push API (VAPID) : le service worker (`frontend/src/sw.ts`) affiche la
notification, le backend (`backend/src/push.ts`) l'envoie à tous les abonnés.

Pour l'activer, il faut une paire de clés VAPID côté backend :

```bash
cd backend && npx web-push generate-vapid-keys
```

puis renseigner `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` dans `backend/.env` (voir
`.env.example`). Sans ces clés, tout le reste fonctionne et le bouton se cache tout seul.

Deux limites à connaître : le push web exige un contexte sécurisé (HTTPS, ou `localhost` en
dev), et sur **iOS** il ne marche que si l'app est **installée sur l'écran d'accueil**.

## Tests

Le backend est couvert par Vitest : l'algo de recommandation et les règles transverses en
unitaire, les routes en intégration sur une base PostgreSQL dédiée (`footix_test`), pour que
la base de dev ne soit jamais touchée.

```bash
cd backend && npm test
```

## Déploiement

```bash
docker compose up -d --build
```

L'app est servie sur http://localhost:29090 (voir la note sur les ports plus haut). Nginx sert
le front et proxifie `/api` vers le backend, donc tout est sur la même origine et il n'y a pas
de CORS à configurer. Les routes type `/e/<token>` fonctionnent en accès direct grâce au
repli SPA de nginx.

Quatre services : `db` (PostgreSQL), `backend` (Express + Prisma), `frontend` (nginx) et
`cron`, qui lance toutes les heures le récapitulatif de la veille et la clôture automatique.
Le job est idempotent, le relancer ne double rien.

Les données vivent dans le volume `footix-data`. Sauvegarde :

```bash
docker compose exec db pg_dump -U footix footix > footix-backup.sql
```

### Mise en ligne avec Caddy

Pour un vrai déploiement, `docker-compose.prod.yml` place **Caddy** en frontal : il obtient
et renouvelle le certificat TLS tout seul, et route vers l'application et l'API. Aucun autre
service n'est exposé, tout le reste reste sur le réseau interne.

```bash
cp .env.example .env   # renseigner FOOTIX_DOMAIN et POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml up -d --build
```

Le domaine doit pointer sur la machine et les ports 80 et 443 doivent être ouverts, sinon
Let's Encrypt ne peut pas valider. La config se trouve dans `deploy/Caddyfile`.

### Déploiement sur une machine qui sert déjà un autre site

Si un Caddy (système, ou celui d'un autre projet Docker Compose) tient déjà les ports 80 et
443, ne pas lancer le Caddy embarqué de footix par-dessus : il échouerait à démarrer (port déjà
pris), ou pire, s'il gagnait la course, couperait l'autre site.

La surcouche `docker-compose.shared.yml` désactive le Caddy de footix et ne publie que le
frontend, sur la boucle locale :

```bash
cp .env.example .env   # FOOTIX_DOMAIN peut valoir n'importe quoi ici, il n'est plus utilisé
docker compose -f docker-compose.prod.yml -f docker-compose.shared.yml up -d --build
curl 127.0.0.1:8095            # doit répondre
curl 127.0.0.1:8095/api/health # idem, proxifié en interne vers le backend
```

Un seul port suffit : le conteneur frontend proxifie déjà `/api/` vers le backend sur le
réseau Docker interne (`frontend/nginx.conf`), le backend n'a donc besoin d'aucun port public.

Reste à faire connaître footix au Caddy déjà en place : coller le bloc de
`deploy/Caddyfile.snippet` dans son Caddyfile, `caddy validate`, puis `systemctl reload caddy`
(reload, pas restart, pour ne pas couper les sites déjà servis). Ce fichier système est hors
de ce repo, cette étape se fait à la main sur la machine.

Avant de déployer, vérifier que le port choisi (8095) est bien libre sur la machine et ne
recoupe aucun port déjà utilisé par l'autre projet (`ss -ltn`), et que le nom de projet Docker
Compose de l'autre application est lui aussi fixé (`name:` dans son compose file) — sinon le
nommage de ses conteneurs et volumes dépend du nom du dossier où il est cloné, ce qui peut
changer d'une machine à l'autre.

Passer à Kubernetes (k3s + DuckDNS, cf. `deploiement-docker-k8s-duckdns.md`) reste possible :
les images sont les mêmes, il faut un Deployment par service, un Ingress, et un CronJob à la
place du service `cron`.

## Structure

```
backend/    API Express + Prisma (PostgreSQL)
  prisma/   schéma et migrations
  src/
    routes/     events (public), answers, manage (organisateur), activity, push
    jobs/       tick horaire : rappel de la veille et clôture automatique
    domain.ts   lieux, seuils, algo de recommandation, tokens, anti-doublon
frontend/   React + Vite + Tailwind, PWA installable
  src/
    pages/      accueil, création, réponse, gestion
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


## Pistes pour la suite

- Export ICS / Google / Outlook.
- Rappel automatique sur Teams avant la deadline.
- Statistiques d'assiduité, lieux les plus retenus, buteurs.
