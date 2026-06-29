# COSY v4.9 — Guide de déploiement

## 🚀 Options de déploiement

### 1. Netlify (Recommandé)

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Déployer
netlify deploy --prod --dir=.
```

**Configuration `netlify.toml`:**
```toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel --prod
```

**Configuration `vercel.json`:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 3. Cloudflare Pages

1. Connecter le repo Git à Cloudflare Pages
2. Build settings: `None` (static site)
3. Build output directory: `.`

### 4. Firebase Hosting

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Initialiser
firebase init hosting

# Déployer
firebase deploy
```

### 5. GitHub Pages

```bash
# Branch: gh-pages
# Source: main branch / root
```

---

## 🔧 Configuration post-déploiement

### 1. HTTPS obligatoire
Le service worker et la PWA nécessitent HTTPS en production.

### 2. Headers recommandés
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### 3. API Backend
Mettre à jour `config/api.js` avec l'URL de production :
```javascript
baseURL: 'https://api.cosy.africa/v4'
```

---

## 📊 Monitoring

### Analytics
- Intégrer Google Analytics 4 ou Plausible
- Tracker les événements: `screen_view`, `play`, `upload`, `purchase`

### Performance
- Lighthouse CI pour les scores Core Web Vitals
- Objectif: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## 🔄 Mise à jour

### Versioning
- Incrémenter `CACHE_NAME` dans `service-worker.js` à chaque release
- Les utilisateurs recevront la nouvelle version automatiquement

### Cache busting
- Ajouter un hash aux noms de fichiers statiques
- Ou utiliser `?v=4.9.1` sur les assets
