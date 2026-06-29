# COSY v4.9 — API Documentation

## Base URL
```
https://api.cosy.africa/v4
```

## Authentication
Toutes les requêtes authentifiées nécessitent un header `Authorization: Bearer <token>`.

---

## Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login avec téléphone |
| POST | `/auth/verify-otp` | Vérification OTP 6 chiffres |
| POST | `/auth/register` | Création compte créateur/annonceur |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Déconnexion |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Profil utilisateur |
| PUT | `/user/update` | Mise à jour profil |
| GET | `/user/stats` | Statistiques globales |
| GET | `/user/trust-score` | Score de confiance |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/content/tracks` | Liste des morceaux |
| POST | `/content/upload` | Upload audio (multipart) |
| DELETE | `/content/delete/:id` | Suppression |
| GET | `/content/search?q=` | Recherche |

### Radio
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/radio/stations` | Liste des stations |
| GET | `/radio/now-playing` | En cours de lecture |
| GET | `/radio/schedule` | Programmation |

### Monetization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/monetization/wallet` | Solde wallet |
| GET | `/monetization/transactions` | Historique |
| POST | `/monetization/withdraw` | Demande de retrait |
| GET | `/monetization/earnings` | Revenus détaillés |

### Ads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ads/campaigns` | Liste campagnes |
| POST | `/ads/campaigns/create` | Créer campagne |
| PUT | `/ads/campaigns/:id` | Modifier campagne |
| GET | `/ads/campaigns/:id/metrics` | Métriques |
| PUT | `/ads/campaigns/:id/budget` | Modifier budget |

### Fans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fans/list?filter=` | Liste fans (all/vip/top/new) |
| GET | `/fans/profile/:id` | Profil fan détaillé |
| POST | `/fans/message` | Envoyer message |
| GET | `/fans/segment` | Segmentation |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/overview` | Vue d'ensemble |
| GET | `/analytics/streams` | Streams par période |
| GET | `/analytics/revenue` | Revenus par source |
| GET | `/analytics/export?format=csv` | Export CSV |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/list` | Liste notifications |
| POST | `/notifications/mark-read` | Marquer comme lu |
| PUT | `/notifications/settings` | Paramètres |

---

## WebSocket

### Connexion
```javascript
const ws = new WebSocket('wss://ws.cosy.africa/radio');
```

### Events
| Event | Payload | Description |
|-------|---------|-------------|
| `radio.nowPlaying` | `{station, track, artist}` | Mise à jour live |
| `radio.listeners` | `{station, count}` | Nombre d'auditeurs |
| `analytics.realtime` | `{streams, revenue}` | Stats temps réel |
| `notification.new` | `{type, title, body}` | Nouvelle notification |

---

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès interdit |
| 404 | Ressource non trouvée |
| 429 | Trop de requêtes |
| 500 | Erreur serveur |
| 503 | Service indisponible (maintenance) |
