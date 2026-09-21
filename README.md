# Klinzo API

Backend NestJS de Klinzo : authentification, utilisateurs et collecteurs, catalogue, abonnements, opérations de collecte, finance, communication, reporting et vues Yeria.

## Prérequis

- Node.js 20.19+, 22.12+ ou 24.x
- pnpm 10.33.3 (via Corepack)
- Docker et Docker Compose

## Démarrage local

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env
# Renseigner les secrets dans .env avant de poursuivre.
docker compose up -d postgres-db
corepack pnpm exec prisma generate
corepack pnpm prisma:deploy
corepack pnpm exec prisma db seed
corepack pnpm start:dev
```

PostgreSQL est exposé sur le port **5435** de l'hôte (5432 dans le conteneur). `DATABASE_URL` doit donc viser `localhost:5435` quand l'API tourne sur l'hôte. Le mot de passe dans l'URL doit être encodé pour une URL (un espace devient `%20`). Si le volume Docker existe déjà avec d'autres identifiants, changer `.env` ne modifie pas les identifiants de cette base existante.

L'API écoute sur `http://localhost:4000`. `GET /health` vérifie le serveur ; `GET /health/ready` vérifie aussi la base. La documentation Swagger est disponible hors production sur `http://localhost:4000/api/docs`. pgAdmin est facultatif : `docker compose up -d pgadmin`, puis `http://localhost:5051`.

## Vérifications

```bash
corepack pnpm build
corepack pnpm exec jest --runInBand
corepack pnpm exec jest --config ./test/jest-e2e.json --runInBand
```

## Configuration

Le fichier `.env.example` décrit les variables prises en charge. `.env` est ignoré par Git. En production, `DATABASE_URL`, les secrets JWT, `CORS_ORIGIN`, `BACKEND_URL` et les clés PEM Yeria sont obligatoires. En développement, Yeria génère ses clés sous `storage/keys/` au premier usage.
