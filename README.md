<<<<<<< Updated upstream
# Klinzo API

Backend NestJS de Klinzo, la plateforme SaaS de collecte des déchets. L'API expose l'authentification, les référentiels métier, les abonnements, les opérations terrain, la finance et les vues Yeria.

## Prérequis

- Node.js `20.19+`, `22.12+` ou `24.x`
- pnpm `10.33.3`
- PostgreSQL/PostGIS via `docker-compose.yml` pour les flows base de données

## Démarrage local

```bash
nvm use
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres-db
pnpm prisma:deploy
pnpm start:dev
```

L'API écoute sur le port défini par `PORT` (`http://localhost:4000` avec le `.env.example`). `GET /health` vérifie que le runtime est démarré ; `GET /health/ready` vérifie aussi la connexion base de données.

## Configuration de production

Les variables suivantes sont obligatoires en production :

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`
- `CORS_ORIGIN`
- `BACKEND_URL`
- `YERIA_PRIVATE_KEY`
- `YERIA_PUBLIC_KEY`

`JWT_SECRET` et `JWT_REFRESH_SECRET` doivent être longs, distincts et non dérivés des valeurs d'exemple. Les clés Yeria doivent être injectées par variables d'environnement ; les clés générées localement sous `storage/keys/` ne sont pas versionnées.

Les paramètres métier suivants ont des valeurs par défaut validées au démarrage et peuvent être surchargés selon l'environnement :

- `PLATFORM_COMMISSION_RATE`
- `COLLECTION_AUTO_VALIDATION_HOURS`
- `COLLECTOR_INVOICE_DUE_DAYS`

Swagger est activé hors production. En production, il reste désactivé sauf si `SWAGGER_ENABLED=true`.

## Commandes utiles

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
pnpm prisma:deploy
pnpm start:prod
```

Avant un déploiement, exécuter au minimum `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, puis valider `pnpm prisma:deploy` contre la base de production ou de staging.
=======
# KLINZO Backend

API NestJS pour la gestion des collectes, des véhicules, des zones, des utilisateurs, des facturations et de la plateforme SaaS.

## Prérequis

- Node.js 20+
- npm
- Docker Desktop / Docker Engine
- PostgreSQL via Docker Compose

## 1. Installer les dépendances

```bash
npm install
```

## 2. Configurer les variables d’environnement

Créer un fichier `.env` à partir de `.env.example` et compléter les valeurs.

Exemple de configuration compatible avec le docker-compose du projet :

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=gestion_dechets
DATABASE_URL="postgresql://postgres:postgres123@localhost:5435/gestion_dechets?schema=public"
PGADMIN_EMAIL=admin@saas-dechets.com
PGADMIN_PASSWORD=Admin123
JWT_SECRET=klinzo-secret-key-dev-2026
JWT_REFRESH_SECRET=klinzo-refresh-secret-key-dev-2026
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
SUPER_ADMIN_EMAIL=admin@votre-saas.com
SUPER_ADMIN_PASSWORD=MotDePasseTresSecurise123!
```

## 3. Démarrer la base de données

```bash
docker compose up -d
```

Le projet utilise PostgreSQL avec PostGIS sur le port `5435` et pgAdmin sur `5051`.

## 4. Initialiser Prisma

```bash
npx prisma generate
npx prisma migrate deploy
```

## 5. Lancer l’API

### Mode développement

```bash
npm run start
```


### Mode watch

```bash
npm run start:dev
```

### Mode production

```bash
npm run build
npm run start:prod
```

## Scripts utiles

```bash
npm run test
npm run test:e2e
npm run lint
npm run build
```

## Points importants

- Le fichier `.env` est obligatoire pour que `PrismaService` récupère `DATABASE_URL`.
- Si tu modifies le port PostgreSQL dans le `docker-compose.yml`, il faut adapter `DATABASE_URL` en conséquence.
- Le schéma Prisma est dans le dossier `prisma/`.

## Structure principale

- `src/` : code applicatif NestJS
- `prisma/` : schema Prisma, migrations et seed
- `test/` : tests e2e
- `docker-compose.yml` : PostgreSQL + pgAdmin

## Liens utiles

- NestJS : https://nestjs.com
- Prisma : https://www.prisma.io
- PostgreSQL : https://www.postgresql.org
>>>>>>> Stashed changes
