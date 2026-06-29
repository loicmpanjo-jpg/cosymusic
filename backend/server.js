// ============================================
// COSY V0 - Pure Node.js Server (Zero Dependencies)
// No npm install needed | No native modules
// 10 Services | 50+ Endpoints | JSON File DB
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// ============================================
// CONFIG
// ============================================
const CONFIG = {
  PORT: parseInt(process.env.PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DB_PATH: process.env.DB_PATH || './cosy_v0.json',
  JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH || './keys/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || './keys/jwt-public.pem',
  JWT_EXPIRES_IN: 3600,
  REFRESH_TOKEN_EXPIRES_IN: 604800,
  OTP_EXPIRES_IN: 300,
};

// ============================================
// JSON DATABASE
// ============================================
class JsonDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {};
    this.load();
  }
  load() {
    if (fs.existsSync(this.dbPath)) {
      try { this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8')); }
      catch (e) { this.data = {}; }
    }
  }
  save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }
  ensure(name) {
    if (!this.data[name]) this.data[name] = [];
  }
  insert(table, record) {
    this.ensure(table);
    const rec = { ...record, id: record.id || this.uuid() };
    this.data[table].push(rec);
    this.save();
    return rec;
  }
  find(table, query = {}) {
    this.ensure(table);
    return this.data[table].filter(r => {
      for (const [k, v] of Object.entries(query)) {
        if (r[k] !== v) return false;
      }
      return true;
    });
  }
  findOne(table, query = {}) {
    this.ensure(table);
    return this.data[table].find(r => {
      for (const [k, v] of Object.entries(query)) {
        if (r[k] !== v) return false;
      }
      return true;
    }) || null;
  }
  update(table, query, updates) {
    this.ensure(table);
    let count = 0;
    this.data[table] = this.data[table].map(r => {
      let match = true;
      for (const [k, v] of Object.entries(query)) {
        if (r[k] !== v) { match = false; break; }
      }
      if (match) { count++; return { ...r, ...updates, updated_at: new Date().toISOString() }; }
      return r;
    });
    this.save();
    return count;
  }
  all(table) {
    this.ensure(table);
    return this.data[table];
  }
  uuid() {
    return crypto.randomUUID();
  }
}

const db = new JsonDB(CONFIG.DB_PATH);

// ============================================
// JWT (Pure Node.js crypto)
// ============================================
let jwtPrivateKey, jwtPublicKey;
try {
  jwtPrivateKey = fs.readFileSync(CONFIG.JWT_PRIVATE_KEY_PATH, 'utf8');
  jwtPublicKey = fs.readFileSync(CONFIG.JWT_PUBLIC_KEY_PATH, 'utf8');
} catch (err) {
  console.error('❌ JWT keys not found. Run: bash scripts/generate-keys.sh');
  process.exit(1);
}

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str += new Array(5 - str.length % 4).join('=');
  return Buffer.from(str.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64').toString('utf8');
}

function signJWT(payload, privateKey, expiresIn) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${body}`);
  const signature = base64UrlEncode(sign.sign(privateKey, 'base64'));
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token, publicKey) {
  const [header, body, signature] = token.split('.');
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(`${header}.${body}`);
  const sig = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64');
  if (!verify.verify(publicKey, sig)) throw new Error('Invalid signature');
  const payload = JSON.parse(base64UrlDecode(body));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

function generateTokens(userId, role) {
  return {
    accessToken: signJWT({ userId, role, type: 'access' }, jwtPrivateKey, CONFIG.JWT_EXPIRES_IN),
    refreshToken: signJWT({ userId, type: 'refresh' }, jwtPrivateKey, CONFIG.REFRESH_TOKEN_EXPIRES_IN)
  };
}

// ============================================
// OTP & AUTH STORE
// ============================================
const otpStore = new Map();
const refreshStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function authenticate(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) throw new Error('No token');
  return verifyJWT(token, jwtPublicKey);
}

function requireRole(user, roles) {
  if (!user || !roles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
}

// ============================================
// ROUTER
// ============================================
const routes = [];

function route(method, path, handler, options = {}) {
  routes.push({ method: method.toUpperCase(), path, handler, options });
}

function matchRoute(method, urlPath) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.path, urlPath);
    if (params !== null) return { ...r, params };
  }
  return null;
}

function matchPath(pattern, actual) {
  const pParts = pattern.split('/');
  const aParts = actual.split('/');
  if (pParts.length !== aParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(aParts[i]);
    } else if (pParts[i] !== aParts[i]) {
      return null;
    }
  }
  return params;
}

// ============================================
// RESPONSE HELPERS
// ============================================
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { resolve({}); }
    });
  });
}

// ============================================
// ROUTES DEFINITIONS
// ============================================

// Health & Root
route('GET', '/health', async (req, res) => {
  json(res, 200, { status: 'ok', timestamp: new Date().toISOString(), version: '0.1.0-vanilla', mode: 'pure-nodejs' });
});

route('GET', '/', async (req, res) => {
  json(res, 200, { name: 'COSY V0 API (Vanilla Node.js)', version: '0.1.0-vanilla', status: 'running', documentation: '/documentation' });
});

// Auth
route('POST', '/api/v0/auth/otp/request', async (req, res) => {
  const { phone } = await parseBody(req);
  const otp = generateOTP();
  otpStore.set(`otp:${phone}`, { otp, expires: Date.now() + CONFIG.OTP_EXPIRES_IN * 1000 });
  console.log(`📱 OTP for ${phone}: ${otp}`);
  json(res, 200, { message: 'OTP sent', expiresIn: CONFIG.OTP_EXPIRES_IN });
});

route('POST', '/api/v0/auth/otp/verify', async (req, res) => {
  const { phone, otp } = await parseBody(req);
  const stored = otpStore.get(`otp:${phone}`);
  if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
    return json(res, 400, { error: 'Invalid OTP' });
  }
  otpStore.delete(`otp:${phone}`);

  let user = db.findOne('users', { phone });
  if (!user) {
    const userId = db.uuid();
    user = db.insert('users', { id: userId, phone, role: 'listener', status: 'active', created_at: new Date().toISOString() });
    db.insert('wallets', { id: db.uuid(), user_id: userId, balance: 0, currency: 'XAF', total_earned: 0, total_withdrawn: 0 });
  }

  const tokens = generateTokens(user.id, user.role);
  refreshStore.set(`refresh:${user.id}`, { token: tokens.refreshToken, expires: Date.now() + CONFIG.REFRESH_TOKEN_EXPIRES_IN * 1000 });
  json(res, 200, { userId: user.id, role: user.role, ...tokens });
});

route('POST', '/api/v0/auth/refresh', async (req, res) => {
  const { refreshToken } = await parseBody(req);
  try {
    const decoded = verifyJWT(refreshToken, jwtPublicKey);
    const stored = refreshStore.get(`refresh:${decoded.userId}`);
    if (!stored || stored.token !== refreshToken || Date.now() > stored.expires) throw new Error('Invalid');
    const user = db.findOne('users', { id: decoded.userId });
    if (!user) throw new Error('User not found');
    const tokens = generateTokens(user.id, user.role);
    refreshStore.set(`refresh:${user.id}`, { token: tokens.refreshToken, expires: Date.now() + CONFIG.REFRESH_TOKEN_EXPIRES_IN * 1000 });
    json(res, 200, tokens);
  } catch (err) {
    json(res, 401, { error: 'Invalid refresh token' });
  }
});

route('POST', '/api/v0/auth/logout', async (req, res) => {
  try {
    const user = authenticate(req);
    refreshStore.delete(`refresh:${user.userId}`);
    json(res, 200, { message: 'Logged out' });
  } catch (err) {
    json(res, 401, { error: err.message });
  }
});

// Users
route('GET', '/api/v0/users/me', async (req, res) => {
  try {
    const user = authenticate(req);
    const data = db.findOne('users', { id: user.userId });
    if (!data) return json(res, 404, { error: 'User not found' });
    json(res, 200, data);
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('PATCH', '/api/v0/users/me', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    db.update('users', { id: user.userId }, body);
    json(res, 200, db.findOne('users', { id: user.userId }));
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/users/me/playlists', async (req, res) => {
  try {
    const user = authenticate(req);
    const playlists = db.find('playlists', { user_id: user.userId });
    json(res, 200, playlists.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('POST', '/api/v0/users/me/playlists', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    json(res, 200, db.insert('playlists', { id: db.uuid(), user_id: user.userId, ...body, is_public: body.is_public || false, created_at: new Date().toISOString() }));
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/users/me/favorites', async (req, res) => {
  try {
    const user = authenticate(req);
    const favs = db.find('user_favorites', { user_id: user.userId });
    json(res, 200, favs.map(f => db.findOne('tracks', { id: f.track_id })).filter(Boolean));
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('POST', '/api/v0/users/me/favorites/:trackId', async (req, res) => {
  try {
    const user = authenticate(req);
    db.insert('user_favorites', { id: db.uuid(), user_id: user.userId, track_id: req.params.trackId, created_at: new Date().toISOString() });
    json(res, 200, { message: 'Added to favorites' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

// Creators
route('POST', '/api/v0/creators/onboard', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    db.update('users', { id: user.userId }, { role: 'creator', display_name: body.artist_name, bio: body.bio, city: body.city });
    const creatorId = db.uuid();
    db.insert('creators', { id: creatorId, user_id: user.userId, ...body, status: 'pending', created_at: new Date().toISOString() });
    json(res, 200, { creatorId, message: 'Creator profile submitted for review' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('POST', '/api/v0/creators/kyc', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    const creator = db.findOne('creators', { user_id: user.userId });
    if (!creator) return json(res, 404, { error: 'Creator not found' });
    db.insert('creator_kyc', { id: db.uuid(), creator_id: creator.id, ...body, status: 'pending', submitted_at: new Date().toISOString() });
    json(res, 200, { message: 'KYC submitted for review' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/creators/stats', async (req, res) => {
  try {
    const user = authenticate(req);
    const creator = db.findOne('creators', { user_id: user.userId });
    if (!creator) return json(res, 200, { total_tracks: 0, total_streams: 0, total_revenue: 0 });
    const tracks = db.find('tracks', { creator_id: creator.id });
    json(res, 200, {
      total_tracks: tracks.length,
      total_streams: tracks.reduce((a, t) => a + (t.stream_count || 0), 0),
      total_revenue: tracks.reduce((a, t) => a + (t.revenue || 0), 0)
    });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/creators/tracks', async (req, res) => {
  try {
    const user = authenticate(req);
    const creator = db.findOne('creators', { user_id: user.userId });
    if (!creator) return json(res, 200, []);
    json(res, 200, db.find('tracks', { creator_id: creator.id }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) { json(res, 401, { error: err.message }); }
});

// Media
route('POST', '/api/v0/media/tracks', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    const creator = db.findOne('creators', { user_id: user.userId });
    if (!creator) return json(res, 403, { error: 'You must be a creator to upload tracks' });
    const trackId = db.uuid();
    db.insert('tracks', { id: trackId, creator_id: creator.id, ...body, stream_count: 0, revenue: 0, status: 'pending', created_at: new Date().toISOString() });
    json(res, 200, { trackId, message: 'Track uploaded for review' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/media/tracks/:id', async (req, res) => {
  const track = db.findOne('tracks', { id: req.params.id, status: 'approved' });
  if (!track) return json(res, 404, { error: 'Track not found' });
  db.insert('stream_logs', { id: db.uuid(), track_id: req.params.id, user_id: null, city: 'Douala', country: 'CM', streamed_at: new Date().toISOString() });
  track.stream_count = (track.stream_count || 0) + 1;
  db.update('tracks', { id: req.params.id }, { stream_count: track.stream_count });
  json(res, 200, track);
});

route('GET', '/api/v0/media/tracks', async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = url.searchParams.get('q');
  const genre = url.searchParams.get('genre');
  const limit = parseInt(url.searchParams.get('limit')) || 20;
  const offset = parseInt(url.searchParams.get('offset')) || 0;
  let tracks = db.find('tracks', { status: 'approved' });
  if (q) tracks = tracks.filter(t => (t.title || '').toLowerCase().includes(q.toLowerCase()) || (t.description || '').toLowerCase().includes(q.toLowerCase()));
  if (genre) tracks = tracks.filter(t => t.genre === genre);
  tracks.sort((a, b) => (b.stream_count || 0) - (a.stream_count || 0));
  json(res, 200, tracks.slice(offset, offset + limit));
});

route('GET', '/api/v0/media/genres', async (req, res) => {
  const tracks = db.find('tracks', { status: 'approved' });
  json(res, 200, [...new Set(tracks.map(t => t.genre).filter(Boolean))]);
});

// Streaming
route('GET', '/api/v0/streaming/trending/:city', async (req, res) => {
  const logs = db.find('stream_logs', { city: req.params.city }).filter(l => new Date(l.streamed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const counts = {};
  logs.forEach(l => { counts[l.track_id] = (counts[l.track_id] || 0) + 1; });
  const tracks = Object.entries(counts)
    .map(([id, count]) => ({ ...db.findOne('tracks', { id, status: 'approved' }), stream_count: count }))
    .filter(t => t.id)
    .sort((a, b) => b.stream_count - a.stream_count)
    .slice(0, 50);
  json(res, 200, tracks);
});

route('GET', '/api/v0/streaming/artists/:city', async (req, res) => {
  const logs = db.find('stream_logs', { city: req.params.city });
  const counts = {};
  logs.forEach(l => {
    const track = db.findOne('tracks', { id: l.track_id });
    if (track) counts[track.creator_id] = (counts[track.creator_id] || 0) + 1;
  });
  const artists = Object.entries(counts)
    .map(([id, count]) => {
      const creator = db.findOne('creators', { id });
      return creator ? { ...db.findOne('users', { id: creator.user_id }), total_streams: count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.total_streams - a.total_streams)
    .slice(0, 20);
  json(res, 200, artists);
});

route('GET', '/api/v0/streaming/history', async (req, res) => {
  try {
    const user = authenticate(req);
    const logs = db.find('stream_logs', { user_id: user.userId }).sort((a, b) => new Date(b.streamed_at) - new Date(a.streamed_at)).slice(0, 100);
    json(res, 200, logs);
  } catch (err) { json(res, 401, { error: err.message }); }
});

// Wallet
route('GET', '/api/v0/wallet/balance', async (req, res) => {
  try {
    const user = authenticate(req);
    const wallet = db.findOne('wallets', { user_id: user.userId });
    json(res, 200, wallet || { balance: 0, currency: 'XAF', total_earned: 0, total_withdrawn: 0 });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('POST', '/api/v0/wallet/withdraw', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    if (body.amount < 5000) return json(res, 400, { error: 'Minimum withdrawal is 5000 XAF' });
    const wallet = db.findOne('wallets', { user_id: user.userId });
    if (!wallet || (wallet.balance || 0) < body.amount) return json(res, 400, { error: 'Insufficient balance' });
    const withdrawalId = db.uuid();
    db.insert('withdrawals', { id: withdrawalId, user_id: user.userId, ...body, account_details: JSON.stringify(body.account_details || {}), status: 'pending', created_at: new Date().toISOString() });
    db.update('wallets', { user_id: user.userId }, { balance: (wallet.balance || 0) - body.amount, total_withdrawn: (wallet.total_withdrawn || 0) + body.amount });
    json(res, 200, { withdrawalId, message: 'Withdrawal request submitted', status: 'pending' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/wallet/transactions', async (req, res) => {
  try {
    const user = authenticate(req);
    json(res, 200, db.find('transactions', { user_id: user.userId }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100));
  } catch (err) { json(res, 401, { error: err.message }); }
});

// Ads
route('POST', '/api/v0/ads/campaigns', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['advertiser', 'admin']);
    const body = await parseBody(req);
    if (body.budget < 5000) return json(res, 400, { error: 'Minimum budget is 5000 XAF' });
    const campaignId = db.uuid();
    db.insert('ad_campaigns', { id: campaignId, advertiser_id: user.userId, ...body, spent: 0, target_audience: JSON.stringify(body.target_audience || {}), status: 'pending', created_at: new Date().toISOString() });
    json(res, 200, { campaignId, message: 'Campaign created', status: 'pending' });
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('GET', '/api/v0/ads/campaigns', async (req, res) => {
  try {
    const user = authenticate(req);
    json(res, 200, db.find('ad_campaigns', { advertiser_id: user.userId }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('GET', '/api/v0/ads/display', async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const city = url.searchParams.get('city');
  const campaigns = db.find('ad_campaigns', { status: 'active' });
  const now = new Date().toISOString();
  const active = campaigns.filter(c => c.start_date <= now && c.end_date >= now && (c.spent || 0) < c.budget);
  if (active.length === 0) return json(res, 200, { ad: null });
  const ad = active[Math.floor(Math.random() * active.length)];
  db.insert('ad_impressions', { id: db.uuid(), campaign_id: ad.id, user_id: null, city: city || 'unknown', impression_at: now });
  json(res, 200, { ad });
});

route('POST', '/api/v0/ads/click/:campaignId', async (req, res) => {
  db.insert('ad_clicks', { id: db.uuid(), campaign_id: req.params.campaignId, user_id: null, city: 'unknown', clicked_at: new Date().toISOString() });
  const campaign = db.findOne('ad_campaigns', { id: req.params.campaignId });
  if (campaign) db.update('ad_campaigns', { id: req.params.campaignId }, { spent: (campaign.spent || 0) + 100 });
  json(res, 200, { message: 'Click tracked' });
});

// Pulse
route('GET', '/api/v0/pulse/cities', async (req, res) => {
  const logs = db.all('stream_logs').filter(l => new Date(l.streamed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000));
  const cityStats = {};
  logs.forEach(l => { cityStats[l.city] = (cityStats[l.city] || 0) + 1; });
  json(res, 200, Object.entries(cityStats).map(([city, count]) => ({ city, country: 'CM', active_listeners: count })));
});

route('GET', '/api/v0/pulse/:city', async (req, res) => {
  const logs = db.find('stream_logs', { city: req.params.city }).filter(l => new Date(l.streamed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000));
  const trackCounts = {};
  logs.forEach(l => { trackCounts[l.track_id] = (trackCounts[l.track_id] || 0) + 1; });
  const trending = Object.entries(trackCounts)
    .map(([id, count]) => db.findOne('tracks', { id, status: 'approved' }))
    .filter(Boolean)
    .sort((a, b) => (trackCounts[b.id] || 0) - (trackCounts[a.id] || 0))
    .slice(0, 10)
    .map(t => ({ ...t, streams_24h: trackCounts[t.id] || 0 }));

  const artistCounts = {};
  trending.forEach(t => { artistCounts[t.creator_id] = (artistCounts[t.creator_id] || 0) + (trackCounts[t.id] || 0); });
  const topArtists = Object.entries(artistCounts)
    .map(([id, count]) => {
      const creator = db.findOne('creators', { id });
      return creator ? { ...db.findOne('users', { id: creator.user_id }), streams_24h: count } : null;
    })
    .filter(Boolean)
    .slice(0, 10);

  json(res, 200, {
    city: req.params.city,
    trending,
    topArtists,
    stats: { unique_listeners: new Set(logs.map(l => l.user_id)).size, total_streams_24h: logs.length, genres_active: [...new Set(trending.map(t => t.genre).filter(Boolean))].length }
  });
});

route('GET', '/api/v0/pulse/:city/genres', async (req, res) => {
  const logs = db.find('stream_logs', { city: req.params.city }).filter(l => new Date(l.streamed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const genreCounts = {};
  logs.forEach(l => {
    const track = db.findOne('tracks', { id: l.track_id });
    if (track && track.genre) genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
  });
  json(res, 200, Object.entries(genreCounts).map(([genre, streams]) => ({ genre, streams })).sort((a, b) => b.streams - a.streams));
});

// AI
route('POST', '/api/v0/ai/score', async (req, res) => {
  try {
    const user = authenticate(req);
    const body = await parseBody(req);
    const track = db.findOne('tracks', { id: body.track_id });
    if (!track) return json(res, 404, { error: 'Track not found' });
    let score = 0;
    if (track.title && track.title.length > 3) score += 20;
    if (track.description && track.description.length > 20) score += 15;
    if (track.cover_url) score += 15;
    if (track.genre) score += 10;
    if (track.tags) score += 10;
    if (track.duration && track.duration > 60) score += 10;
    if (track.audio_url) score += 20;
    db.insert('content_scores', { id: db.uuid(), track_id: body.track_id, content_type: body.content_type || 'track', score, ai_model: 'heuristic-v1', scored_at: new Date().toISOString() });
    json(res, 200, { trackId: body.track_id, score, maxScore: 100, model: 'heuristic-v1' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('POST', '/api/v0/ai/moderate', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin', 'moderator']);
    const body = await parseBody(req);
    const flaggedWords = ['spam', 'scam', 'explicit', 'violence'];
    const hasFlagged = flaggedWords.some(word => (body.content_text || '').toLowerCase().includes(word));
    const status = hasFlagged ? 'flagged' : 'approved';
    db.insert('moderation_logs', { id: db.uuid(), content_type: body.content_type, content_id: body.content_id, status, confidence: hasFlagged ? 0.85 : 0.95, ai_model: 'heuristic-moderation-v1', reviewed_at: new Date().toISOString() });
    json(res, 200, { contentId: body.content_id, status, confidence: hasFlagged ? 0.85 : 0.95, flagged: hasFlagged });
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('GET', '/api/v0/ai/recommend', async (req, res) => {
  try {
    const user = authenticate(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const userTracks = db.find('stream_logs', { user_id: user.userId }).map(l => l.track_id);
    json(res, 200, db.find('tracks', { status: 'approved' }).filter(t => !userTracks.includes(t.id)).sort((a, b) => (b.stream_count || 0) - (a.stream_count || 0)).slice(0, limit));
  } catch (err) { json(res, 401, { error: err.message }); }
});

// Notifications
route('GET', '/api/v0/notifications', async (req, res) => {
  try {
    const user = authenticate(req);
    json(res, 200, db.find('notifications', { user_id: user.userId }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50));
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('PATCH', '/api/v0/notifications/:id/read', async (req, res) => {
  try {
    const user = authenticate(req);
    db.update('notifications', { id: req.params.id, user_id: user.userId }, { is_read: 1 });
    json(res, 200, { message: 'Marked as read' });
  } catch (err) { json(res, 401, { error: err.message }); }
});

route('POST', '/api/v0/notifications/send', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin']);
    const body = await parseBody(req);
    const notifId = db.uuid();
    db.insert('notifications', { id: notifId, ...body, data: JSON.stringify(body.data || {}), is_read: 0, created_at: new Date().toISOString() });
    json(res, 200, { notifId, message: 'Notification sent' });
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('GET', '/api/v0/notifications/unread-count', async (req, res) => {
  try {
    const user = authenticate(req);
    json(res, 200, { count: db.find('notifications', { user_id: user.userId, is_read: 0 }).length });
  } catch (err) { json(res, 401, { error: err.message }); }
});

// Admin
route('GET', '/api/v0/admin/stats', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin']);
    json(res, 200, {
      users: db.all('users').length,
      creators: db.find('creators', { status: 'approved' }).length,
      tracks: db.find('tracks', { status: 'approved' }).length,
      streams24h: db.all('stream_logs').filter(l => new Date(l.streamed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
      revenue30d: db.find('transactions', { type: 'revenue' }).filter(t => new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).reduce((a, t) => a + (t.amount || 0), 0)
    });
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('GET', '/api/v0/admin/kyc/pending', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin']);
    json(res, 200, db.find('creator_kyc', { status: 'pending' }).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('PATCH', '/api/v0/admin/kyc/:id', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin']);
    const body = await parseBody(req);
    db.update('creator_kyc', { id: req.params.id }, { status: body.status, review_notes: body.notes, reviewed_at: new Date().toISOString() });
    if (body.status === 'approved') {
      const kyc = db.findOne('creator_kyc', { id: req.params.id });
      if (kyc) db.update('creators', { id: kyc.creator_id }, { status: 'approved', verified_at: new Date().toISOString() });
    }
    json(res, 200, { message: `KYC ${body.status}` });
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('GET', '/api/v0/admin/tracks/pending', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin']);
    json(res, 200, db.find('tracks', { status: 'pending' }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) { json(res, 403, { error: err.message }); }
});

route('PATCH', '/api/v0/admin/tracks/:id', async (req, res) => {
  try {
    const user = authenticate(req);
    requireRole(user, ['admin']);
    const body = await parseBody(req);
    db.update('tracks', { id: req.params.id }, { status: body.status, rejection_reason: body.rejection_reason, updated_at: new Date().toISOString() });
    json(res, 200, { message: `Track ${body.status}` });
  } catch (err) { json(res, 403, { error: err.message }); }
});

// ============================================
// SEED DATA
// ============================================
function seedData() {
  if (db.all('users').length > 0) { console.log('✅ Database already seeded'); return; }
  console.log('🌱 Seeding database...');

  db.insert('users', { id: '00000000-0000-0000-0000-000000000001', phone: '+237600000001', display_name: 'COSY Admin', role: 'admin', status: 'active', created_at: new Date().toISOString() });
  db.insert('wallets', { id: db.uuid(), user_id: '00000000-0000-0000-0000-000000000001', balance: 0, currency: 'XAF', total_earned: 0, total_withdrawn: 0 });

  const creators = [
    { phone: '+237600000002', name: 'DJ Kmer', genre: 'Afrobeat', city: 'Douala' },
    { phone: '+237600000003', name: 'Makossa King', genre: 'Makossa', city: 'Douala' },
    { phone: '+237600000004', name: 'Bikutsi Queen', genre: 'Bikutsi', city: 'Yaoundé' },
    { phone: '+237600000005', name: 'Rap Master', genre: 'Hip-Hop', city: 'Bafoussam' },
    { phone: '+237600000006', name: 'Gospel Voice', genre: 'Gospel', city: 'Bamenda' }
  ];

  for (const c of creators) {
    const userId = db.uuid();
    db.insert('users', { id: userId, phone: c.phone, display_name: c.name, role: 'creator', city: c.city, status: 'active', created_at: new Date().toISOString() });
    const creatorId = db.uuid();
    db.insert('creators', { id: creatorId, user_id: userId, artist_name: c.name, genre: c.genre, city: c.city, status: 'approved', verified_at: new Date().toISOString(), created_at: new Date().toISOString() });
    db.insert('wallets', { id: db.uuid(), user_id: userId, balance: 0, currency: 'XAF', total_earned: 0, total_withdrawn: 0 });
    for (let i = 1; i <= 3; i++) {
      const trackId = db.uuid();
      db.insert('tracks', { id: trackId, creator_id: creatorId, title: `${c.name} - Track ${i}`, description: `Amazing ${c.genre} track`, genre: c.genre, tags: JSON.stringify([c.genre.toLowerCase(), 'cameroon']), audio_url: `https://cdn.cosy.fm/tracks/${trackId}.mp3`, cover_url: `https://cdn.cosy.fm/covers/${trackId}.jpg`, duration: 180 + Math.floor(Math.random() * 120), stream_count: Math.floor(Math.random() * 10000), status: 'approved', created_at: new Date().toISOString() });
    }
  }

  const cities = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Limbe'];
  const tracks = db.all('tracks');
  for (let i = 0; i < 500; i++) {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    db.insert('stream_logs', { id: db.uuid(), track_id: track.id, city, country: 'CM', streamed_at: new Date(Date.now() - Math.floor(Math.random() * 48) * 60 * 60 * 1000).toISOString() });
  }

  db.insert('pulse_metrics', { id: '1', city: 'Douala', metric_type: 'listeners', metric_value: JSON.stringify({ count: 15420, growth: 12.5 }), recorded_at: new Date().toISOString() });
  db.insert('pulse_metrics', { id: '2', city: 'Yaoundé', metric_type: 'listeners', metric_value: JSON.stringify({ count: 12300, growth: 8.3 }), recorded_at: new Date().toISOString() });
  db.insert('pulse_metrics', { id: '3', city: 'Bafoussam', metric_type: 'listeners', metric_value: JSON.stringify({ count: 4500, growth: 15.2 }), recorded_at: new Date().toISOString() });
  db.insert('pulse_metrics', { id: '4', city: 'Bamenda', metric_type: 'listeners', metric_value: JSON.stringify({ count: 3200, growth: 5.1 }), recorded_at: new Date().toISOString() });
  db.insert('pulse_metrics', { id: '5', city: 'Limbe', metric_type: 'listeners', metric_value: JSON.stringify({ count: 2100, growth: 7.8 }), recorded_at: new Date().toISOString() });

  db.insert('notifications', { id: 'sys-1', user_id: '00000000-0000-0000-0000-000000000001', title: 'COSY V0 Deployed', message: 'Welcome to COSY V0! Vanilla Node.js edition is now live.', type: 'system', is_read: 0, created_at: new Date().toISOString() });

  console.log('✅ Seed completed!');
}

// ============================================
// SERVER
// ============================================
seedData();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const matched = matchRoute(req.method, url.pathname);

  if (!matched) {
    json(res, 404, { error: 'Not found', path: url.pathname });
    return;
  }

  try {
    await matched.handler(req, res, matched.params);
  } catch (err) {
    console.error('Route error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log(`🚀 COSY V0 API (Vanilla Node.js) running on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`💓 Health: http://${CONFIG.HOST}:${CONFIG.PORT}/health`);
  console.log(`💾 Database: ${CONFIG.DB_PATH}`);
  console.log(`🔑 JWT Keys: ${CONFIG.JWT_PRIVATE_KEY_PATH}`);
});

process.on('SIGTERM', () => { console.log('🛑 Shutting down...'); server.close(); process.exit(0); });
process.on('SIGINT', () => { console.log('🛑 Shutting down...'); server.close(); process.exit(0); });
