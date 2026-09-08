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
