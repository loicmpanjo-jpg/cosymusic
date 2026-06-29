// COSY v4.9 — API Configuration
const COSY_API = {
  baseURL: 'https://cosy-api-s5qb.onrender.com/api/v0',

  endpoints: {
    // Auth
    auth: {
      login: '/auth/login',
      verifyOTP: '/auth/verify-otp',
      register: '/auth/register',
      refresh: '/auth/refresh',
      logout: '/auth/logout'
    },

    // User
    user: {
      profile: '/user/profile',
      update: '/user/update',
      stats: '/user/stats',
      trust: '/user/trust-score'
    },

    // Content
    content: {
      tracks: '/content/tracks',
      upload: '/content/upload',
      delete: '/content/delete',
      search: '/content/search'
    },

    // Radio
    radio: {
      stations: '/radio/stations',
      nowPlaying: '/radio/now-playing',
      schedule: '/radio/schedule'
    },

    // Monetization
    monetization: {
      wallet: '/monetization/wallet',
      transactions: '/monetization/transactions',
      withdraw: '/monetization/withdraw',
      earnings: '/monetization/earnings'
    },

    // Ads
    ads: {
      campaigns: '/ads/campaigns',
      create: '/ads/campaigns/create',
      update: '/ads/campaigns/update',
      metrics: '/ads/campaigns/metrics',
      budget: '/ads/campaigns/budget'
    },

    // Fans
    fans: {
      list: '/fans/list',
      profile: '/fans/profile',
      message: '/fans/message',
      segment: '/fans/segment'
    },

    // Analytics
    analytics: {
      overview: '/analytics/overview',
      streams: '/analytics/streams',
      revenue: '/analytics/revenue',
      export: '/analytics/export'
    },

    // Notifications
    notifications: {
      list: '/notifications/list',
      markRead: '/notifications/mark-read',
      settings: '/notifications/settings'
    }
  },

  // WebSocket endpoints
  ws: {
    radio: 'wss://ws.cosy.africa/radio',
    notifications: 'wss://ws.cosy.africa/notifications',
    analytics: 'wss://ws.cosy.africa/analytics'
  }
};

if (typeof module !== 'undefined') module.exports = COSY_API;
