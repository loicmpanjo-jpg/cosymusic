// COSY v4.9 — Route Configuration
const COSY_ROUTES = {
  public: ['auth', 'otp', 'register'],
  creator: ['home', 'studio', 'analytics', 'fans', 'profile', 'wallet', 'trust'],
  advertiser: ['home', 'ads', 'analytics', 'profile', 'wallet', 'trust'],
  shared: ['search', 'radio', 'trends', 'notifs', 'player'],

  // Route metadata for analytics
  meta: {
    auth: { title: 'Connexion', analytics: false },
    otp: { title: 'Vérification', analytics: false },
    register: { title: 'Inscription', analytics: false },
    home: { title: 'Accueil', analytics: true },
    trends: { title: 'Tendances', analytics: true },
    search: { title: 'Recherche', analytics: true },
    radio: { title: 'Radio', analytics: true },
    studio: { title: 'Studio', analytics: true },
    analytics: { title: 'Analytics', analytics: true },
    ads: { title: 'Ads Manager', analytics: true },
    fans: { title: 'Fan CRM', analytics: true },
    wallet: { title: 'Wallet', analytics: true },
    profile: { title: 'Profil', analytics: true },
    notifs: { title: 'Notifications', analytics: true },
    trust: { title: 'Trust Score', analytics: true },
    player: { title: 'Lecteur', analytics: false }
  }
};

// Export for module systems
if (typeof module !== 'undefined') module.exports = COSY_ROUTES;
