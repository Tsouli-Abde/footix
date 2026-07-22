# Footix — Spécification de projet pour développement

> Ce document est le brief de démarrage à donner à Claude Code pour initialiser et développer le projet Footix. Il centralise le contexte, les décisions de conception et les instructions de mise en œuvre. Nommé `CLAUDE.md` pour être lu automatiquement comme contexte de projet.

## 1. Contexte

Footix est une application interne de type "Doodle" pour organiser les matchs de foot hebdomadaires entre collègues. Aujourd'hui, l'organisation se fait avec Doodle : quelqu'un crée un sondage, envoie le lien sur Teams, chacun vote (nom + disponibilité) sur des options de lieu/format (five, parc, stade, exceptionnellement un match contre une autre entreprise). Footix doit reprendre ce fonctionnement, le personnaliser pour ce cas d'usage précis, et être auto-hébergé.

Porteur du projet : Tsouli. Public : collègues à l'aise avec la tech, qui pourront questionner le fonctionnement — d'où une exigence forte de simplicité et de lisibilité du code et de l'UX, sans sacrifier l'efficacité.

## 2. Principe produit

On part de la base fonctionnelle de Doodle (ce qui suit a fait ses preuves) et on la personnalise pour le foot entre collègues. Ne pas réinventer ce que Doodle fait déjà bien ; adapter aux spécificités suivantes :

- Les options de vote sont des **lieux/formats de match** (five, parc, stade, adversaire externe) et non des créneaux horaires.
- Le vote suit la logique Doodle **Oui / Si besoin / Non** (disponibilité nuancée), pas un simple binaire.
- L'événement est le plus souvent **hebdomadaire récurrent** (le vendredi), mais l'app doit aussi supporter un événement ponctuel.
- Pas de compte utilisateur : accès par lien, saisie libre du prénom/nom, comme Doodle.

## 3. Utilisateurs et flux

**Organisateur** : n'importe quel collègue peut créer un événement (pas de rôle admin dédié), mais un seul événement actif par date/occurrence doit exister — pas de doublons. L'organisateur reçoit un lien "organisateur" (token secret dans l'URL) qui lui permet de modifier/clôturer l'événement depuis n'importe quel appareil, sans compte ni mot de passe. Ce lien est distinct du lien "participant" partagé sur Teams.

**Participant** : ouvre le lien partagé, saisit son prénom/nom (pas d'authentification), vote Oui/Si besoin/Non sur chaque option proposée. Peut modifier son vote tant que l'événement n'est pas clôturé.

**Flux type (cas hebdomadaire) :**
1. Un nouvel événement pour "vendredi prochain" est généré automatiquement à partir d'un modèle récurrent (mêmes options que la semaine précédente), quelques jours avant l'échéance (ex. le mardi).
2. L'organisateur (celui qui a créé la récurrence, ou n'importe qui via le lien organisateur) peut ajuster les options avant publication si besoin.
3. Le lien participant est partagé sur Teams.
4. Chacun vote jusqu'à la deadline (ex. jeudi 18h).
5. Résultats visibles en temps réel par tous (tableau récapitulatif, compteurs par option).
6. L'organisateur clôture le vote ; l'option "gagnante" est mise en avant, mais la décision finale reste humaine (pas de règle automatique imposée au MVP).
7. L'événement passe en historique.

## 4. Fonctionnalités

### MVP (v1)

- Création d'événement : titre, description, liste d'options (lieu/format), limite de participants par option (optionnel), deadline de vote, ponctuel ou récurrent hebdomadaire.
- Lien participant (accès public au vote) et lien organisateur (accès édition/clôture), tous deux générés comme URL avec token unique, sans authentification classique.
- Vote par participant : prénom/nom libre + Oui / Si besoin / Non par option, modifiable jusqu'à la deadline.
- Tableau de résultats en temps réel (rafraîchi par polling, pas besoin de websockets pour ce volume d'usage) : liste des votants par option, compteurs Oui/Si besoin/Non.
- Clôture manuelle par l'organisateur, option gagnante mise en avant visuellement.
- Récurrence hebdomadaire : modèle d'événement réutilisable, nouvelle instance générée automatiquement (job planifié), options modifiables avant publication.
- Anti-doublon : si un événement actif existe déjà pour une date/occurrence donnée, empêcher la création d'un doublon et rediriger vers l'existant.
- Historique simple des événements passés (date, option retenue, nombre de participants) consultable en lecture seule.
- PWA installable, responsive, **optimisée d'abord pour un usage desktop (partage du lien sur Teams depuis un PC) puis adaptée au mobile**.

### V2 (évolutions envisagées, hors MVP)

- Suggestion automatique du lieu par algorithme/règles selon le nombre de votants fermes vs "si besoin", puis évolution possible vers une suggestion par IA.
- Intégration calendrier (export ICS / Google / Outlook).
- Notifications/rappels automatiques (email ou webhook Teams) avant la deadline.
- Statistiques d'historique plus poussées (fréquence de participation par personne, lieu le plus choisi).

## 5. Modèle de données (proposition de départ)

- **Event** : id, titre, description, type (`ponctuel` / `récurrent`), date/heure du match, deadline de vote, statut (`ouvert` / `clôturé`), organizer_token, recurrence_template_id (nullable), created_at.
- **RecurrenceTemplate** : id, jour de la semaine, options par défaut, délai de génération (ex. J-3), actif/inactif.
- **Option** : id, event_id, libellé (ex. "Five", "Parc", "Stade", "Match externe"), capacité max (nullable).
- **Participant** : id, event_id, prénom/nom (texte libre), created_at.
- **Vote** : id, participant_id, option_id, valeur (`oui` / `si_besoin` / `non`).

Ce schéma est une proposition de départ, à affiner en implémentant.

## 6. Stack technique recommandée

Recommandation pensée pour rester simple, efficace, et compréhensible par un public tech — **à ajuster librement selon ce qui semble le plus pertinent en développant**, ce ne sont pas des contraintes strictes :

- **Frontend** : React + Vite + TypeScript, Tailwind CSS pour un rendu moderne façon Doodle (cartes, tableau de vote coloré), `vite-plugin-pwa` pour le manifest et le service worker. Pas de framework SSR (Next.js) nécessaire : l'app est un outil interne sans besoin SEO, le rendu client suffit et reste plus simple à raisonner.
- **Backend** : Node.js + Express (ou Fastify) + TypeScript, API REST simple. Pas de websockets au MVP : un polling léger (rafraîchissement toutes les 5-10s sur la page de résultats) suffit largement au volume d'usage et reste plus simple à opérer.
- **Base de données** : SQLite via Prisma ORM pour démarrer (un seul fichier, pas de service additionnel à opérer sur le cluster, backup simple). PostgreSQL reste une évolution naturelle si le besoin de robustesse augmente — Prisma facilite la migration.
- **Job de récurrence** : petit script planifié (CronJob Kubernetes, cohérent avec l'architecture déjà en place pour DuckDNS) qui génère les nouvelles instances d'événements récurrents.

## 7. Déploiement

Une architecture Docker + Kubernetes (k3s) + DuckDNS a déjà été validée et documentée (`deploiement-docker-k8s-duckdns.md`, fourni séparément) : Dockerfile par service, manifests `k8s/` (Deployment, Service, Ingress avec cert-manager), CronJob DuckDNS pour l'IP dynamique.

Cette architecture est **une option de référence, pas une contrainte imposée** : Claude Code doit se sentir libre de proposer une alternative si elle est plus simple ou plus adaptée (par exemple un déploiement Docker Compose seul pour commencer, avant de passer à Kubernetes si besoin). Si Kubernetes est retenu, reprendre la structure du document de référence (un dossier `k8s/` avec Deployment/Service/Ingress par service, CronJob pour DuckDNS et pour la génération des événements récurrents).

## 8. Instructions de mise en œuvre pour Claude Code

1. Initialiser un dépôt Git local (`git init`) à la racine du projet, avec un `.gitignore` adapté (node_modules, .env, fichiers de build, base SQLite locale).
2. Créer un repository distant sur GitHub pour le projet (nom suggéré : `footix`), configurer le remote, et pousser (`git push`) régulièrement au fil du développement — pas un seul gros commit final. Découper le travail en commits atomiques et clairs (ex. "init frontend", "API events CRUD", "logique de vote", "PWA manifest", "Dockerfile backend", etc.).
3. Structurer le repo en monorepo simple : `frontend/`, `backend/`, `k8s/` (si Kubernetes retenu), `docker-compose.yml` pour le développement local, `README.md` expliquant comment lancer le projet.
4. Écrire les Dockerfiles (un par service) et, si Kubernetes est retenu, les manifests dans `k8s/`, en s'inspirant de la structure du document de référence sur le déploiement.
5. Développer le MVP décrit en section 4, dans cet ordre suggéré : modèle de données + API CRUD événements/options → logique de vote → page de vote (frontend) → tableau de résultats temps réel → gestion organisateur (édition/clôture) → récurrence automatique → anti-doublon → historique → PWA (manifest, service worker, responsive desktop puis mobile).
6. Front inspiré de Doodle : design épuré, tableau de vote coloré et lisible (vert/orange/rouge pour Oui/Si besoin/Non), UX simple pour ajouter un événement et voter en quelques clics.
7. Prioriser la lisibilité du code et une architecture simple (peu de dépendances, pas de sur-ingénierie) : le projet doit rester compréhensible par toute l'équipe tech qui l'utilisera.

## 9. Questions encore ouvertes (à trancher si besoin en développant)

- Faut-il exposer un affichage "résultats masqués jusqu'à la clôture" (option de confidentialité à la Doodle), ou tout est toujours visible en temps réel ? Décision par défaut proposée : tout visible en temps réel, plus simple et cohérent avec l'usage actuel sur Teams.
- Faut-il une limite de participants stricte par option (bloque le vote une fois pleine) ou juste indicative (affichée mais non bloquante) ? Décision par défaut proposée : indicative au MVP, pour rester simple.
