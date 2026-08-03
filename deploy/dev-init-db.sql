-- Exécuté une seule fois, au premier démarrage du volume PostgreSQL de dev
-- (docker-compose.yml, service db). La base applicative footix est déjà créée
-- par l'image via POSTGRES_DB ; il ne manque que celle des tests.
--
-- Les tests migrent et vident cette base à volonté, elle doit donc rester
-- séparée de footix pour ne jamais effacer les données de développement.
CREATE DATABASE footix_test;
