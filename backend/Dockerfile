# --- Compilation -------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Exécution ---------------------------------------------------------------
FROM node:22-alpine

# Les dates de match sont saisies et affichées en heure de Paris ; la clé
# anti-doublon (le jour du match) dépend du fuseau du conteneur.
ENV NODE_ENV=production
ENV TZ=Europe/Paris

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Le client Prisma est généré à la compilation, on récupère l'artefact.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3001

# Les migrations sont appliquées au démarrage : le conteneur est toujours
# cohérent avec le schéma, sans étape manuelle au déploiement.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
