# COSY v4.9 — Creator Ecosystem Platform

## 🎵 L'écosystème créateur africain

COSY est une plateforme complète dédiée aux créateurs de contenu musical africain, intégrant streaming, monétisation, radio virtuelle et publicité B2B.

---

## 📁 Structure du projet

```
cosy_v49/
├── index.html              # Application principale (16 écrans SPA)
├── manifest.json           # Configuration PWA
├── service-worker.js       # Offline cache + background sync
├── config/
│   ├── routes.js           # Configuration des routes
│   ├── api.js              # Endpoints API
│   └── theme.js            # Design tokens
├── assets/
│   ├── icons/              # Icônes PWA (72x72 à 512x512)
│   └── images/             # Images et illustrations
└── docs/
    ├── README.md           # Ce fichier
    ├── API.md              # Documentation API
    ├── DEPLOY.md           # Guide de déploiement
    └── CHANGELOG.md        # Journal des modifications
```

---

## 🎨 Identité visuelle v4.9

| Token | Couleur | Hex | Usage |
|-------|---------|-----|-------|
| MS Blue | `#0078D4` | CTA principal, navigation active, glow effects |
| Savane | `#3DA876` | Gains, live actif, validations, revenus |
| Orange | `#FF6520` | Upload, création, badges HOT, actions chaudes |
| Gold | `#D4A847` | Ads Manager, premium, annonceurs B2B, campagnes |
| Live Red | `#E8404A` | Alertes, erreurs, violations, urgent |
| Night 0-5 | `#060E1C` → `#243660` | Fonds, profondeur 3D, glassmorphism |

---

## 🖥️ Les 16 écrans

### Auth & Onboarding
1. **Auth** — Login OTP + Google + Apple
2. **OTP** — Vérification 6 chiffres
3. **Register** — Inscription créateur/annonceur

### Discovery
4. **Home** — Hero, artistes, featured tracks, radio preview
5. **Trends** — Classement FCFA avec Infinite Scroll
6. **Search** — Big cards, filtres par catégorie
7. **Radio** — Equalizer animé, stations live, espace B2B

### Creator Suite
8. **Wallet** — Solde FCFA, historique transactions, retrait
9. **Profile** — Cover, stats 4 couleurs, discographie
10. **Studio** — Upload drag & drop, tabs morceaux/playlists/brouillons
11. **Analytics** — Stats grid, chart bars animés, répartition revenus
12. **Ads Manager** — Campagnes, budget slider, metrics CTR
13. **Fan CRM** — Filtres VIP/Top/New, profil fan modal, messagerie

### System
14. **Notifications** — Unread badges, 5 types (like, follow, money, system)
15. **Trust Score** — Score ring animé, historique violations
16. **Player Full** — Waveform progress, 5 boutons de contrôle

---

## ⚡ Fonctionnalités

### v4.9 Core
- [x] **PWA** — Installable, offline-first, service worker
- [x] **Offline Mode** — Bannière + contenu en cache
- [x] **Skeleton Loaders** — Animation shimmer
- [x] **Infinite Scroll** — Trends + Fan CRM
- [x] **Multi-langue** — FR / EN / PT avec auto-détection
- [x] **Dark/Light** — Toggle + raccourci clavier `T`
- [x] **Responsive** — Desktop (sidebar 260px) + Mobile (bottom nav)
- [x] **Pull-to-refresh** — Mobile
- [x] **Toast notifications** — Success / Error / Info
- [x] **Modals** — Fan profile détaillé
- [x] **Mini Player** — Mobile fixe avec contrôles
- [x] **Keyboard shortcuts** — `T` thème, `Esc` fermer, `Space` play/pause
- [x] **Real-time** — Equalizer animé, WebSocket simulé

---

## 🚀 Démarrage rapide

### Local
```bash
# Serveur HTTP simple
python -m http.server 8000
# ou
npx serve .

# Ouvrir http://localhost:8000
```

### Déploiement
Voir [DEPLOY.md](DEPLOY.md) pour les options Netlify, Vercel, Cloudflare Pages, Firebase Hosting.

---

## 🔧 Configuration

### API
Modifier `config/api.js` pour pointer vers votre backend :
```javascript
baseURL: 'https://api.votre-domaine.com/v4'
```

### Thème
Modifier `config/theme.js` pour personnaliser les couleurs, espacements et ombres.

---

## 📄 License

Propriétaire — COSY Creator Ecosystem Platform
© 2026
