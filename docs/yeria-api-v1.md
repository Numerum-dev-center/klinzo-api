# Contrat API Klinzo × Yeria — v1

Statut : **stable**  
Version : **1.0.0**  
Date : 28 septembre 2026

## 1. Base URL et compatibilité

La base canonique est :

```text
{BACKEND_URL}/api/v1/yeria
```

Les anciennes routes sous `{BACKEND_URL}/yeria` restent temporairement disponibles comme alias de compatibilité. Toute nouvelle intégration mobile doit utiliser `/api/v1/yeria`.

Toutes les réponses de ce périmètre exposent :

```http
X-Klinzo-Contract-Version: 1.0.0
X-Klinzo-Contract-Stability: stable
```

Le manifeste machine-readable est disponible avec `GET /api/v1/yeria/contract`. Swagger reste disponible avec `GET /api/docs` lorsque Swagger est activé.

## 2. Politique de versionnement

- Un ajout rétrocompatible conserve `/api/v1` et incrémente la version mineure du contrat.
- Une correction sans changement fonctionnel incrémente la version corrective.
- Une suppression, un renommage de champ, un changement de type ou de sémantique exige `/api/v2`.
- Une route ou un champ déprécié doit être annoncé au moins 90 jours avant son retrait.
- Le mobile doit ignorer les champs de réponse inconnus et ne jamais dépendre de leur ordre.

## 3. Authentification

Deux services Yeria sont distingués :

| Surface       | Service ID par défaut | Jeton                       |
| ------------- | --------------------- | --------------------------- |
| Usager        | `klinzo`              | Bearer Yeria public-service |
| Agent terrain | `klinzo-agent`        | Bearer Yeria agent-service  |

En-tête :

```http
Authorization: Bearer <token_yeria>
```

La découverte des offres et zones accepte un accès anonyme. Les abonnements personnels, QR de bac et opérations agent exigent un jeton. Un agent doit être pré-provisionné dans Klinzo avec le rôle `AGENT_COLLECTEUR` ou `ADMIN_COLLECTEUR` et être rattaché à un collecteur actif.

## 4. Format des erreurs

Les erreurs NestJS suivent ce format général :

```json
{
  "statusCode": 403,
  "message": "Vous ne pouvez consulter que vos propres abonnements.",
  "error": "Forbidden"
}
```

Codes attendus :

| Code  | Signification                                      |
| ----- | -------------------------------------------------- |
| `400` | Payload ou transition métier invalide              |
| `401` | Jeton absent, invalide ou agent non provisionné    |
| `403` | Ressource appartenant à un autre usager/collecteur |
| `404` | Ressource inexistante ou non publiable             |
| `409` | Conflit ou doublon métier                          |
| `500` | Erreur serveur non prévue                          |

## 5. Endpoints usager

Les réponses sont des vues SDUI signées par le SDK Yeria, sauf le manifeste `/contract`.

| Méthode | Route v1                              | Authentification | Usage                                                                        |
| ------- | ------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `GET`   | `/`                                   | Facultative      | Accueil Yeria Klinzo                                                         |
| `GET`   | `/contract`                           | Non              | Manifeste de version                                                         |
| `GET`   | `/offers?zone={trackingId}`           | Non              | Offres actives de collecteurs actifs et KYC approuvé                         |
| `GET`   | `/offers/{offerTrackingId}`           | Non              | Détail d'une offre publiable                                                 |
| `GET`   | `/offers/{offerTrackingId}/subscribe` | Facultative      | Formulaire de souscription                                                   |
| `POST`  | `/offers/{offerTrackingId}/subscribe` | Recommandée      | Création de la souscription                                                  |
| `GET`   | `/subscription/{trackingIdOuQrCode}`  | Obligatoire      | QR appartenant à l'usager connecté                                           |
| `GET`   | `/search`                             | Non              | Formulaire de recherche de couverture                                        |
| `POST`  | `/search`                             | Non              | Recherche par zone ou ville                                                  |
| `GET`   | `/my-subscriptions`                   | Obligatoire      | Abonnements de l'usager connecté                                             |
| `POST`  | `/my-subscriptions`                   | Obligatoire      | Même consultation ; les filtres libres ne donnent aucun accès supplémentaire |

### Souscription

```http
POST /api/v1/yeria/offers/{offerTrackingId}/subscribe
Authorization: Bearer <token_yeria>
Content-Type: application/json
```

```json
{
  "subscriberName": "Ama Mensah",
  "subscriberEmail": "ama@example.com",
  "subscriberPhone": "+22890000000",
  "addressText": "Agoè, Lomé",
  "latitude": 6.223,
  "longitude": 1.191
}
```

Règles : l'offre, son collecteur et sa zone doivent être actifs ; l'identité du jeton prévaut sur les coordonnées déclarées lorsque l'usager est authentifié. Le paiement Web n'est pas requis dans cette version.

## 6. Endpoints agent terrain

Base : `/api/v1/yeria/agent`.

| Méthode | Route                              | Usage                                 |
| ------- | ---------------------------------- | ------------------------------------- |
| `GET`   | `/`                                | Tableau de bord de l'agent            |
| `GET`   | `/menu`                            | Menu des opérations                   |
| `GET`   | `/tours`                           | Tournées du collecteur de l'agent     |
| `GET`   | `/tours/{tourTrackingId}`          | Détail d'une tournée autorisée        |
| `POST`  | `/tours/{tourTrackingId}/start`    | Passage `PLANNED → IN_PROGRESS`       |
| `POST`  | `/tours/{tourTrackingId}/complete` | Passage `IN_PROGRESS → COMPLETED`     |
| `GET`   | `/scan`                            | Sélection d'une tournée active        |
| `POST`  | `/scan`                            | Ouverture du scanner pour une tournée |
| `POST`  | `/scan/{tourTrackingId}`           | Validation terrain du QR              |
| `GET`   | `/history`                         | Historique du collecteur de l'agent   |

### Validation d'une collecte

```http
POST /api/v1/yeria/agent/scan/{tourTrackingId}
Authorization: Bearer <token_agent_yeria>
Content-Type: application/json
```

```json
{
  "qrData": "QR-123456",
  "gpsLat": 6.223,
  "gpsLng": 1.191,
  "photoUrl": "https://media.example/collecte/preuve.jpg"
}
```

Règles :

- le QR doit désigner un abonnement `ACTIVE` du même collecteur ;
- la tournée doit appartenir au collecteur de l'agent ;
- le GPS est obligatoire en production ;
- aucune ressource d'un autre collecteur n'est retournée ;
- un agent non provisionné ou non rattaché reçoit `401`.

## 7. États métier

### Abonnement

`PENDING_PAYMENT`, `ACTIVE`, `PAUSED`, `CANCELLED`.

Dans le MVP actuel, l'activation directe sans paiement est une règle temporaire. L'équipe mobile ne doit pas simuler un paiement.

### Tournée

`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

### Collecte

`PENDING`, `VALIDATED`, `DISPUTED`, `CANCELLED`.

### Litige

`OPEN`, `IN_REVIEW`, `RESOLVED`. La résolution administrative appartient au Web ; le mobile peut seulement initier la contestation via les routes métier communes lorsqu'elles sont intégrées.

## 8. Identifiants et dates

- Les échanges externes utilisent toujours `trackingId`, jamais les clés SQL numériques.
- Les dates sont des chaînes ISO 8601 UTC.
- Les montants actuels sont exprimés en FCFA/XOF selon l'offre.
- Les coordonnées utilisent latitude puis longitude, en degrés décimaux WGS84.

## 9. Hors contrat v1

- fournisseur de paiement et webhook PSP ;
- paiement ou remboursement initié par le Web ;
- mode hors-ligne et stratégie de synchronisation mobile ;
- stockage binaire définitif des photos terrain ;
- push et SMS transactionnels.

Ces éléments nécessiteront une extension documentée du contrat, sans modification silencieuse des routes v1.
