import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { getStore, saveStore } from './src/store.js';
import { DEFAULT_CUSTOMER_ID, DEFAULT_PARTNER_ID } from './src/seedData.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const OTP_EXPIRY_MS = Number(process.env.OTP_EXPIRY_MS || 5 * 60 * 1000);
const OTP_COOLDOWN_MS = Number(process.env.OTP_COOLDOWN_MS || 45 * 1000);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ENABLE_DEMO_OTP = process.env.ENABLE_DEMO_OTP === 'true' || !IS_PRODUCTION;
const ALLOW_INSECURE_GOOGLE_MOCK = process.env.ALLOW_INSECURE_GOOGLE_MOCK === 'true' || !IS_PRODUCTION;
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || '').trim();

const trackingSteps = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'on-the-way', label: 'On the way' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

const jobToBookingStatus = {
  pending: 'assigned',
  accepted: 'assigned',
  'on-the-way': 'on-the-way',
  'in-progress': 'in-progress',
  completed: 'completed',
};

const bookingToTrackingIndex = {
  pending: 0,
  assigned: 0,
  'on-the-way': 1,
  'in-progress': 2,
  completed: 3,
  cancelled: 0,
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const jsDayToWeekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

app.use(cors());
app.use(express.json());

const publicApiRoutes = new Set([
  'GET /api/health',
  'GET /api/defaults',
  'POST /api/auth/send-otp',
  'POST /api/auth/verify-otp',
  'POST /api/auth/google',
  'GET /api/prompts',
  'POST /api/chat/query',
  'GET /api/partners',
]);

function isValidRole(role) {
  return role === 'customer' || role === 'partner';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function randomOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function shouldBypassAuth(req) {
  const routeKey = `${req.method.toUpperCase()} ${req.path}`;
  if (publicApiRoutes.has(routeKey)) {
    return true;
  }
  if (req.method.toUpperCase() === 'GET' && /^\/api\/partners\/[^/]+$/.test(req.path)) {
    return true;
  }
  if (req.method.toUpperCase() === 'GET' && /^\/api\/partners\/[^/]+\/reviews$/.test(req.path)) {
    return true;
  }
  return false;
}

function cleanupAuthRequests(store) {
  let dirty = false;
  if (!store.authRequests || typeof store.authRequests !== 'object') {
    store.authRequests = {};
    dirty = true;
  }

  const now = Date.now();

  for (const [otpToken, request] of Object.entries(store.authRequests || {})) {
    const createdAt = Number(request.createdAt || now);
    const expiresAt = Number(request.expiresAt || (createdAt + OTP_EXPIRY_MS));
    const requestAgeMs = now - createdAt;

    if (expiresAt <= now || requestAgeMs > 24 * 60 * 60 * 1000) {
      delete store.authRequests[otpToken];
      dirty = true;
    }
  }

  return dirty;
}

function cleanupSessions(store) {
  if (!Array.isArray(store.sessions)) {
    store.sessions = [];
    return true;
  }

  const now = Date.now();
  const sessions = store.sessions;
  const next = sessions.filter((session) => now - Number(session.createdAt || 0) < SESSION_TTL_MS);
  if (next.length !== sessions.length) {
    store.sessions = next;
    return true;
  }
  return false;
}

async function cleanupStoreIfNeeded(store) {
  let normalized = false;
  if (!Array.isArray(store.users)) {
    store.users = [];
    normalized = true;
  }
  if (!Array.isArray(store.bookings)) {
    store.bookings = [];
    normalized = true;
  }
  if (!Array.isArray(store.jobs)) {
    store.jobs = [];
    normalized = true;
  }
  if (!Array.isArray(store.transactions)) {
    store.transactions = [];
    normalized = true;
  }
  if (!Array.isArray(store.reviews)) {
    store.reviews = [];
    normalized = true;
  }
  if (!Array.isArray(store.servicePartners)) {
    store.servicePartners = [];
    normalized = true;
  }
  if (!Array.isArray(store.marketplaceJobs)) {
    store.marketplaceJobs = [];
    normalized = true;
  }
  if (!Array.isArray(store.marketplaceApplications)) {
    store.marketplaceApplications = [];
    normalized = true;
  }
  if (!Array.isArray(store.marketplaceMessages)) {
    store.marketplaceMessages = [];
    normalized = true;
  }
  if (!Array.isArray(store.marketplaceNotifications)) {
    store.marketplaceNotifications = [];
    normalized = true;
  }
  if (!Array.isArray(store.clickLogs)) {
    store.clickLogs = [];
    normalized = true;
  }
  if (!store.partnerAvailabilityByPartnerId || typeof store.partnerAvailabilityByPartnerId !== 'object') {
    store.partnerAvailabilityByPartnerId = {};
    normalized = true;
  }

  const dirty = normalized || cleanupAuthRequests(store) || cleanupSessions(store);
  if (dirty) {
    await saveStore();
  }
}

function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) {
    return '';
  }
  return authHeader.slice('Bearer '.length).trim();
}

function createSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getUserPartnerId(user) {
  return String(user?.partnerId || DEFAULT_PARTNER_ID);
}

function getMarketplaceRole(user) {
  if (user?.marketplaceRole === 'worker' || user?.role === 'partner') {
    return 'worker';
  }
  return 'client';
}

function buildMarketplaceProfile(user, store) {
  const completedAsWorker = store.marketplaceJobs.filter(
    (job) => job.status === 'completed' && job.selectedApplicantId === user.id,
  ).length;
  const completedAsClient = store.marketplaceJobs.filter(
    (job) => job.status === 'completed' && job.owner_id === user.id,
  ).length;
  const postedJobs = store.marketplaceJobs.filter((job) => job.owner_id === user.id).length;
  const applicationsSubmitted = store.marketplaceApplications.filter(
    (application) => application.applicant_id === user.id,
  ).length;

  const acceptedApplications = store.marketplaceApplications.filter(
    (application) => application.applicant_id === user.id && application.status === 'accepted',
  ).length;

  const acceptanceRate = applicationsSubmitted > 0
    ? (acceptedApplications / applicationsSubmitted) * 100
    : 50;

  const ratings = Number(user.ratings || 4.5);
  const completedJobs = completedAsWorker + completedAsClient;
  const rankRaw = Math.round((ratings / 5) * 50 + Math.min(completedJobs, 25) * 1.8 + acceptanceRate * 0.2);
  const rank = Math.max(0, Math.min(100, rankRaw));
  const rankLabel = rank >= 90
    ? 'Diamond'
    : rank >= 75
      ? 'Gold'
      : rank >= 60
        ? 'Silver'
        : rank >= 40
          ? 'Bronze'
          : 'Starter';

  return {
    user_id: user.id,
    name: user.name,
    role: getMarketplaceRole(user),
    rank,
    rankLabel,
    ratings,
    walletBalance: Number(user.walletBalance || 0),
    completedJobs,
    postedJobs,
    applicationsSubmitted,
    location: String(user.location || 'Remote'),
    skills: Array.isArray(user.skills) ? user.skills : [],
  };
}

function scoreJobForUser(job, profile) {
  const text = `${job.title} ${job.description} ${job.requiredSkills.join(' ')}`.toLowerCase();
  const skillMatches = (profile.skills || []).filter((skill) => text.includes(skill.toLowerCase())).length;
  const locationScore = profile.location && job.location
    ? (job.location.toLowerCase().includes(profile.location.toLowerCase()) ? 20 : 8)
    : 10;
  const modeScore = job.mode === 'online' ? 12 : 8;
  const budgetScore = job.budget >= 5000 ? 12 : 8;
  const openScore = job.status === 'open' ? 20 : 0;
  return openScore + locationScore + modeScore + budgetScore + skillMatches * 10;
}

function getPublicUserSummary(user) {
  return {
    user_id: user.id,
    name: user.name,
    role: getMarketplaceRole(user),
    ratings: Number(user.ratings || 4.5),
    rank: Math.max(1, Math.round(Number(user.rank || 50))),
  };
}

function enforcePartnerAccess(req, res) {
  const authUser = req.authUser;
  if (authUser?.role !== 'partner') {
    res.status(403).json({ error: 'Partner access required.' });
    return null;
  }

  const authPartnerId = getUserPartnerId(authUser);
  if (req.params.partnerId && req.params.partnerId !== authPartnerId) {
    res.status(403).json({ error: 'You are not allowed to access this partner profile.' });
    return null;
  }

  return authPartnerId;
}

async function verifyGoogleIdentity(idToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('Google token verification failed.');
  }

  const payload = await response.json();
  if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch.');
  }
  if (String(payload.email_verified || '') !== 'true') {
    throw new Error('Google account email is not verified.');
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    throw new Error('Google account email missing.');
  }

  return {
    email,
    name: String(payload.name || payload.given_name || 'Google User').trim(),
  };
}

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api') || shouldBypassAuth(req)) {
    next();
    return;
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const store = await getStore();
    await cleanupStoreIfNeeded(store);

    const session = store.sessions.find((candidate) => candidate.token === token);
    if (!session) {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
      return;
    }

    const user = store.users.find((candidate) => candidate.id === session.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found for this session.' });
      return;
    }

    req.authToken = token;
    req.authUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Authentication failed.' });
  }
});

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function startOfDayMs(dateString) {
  return new Date(`${dateString}T00:00:00`).getTime();
}

function getDaysAgo(dateString, referenceDateString) {
  const diff = startOfDayMs(referenceDateString) - startOfDayMs(dateString);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getQueryCategory(query) {
  const normalized = query.toLowerCase();
  if (/(vet|veterinary|pet|dog|cat)/.test(normalized)) return 'Veterinary';
  if (/(electric|wiring|power|switch)/.test(normalized)) return 'Electrician';
  if (/(plumb|leak|pipe|drain)/.test(normalized)) return 'Plumber';
  if (/(clean|house|home|kitchen|bathroom)/.test(normalized)) return 'Home Cleaning';
  if (/(ac|air condition|cooling)/.test(normalized)) return 'AC Repair';
  return '';
}

function filterPartnersByQuery(partners, query) {
  const normalized = query.toLowerCase().trim();
  if (!normalized) {
    return partners.slice(0, 3);
  }

  const category = getQueryCategory(normalized);
  if (category) {
    return partners.filter((partner) => partner.category === category);
  }

  return partners.filter((partner) => {
    const haystack = [
      partner.name,
      partner.category,
      partner.description,
      ...partner.expertise,
      ...partner.services.map((service) => service.name),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

function getQueryResponseText(query, resultCount) {
  const category = getQueryCategory(query);
  if (category === 'Veterinary') return 'I found these veterinary services near you:';
  if (category === 'Electrician') return 'Here are the best electricians in your area:';
  if (category === 'Plumber') return 'I found these plumbing experts for you:';
  if (category === 'Home Cleaning') return 'Here are professional cleaning services near you:';
  if (category === 'AC Repair') return 'I found these AC repair services:';
  if (resultCount === 0) return 'No exact matches found. Here are some popular services:';
  return 'Here are some popular services in your area:';
}

function calculatePartnerStats(partnerId, store) {
  const today = toIsoDate();
  const jobs = store.jobs.filter((job) => job.partnerId === partnerId);
  const reviews = store.reviews.filter((review) => review.partnerId === partnerId);
  const transactions = store.transactions.filter((tx) => tx.partnerId === partnerId);

  const completedJobs = jobs.filter((job) => job.status === 'completed').length;
  const actionableJobs = jobs.filter((job) => job.status !== 'pending').length;
  const todayJobs = jobs.filter((job) => job.date === today && job.status !== 'completed').length;

  const completedTransactions = transactions.filter((tx) => tx.status === 'completed');
  const todayEarnings = completedTransactions
    .filter((tx) => tx.date === today)
    .reduce((total, tx) => total + tx.amount, 0);

  const weeklyEarnings = completedTransactions
    .filter((tx) => getDaysAgo(tx.date, today) >= 0 && getDaysAgo(tx.date, today) < 7)
    .reduce((total, tx) => total + tx.amount, 0);

  const monthlyEarnings = completedTransactions
    .filter((tx) => getDaysAgo(tx.date, today) >= 0 && getDaysAgo(tx.date, today) < 30)
    .reduce((total, tx) => total + tx.amount, 0);

  const totalRating = reviews.length > 0
    ? Number((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1))
    : 0;

  const completionRate = actionableJobs > 0
    ? Math.round((completedJobs / actionableJobs) * 100)
    : 0;

  return {
    todayJobs,
    todayEarnings,
    weeklyEarnings,
    monthlyEarnings,
    totalRating,
    totalReviews: reviews.length,
    completionRate,
  };
}

function buildRatingDistribution(reviews) {
  const total = reviews.length || 1;

  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => review.rating === stars).length;
    return {
      stars,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
}

function buildWeeklyEarningsData(transactions) {
  const today = new Date();
  const completed = transactions.filter((tx) => tx.status === 'completed');

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const iso = toIsoDate(date);
    const amount = completed
      .filter((tx) => tx.date === iso)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      amount,
    };
  });
}

function buildMonthlyEarningsData(transactions) {
  const today = toIsoDate();
  const buckets = [0, 0, 0, 0];

  transactions
    .filter((tx) => tx.status === 'completed')
    .forEach((tx) => {
      const daysAgo = getDaysAgo(tx.date, today);
      if (daysAgo < 0 || daysAgo >= 28) {
        return;
      }

      const bucketIndex = 3 - Math.floor(daysAgo / 7);
      buckets[bucketIndex] += tx.amount;
    });

  return buckets.map((amount, index) => ({
    week: `Week ${index + 1}`,
    amount,
  }));
}

function generateRollingAvailability(weeklyAvailability) {
  const result = [];
  const today = new Date();

  for (let offset = 0; offset < 10; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const weekDayName = jsDayToWeekDay[date.getDay()];
    const dayConfig = weeklyAvailability[weekDayName];
    if (!dayConfig || !dayConfig.enabled || dayConfig.slots.length === 0) {
      continue;
    }

    result.push({
      date: toIsoDate(date),
      slots: [...dayConfig.slots].sort(),
    });
  }

  return result;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/auth/send-otp', async (req, res) => {
  const role = String(req.body?.role || 'customer');
  const phone = sanitizePhone(req.body?.phone);

  if (!isValidRole(role)) {
    res.status(400).json({ error: 'Role must be customer or partner.' });
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    res.status(400).json({ error: 'Phone must be 10 digits.' });
    return;
  }

  const store = await getStore();
  await cleanupStoreIfNeeded(store);

  const now = Date.now();
  const latestRequest = Object.values(store.authRequests || {})
    .filter((request) => request.phone === phone && request.role === role)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];

  if (latestRequest) {
    const lastSentAt = Number(latestRequest.lastSentAt || latestRequest.createdAt || 0);
    const waitMs = OTP_COOLDOWN_MS - (now - lastSentAt);
    if (waitMs > 0) {
      res.status(429).json({
        error: `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another OTP.`,
      });
      return;
    }
  }

  const otpToken = createId('otp');
  const otpCode = ENABLE_DEMO_OTP ? '123456' : randomOtpCode();

  store.authRequests[otpToken] = {
    phone,
    role,
    code: otpCode,
    createdAt: now,
    lastSentAt: now,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
  };
  await saveStore();

  const responsePayload = {
    otpToken,
    message: 'OTP sent successfully.',
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
  };
  if (ENABLE_DEMO_OTP) {
    responsePayload.demoOtpCode = otpCode;
  }

  res.json({
    ...responsePayload,
  });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const role = String(req.body?.role || 'customer');
  const phone = sanitizePhone(req.body?.phone);
  const otpToken = String(req.body?.otpToken || '').trim();
  const otp = String(req.body?.otp || '').trim();

  if (!isValidRole(role)) {
    res.status(400).json({ error: 'Role must be customer or partner.' });
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    res.status(400).json({ error: 'Phone must be 10 digits.' });
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    res.status(400).json({ error: 'OTP must be 6 digits.' });
    return;
  }
  if (!otpToken) {
    res.status(400).json({ error: 'OTP token is required.' });
    return;
  }

  const store = await getStore();
  await cleanupStoreIfNeeded(store);

  const authRequest = store.authRequests[otpToken];
  if (!authRequest || authRequest.phone !== phone || authRequest.role !== role) {
    res.status(400).json({ error: 'OTP session not found. Please request a new OTP.' });
    return;
  }

  if (Number(authRequest.expiresAt || 0) <= Date.now()) {
    delete store.authRequests[otpToken];
    await saveStore();
    res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
    return;
  }

  const attempts = Number(authRequest.attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    delete store.authRequests[otpToken];
    await saveStore();
    res.status(429).json({ error: 'Too many invalid OTP attempts. Please request a new OTP.' });
    return;
  }

  if (authRequest.code !== otp) {
    authRequest.attempts = attempts + 1;
    if (authRequest.attempts >= OTP_MAX_ATTEMPTS) {
      delete store.authRequests[otpToken];
    }
    await saveStore();
    res.status(400).json({ error: 'Invalid OTP.' });
    return;
  }

  let user = store.users.find((candidate) => candidate.phone === phone && candidate.role === role);
  if (!user) {
    user = {
      id: createId(role === 'partner' ? 'u-partner' : 'u-customer'),
      name: role === 'partner' ? 'Service Partner' : 'Customer',
      role,
      marketplaceRole: role === 'partner' ? 'worker' : 'client',
      phone,
      ratings: 4.5,
      walletBalance: 0,
      location: 'Bangalore',
      skills: role === 'partner' ? ['General Service'] : ['Client Management'],
    };
    if (role === 'partner') {
      user.partnerId = DEFAULT_PARTNER_ID;
    }
    store.users.push(user);
  } else if (role === 'partner' && !user.partnerId) {
    user.partnerId = DEFAULT_PARTNER_ID;
  }

  const token = createSessionToken();
  store.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
  });

  delete store.authRequests[otpToken];

  await saveStore();

  res.json({ token, user });
});

app.post('/api/auth/google', async (req, res) => {
  const role = String(req.body?.role || 'customer');
  const idToken = String(req.body?.idToken || '').trim();
  const fallbackEmail = normalizeEmail(req.body?.email);
  const fallbackName = String(req.body?.name || '').trim();

  if (!isValidRole(role)) {
    res.status(400).json({ error: 'Role must be customer or partner.' });
    return;
  }

  let profile;
  if (idToken) {
    try {
      profile = await verifyGoogleIdentity(idToken);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Google sign in failed.' });
      return;
    }
  }

  if (!profile) {
    if (!ALLOW_INSECURE_GOOGLE_MOCK) {
      res.status(503).json({
        error: 'Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID and pass idToken.',
      });
      return;
    }

    if (!fallbackEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallbackEmail)) {
      res.status(400).json({ error: 'A valid email is required for Google sign in.' });
      return;
    }

    profile = {
      email: fallbackEmail,
      name: fallbackName || fallbackEmail.split('@')[0],
    };
  }

  const store = await getStore();
  await cleanupStoreIfNeeded(store);

  let user = store.users.find(
    (candidate) => candidate.role === role && normalizeEmail(candidate.email) === profile.email,
  );
  if (!user) {
    user = {
      id: createId(role === 'partner' ? 'u-partner' : 'u-customer'),
      name: profile.name,
      role,
      marketplaceRole: role === 'partner' ? 'worker' : 'client',
      phone: '0000000000',
      email: profile.email,
      ratings: 4.5,
      walletBalance: 0,
      location: 'Bangalore',
      skills: role === 'partner' ? ['General Service'] : ['Client Management'],
    };
    if (role === 'partner') {
      user.partnerId = DEFAULT_PARTNER_ID;
    }
    store.users.push(user);
  } else {
    user.name = profile.name || user.name;
    user.email = profile.email;
    if (!user.marketplaceRole) {
      user.marketplaceRole = role === 'partner' ? 'worker' : 'client';
    }
    if (!Array.isArray(user.skills)) {
      user.skills = role === 'partner' ? ['General Service'] : ['Client Management'];
    }
    if (role === 'partner' && !user.partnerId) {
      user.partnerId = DEFAULT_PARTNER_ID;
    }
  }

  const token = createSessionToken();
  store.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
  });
  await saveStore();

  res.json({ token, user });
});

app.get('/api/auth/me', async (req, res) => {
  res.json({ user: req.authUser });
});

app.post('/api/auth/logout', async (req, res) => {
  const store = await getStore();
  const token = String(req.authToken || '');
  store.sessions = (store.sessions || []).filter((session) => session.token !== token);
  await saveStore();
  res.json({ success: true });
});

app.get('/api/prompts', async (_req, res) => {
  const store = await getStore();
  res.json({ prompts: store.suggestedPrompts });
});

app.post('/api/chat/query', async (req, res) => {
  const query = String(req.body?.query || '').trim();
  const store = await getStore();

  const searchResults = filterPartnersByQuery(store.servicePartners, query);
  const responseResults = searchResults.length > 0 ? searchResults : store.servicePartners.slice(0, 3);
  res.json({
    content: getQueryResponseText(query.toLowerCase(), responseResults.length),
    serviceResults: responseResults,
  });
});

app.get('/api/partners', async (req, res) => {
  const store = await getStore();
  const query = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();

  let partners = [...store.servicePartners];
  if (category) {
    partners = partners.filter((partner) => partner.category.toLowerCase() === category);
  }
  if (query) {
    partners = filterPartnersByQuery(partners, query);
  }

  res.json(partners);
});

app.get('/api/partners/:id', async (req, res) => {
  const store = await getStore();
  const partner = store.servicePartners.find((candidate) => candidate.id === req.params.id);
  if (!partner) {
    res.status(404).json({ error: 'Partner not found.' });
    return;
  }

  res.json(partner);
});

app.get('/api/partners/:id/reviews', async (req, res) => {
  const store = await getStore();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 50)));
  const reviews = store.reviews
    .filter((review) => review.partnerId === req.params.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  res.json(reviews);
});

app.get('/api/bookings', async (req, res) => {
  const store = await getStore();
  const authUser = req.authUser;
  const customerId = String(req.query.customerId || '');
  const partnerId = String(req.query.partnerId || '');

  let bookings = [...store.bookings];
  if (authUser.role === 'customer') {
    bookings = bookings.filter((booking) => booking.customerId === authUser.id);
  } else if (authUser.role === 'partner') {
    bookings = bookings.filter((booking) => booking.partnerId === getUserPartnerId(authUser));
  } else {
    res.status(403).json({ error: 'Invalid user role.' });
    return;
  }

  if (authUser.role === 'partner' && customerId) {
    bookings = bookings.filter((booking) => booking.customerId === customerId);
  }
  if (authUser.role === 'customer' && partnerId) {
    bookings = bookings.filter((booking) => booking.partnerId === partnerId);
  }

  bookings.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  res.json(bookings);
});

app.get('/api/bookings/:id', async (req, res) => {
  const store = await getStore();
  const authUser = req.authUser;
  const booking = store.bookings.find((candidate) => candidate.id === req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (authUser.role === 'customer' && booking.customerId && booking.customerId !== authUser.id) {
    res.status(403).json({ error: 'You are not allowed to view this booking.' });
    return;
  }
  if (authUser.role === 'partner' && booking.partnerId !== getUserPartnerId(authUser)) {
    res.status(403).json({ error: 'You are not allowed to view this booking.' });
    return;
  }

  res.json(booking);
});

app.post('/api/bookings', async (req, res) => {
  const authUser = req.authUser;
  if (authUser.role !== 'customer') {
    res.status(403).json({ error: 'Only customers can create bookings.' });
    return;
  }

  const {
    partnerId,
    serviceId,
    date,
    time,
    address,
    notes = '',
  } = req.body ?? {};

  if (!partnerId || !serviceId || !date || !time || !address) {
    res.status(400).json({ error: 'partnerId, serviceId, date, time, and address are required.' });
    return;
  }

  const store = await getStore();
  const partner = store.servicePartners.find((candidate) => candidate.id === partnerId);
  if (!partner) {
    res.status(404).json({ error: 'Partner not found.' });
    return;
  }

  const service = partner.services.find((candidate) => candidate.id === serviceId);
  if (!service) {
    res.status(404).json({ error: 'Service not found.' });
    return;
  }

  const booking = {
    id: createId('b'),
    customerId: authUser.id || DEFAULT_CUSTOMER_ID,
    partnerId: partner.id,
    partnerName: partner.name,
    partnerImage: partner.image,
    serviceId: service.id,
    service: service.name,
    date,
    time,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: '',
    price: service.price + 50,
    address,
    notes,
    category: partner.category,
    jobId: '',
  };

  store.bookings.push(booking);
  await saveStore();

  res.status(201).json(booking);
});

app.post('/api/payments', async (req, res) => {
  const authUser = req.authUser;
  if (authUser.role !== 'customer') {
    res.status(403).json({ error: 'Only customers can complete payments.' });
    return;
  }

  const { bookingId, paymentMethod = 'upi' } = req.body ?? {};
  if (!bookingId) {
    res.status(400).json({ error: 'bookingId is required.' });
    return;
  }

  const store = await getStore();
  const booking = store.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (booking.customerId && booking.customerId !== authUser.id) {
    res.status(403).json({ error: 'You can only pay for your own booking.' });
    return;
  }

  booking.paymentStatus = 'paid';
  booking.paymentMethod = paymentMethod;
  booking.status = 'assigned';

  if (!booking.jobId) {
    const existingCustomer = store.users.find((user) => user.id === booking.customerId);
    const jobId = createId('j');
    const newJob = {
      id: jobId,
      bookingId: booking.id,
      partnerId: booking.partnerId,
      customerId: booking.customerId,
      customerName: existingCustomer?.name || 'Customer',
      customerImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      service: booking.service,
      date: booking.date,
      time: booking.time,
      status: 'pending',
      price: Math.max(0, booking.price - 50),
      address: booking.address,
      distance: Number((Math.random() * 4 + 0.5).toFixed(1)),
    };
    store.jobs.push(newJob);
    booking.jobId = jobId;
  }

  const hasTransaction = store.transactions.some((tx) => tx.bookingId === booking.id);
  if (!hasTransaction) {
    store.transactions.push({
      id: createId('t'),
      partnerId: booking.partnerId,
      bookingId: booking.id,
      customer: store.users.find((user) => user.id === booking.customerId)?.name || 'Customer',
      service: booking.service,
      amount: Math.max(0, booking.price - 50),
      date: toIsoDate(),
      status: 'completed',
    });
  }

  await saveStore();
  res.json({
    success: true,
    booking,
  });
});

app.get('/api/tracking/:bookingId', async (req, res) => {
  const store = await getStore();
  const authUser = req.authUser;
  const booking = store.bookings.find((candidate) => candidate.id === req.params.bookingId);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (authUser.role === 'customer' && booking.customerId && booking.customerId !== authUser.id) {
    res.status(403).json({ error: 'Tracking is not available for this booking.' });
    return;
  }
  if (authUser.role === 'partner' && booking.partnerId !== getUserPartnerId(authUser)) {
    res.status(403).json({ error: 'Tracking is not available for this booking.' });
    return;
  }

  const partner = store.servicePartners.find((candidate) => candidate.id === booking.partnerId);
  const currentStatusIndex = bookingToTrackingIndex[booking.status] ?? 0;

  res.json({
    booking,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            image: partner.image,
            phone: String(partner.phone || '+91 98765 43210'),
            eta: Math.max(0, partner.eta - currentStatusIndex * 3),
          }
      : null,
    statusFlow: trackingSteps,
    currentStatusIndex,
  });
});

app.get('/api/partner/:partnerId/dashboard', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const store = await getStore();
  const partnerId = authPartnerId;
  const stats = calculatePartnerStats(partnerId, store);
  const today = toIsoDate();

  const todayJobs = store.jobs
    .filter((job) => job.partnerId === partnerId && job.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  res.json({ stats, todayJobs });
});

app.get('/api/partner/:partnerId/jobs', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const store = await getStore();
  const jobs = store.jobs
    .filter((job) => job.partnerId === authPartnerId)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));

  res.json(jobs);
});

app.patch('/api/partner/jobs/:jobId', async (req, res) => {
  const authUser = req.authUser;
  if (authUser?.role !== 'partner') {
    res.status(403).json({ error: 'Partner access required.' });
    return;
  }
  const authPartnerId = getUserPartnerId(authUser);

  const { status } = req.body ?? {};
  const allowedStatuses = ['accepted', 'on-the-way', 'in-progress', 'completed'];
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status update.' });
    return;
  }

  const store = await getStore();
  const job = store.jobs.find((candidate) => candidate.id === req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (job.partnerId !== authPartnerId) {
    res.status(403).json({ error: 'You are not allowed to modify this job.' });
    return;
  }

  job.status = status;
  if (job.bookingId) {
    const booking = store.bookings.find((candidate) => candidate.id === job.bookingId);
    if (booking) {
      booking.status = jobToBookingStatus[status] || booking.status;
    }
  }

  await saveStore();
  res.json(job);
});

app.delete('/api/partner/jobs/:jobId', async (req, res) => {
  const authUser = req.authUser;
  if (authUser?.role !== 'partner') {
    res.status(403).json({ error: 'Partner access required.' });
    return;
  }
  const authPartnerId = getUserPartnerId(authUser);

  const store = await getStore();
  const jobIndex = store.jobs.findIndex((candidate) => candidate.id === req.params.jobId);
  if (jobIndex === -1) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (store.jobs[jobIndex].partnerId !== authPartnerId) {
    res.status(403).json({ error: 'You are not allowed to delete this job.' });
    return;
  }

  const [removedJob] = store.jobs.splice(jobIndex, 1);
  if (removedJob.bookingId) {
    const booking = store.bookings.find((candidate) => candidate.id === removedJob.bookingId);
    if (booking) {
      booking.status = 'cancelled';
    }
  }

  await saveStore();
  res.json({ success: true });
});

app.get('/api/partner/:partnerId/availability', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const store = await getStore();
  const availability = store.partnerAvailabilityByPartnerId[authPartnerId];
  if (availability) {
    res.json(availability);
    return;
  }

  const empty = weekDays.reduce((accumulator, day) => {
    accumulator[day] = { enabled: false, slots: [] };
    return accumulator;
  }, {});

  res.json(empty);
});

app.put('/api/partner/:partnerId/availability', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const availability = req.body?.availability;
  if (!availability || typeof availability !== 'object') {
    res.status(400).json({ error: 'availability object is required.' });
    return;
  }

  const store = await getStore();
  const partnerId = authPartnerId;
  store.partnerAvailabilityByPartnerId[partnerId] = availability;

  const partner = store.servicePartners.find((candidate) => candidate.id === partnerId);
  if (partner) {
    partner.availability = generateRollingAvailability(availability);
    partner.available = partner.availability.length > 0;
  }

  await saveStore();
  res.json(store.partnerAvailabilityByPartnerId[partnerId]);
});

app.get('/api/partner/:partnerId/earnings', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const store = await getStore();
  const transactions = store.transactions
    .filter((tx) => tx.partnerId === authPartnerId)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    stats: calculatePartnerStats(authPartnerId, store),
    weeklyData: buildWeeklyEarningsData(transactions),
    monthlyData: buildMonthlyEarningsData(transactions),
    transactions,
  });
});

app.get('/api/partner/:partnerId/reviews', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const store = await getStore();
  const reviews = store.reviews
    .filter((review) => review.partnerId === authPartnerId)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    stats: calculatePartnerStats(authPartnerId, store),
    reviews,
    ratingDistribution: buildRatingDistribution(reviews),
  });
});

app.post('/api/partner/:partnerId/reviews/:reviewId/reply', async (req, res) => {
  const authPartnerId = enforcePartnerAccess(req, res);
  if (!authPartnerId) {
    return;
  }

  const { text } = req.body ?? {};
  if (!text || !String(text).trim()) {
    res.status(400).json({ error: 'Reply text is required.' });
    return;
  }

  const store = await getStore();
  const review = store.reviews.find(
    (candidate) => candidate.id === req.params.reviewId && candidate.partnerId === authPartnerId,
  );
  if (!review) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }

  review.reply = String(text).trim();
  review.replyDate = toIsoDate();

  await saveStore();
  res.json(review);
});

app.post('/api/telemetry/click', async (req, res) => {
  const store = await getStore();
  const user = req.authUser;
  const action = String(req.body?.action || '').trim();
  const target = String(req.body?.target || '').trim();
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

  if (!action || !target) {
    res.status(400).json({ error: 'action and target are required.' });
    return;
  }

  store.clickLogs.push({
    id: createId('click'),
    userId: user.id,
    action,
    target,
    metadata,
    timestamp: new Date().toISOString(),
  });
  if (store.clickLogs.length > 1500) {
    store.clickLogs = store.clickLogs.slice(-1000);
  }

  await saveStore();
  res.json({ success: true });
});

app.get('/api/marketplace/profile', async (req, res) => {
  const store = await getStore();
  const profile = buildMarketplaceProfile(req.authUser, store);
  res.json(profile);
});

app.patch('/api/marketplace/profile', async (req, res) => {
  const store = await getStore();
  const user = store.users.find((candidate) => candidate.id === req.authUser.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const nextLocation = String(req.body?.location || '').trim();
  const nextSkillsRaw = req.body?.skills;
  const nextSkills = Array.isArray(nextSkillsRaw)
    ? nextSkillsRaw.map((skill) => String(skill || '').trim()).filter(Boolean)
    : [];

  if (nextLocation) {
    user.location = nextLocation;
  }
  if (nextSkills.length > 0) {
    user.skills = nextSkills;
  }

  await saveStore();
  res.json(buildMarketplaceProfile(user, store));
});

app.get('/api/marketplace/jobs', async (req, res) => {
  const store = await getStore();
  const status = String(req.query.status || '').trim().toLowerCase();
  const search = String(req.query.search || '').trim().toLowerCase();
  const mode = String(req.query.mode || '').trim().toLowerCase();
  const location = String(req.query.location || '').trim().toLowerCase();
  const mine = String(req.query.mine || '').trim() === 'true';

  let jobs = [...store.marketplaceJobs];
  if (mine) {
    jobs = jobs.filter((job) => job.owner_id === req.authUser.id || job.selectedApplicantId === req.authUser.id);
  }
  if (status && status !== 'all') {
    jobs = jobs.filter((job) => String(job.status).toLowerCase() === status);
  }
  if (mode && mode !== 'all') {
    jobs = jobs.filter((job) => String(job.mode).toLowerCase() === mode);
  }
  if (location) {
    jobs = jobs.filter((job) => String(job.location || '').toLowerCase().includes(location));
  }
  if (search) {
    jobs = jobs.filter((job) => {
      const haystack = `${job.title} ${job.description} ${job.requiredSkills.join(' ')}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(jobs);
});

app.post('/api/marketplace/jobs', async (req, res) => {
  const { title, description, budget, location, mode = 'online', requiredSkills = [], attachments = [] } = req.body ?? {};
  if (!title || !description || !budget || !location) {
    res.status(400).json({ error: 'title, description, budget and location are required.' });
    return;
  }

  const parsedBudget = Number(budget);
  if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
    res.status(400).json({ error: 'budget must be a positive number.' });
    return;
  }

  const store = await getStore();
  const normalizedSkills = Array.isArray(requiredSkills)
    ? requiredSkills.map((skill) => String(skill || '').trim()).filter(Boolean)
    : String(requiredSkills || '')
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
  const normalizedAttachments = Array.isArray(attachments)
    ? attachments.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
    : [];

  const job = {
    job_id: createId('mj'),
    owner_id: req.authUser.id,
    title: String(title).trim(),
    description: String(description).trim(),
    budget: parsedBudget,
    location: String(location).trim(),
    mode: ['online', 'offline', 'hybrid'].includes(String(mode)) ? String(mode) : 'online',
    status: 'open',
    requiredSkills: normalizedSkills,
    attachments: normalizedAttachments,
    createdAt: new Date().toISOString(),
    applicationsCount: 0,
    selectedApplicantId: '',
  };
  store.marketplaceJobs.push(job);

  const ownerProfile = buildMarketplaceProfile(req.authUser, store);
  const potentialWorkers = store.users.filter((user) => getMarketplaceRole(user) === 'worker' && user.id !== req.authUser.id);
  potentialWorkers.slice(0, 10).forEach((worker) => {
    const workerProfile = buildMarketplaceProfile(worker, store);
    if (scoreJobForUser(job, workerProfile) >= 40) {
      store.marketplaceNotifications.push({
        notification_id: createId('mn'),
        user_id: worker.id,
        title: 'New matched job',
        body: `A new job "${job.title}" matches your profile.`,
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  store.clickLogs.push({
    id: createId('click'),
    userId: req.authUser.id,
    action: 'job_posted',
    target: job.job_id,
    metadata: { ownerRank: ownerProfile.rank },
    timestamp: new Date().toISOString(),
  });

  await saveStore();
  res.status(201).json(job);
});

app.post('/api/marketplace/jobs/:jobId/apply', async (req, res) => {
  const proposal = String(req.body?.proposal || '').trim();
  if (!proposal) {
    res.status(400).json({ error: 'proposal is required.' });
    return;
  }

  const store = await getStore();
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (job.owner_id === req.authUser.id) {
    res.status(400).json({ error: 'You cannot apply to your own job.' });
    return;
  }
  if (job.status !== 'open') {
    res.status(400).json({ error: 'Applications are closed for this job.' });
    return;
  }

  const alreadyApplied = store.marketplaceApplications.some(
    (application) => application.job_id === job.job_id && application.applicant_id === req.authUser.id,
  );
  if (alreadyApplied) {
    res.status(400).json({ error: 'You have already applied to this job.' });
    return;
  }

  const application = {
    application_id: createId('ma'),
    applicant_id: req.authUser.id,
    job_id: job.job_id,
    proposal,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.marketplaceApplications.push(application);
  job.applicationsCount = store.marketplaceApplications.filter((item) => item.job_id === job.job_id).length;

  store.marketplaceNotifications.push({
    notification_id: createId('mn'),
    user_id: job.owner_id,
    title: 'New application received',
    body: `${req.authUser.name} applied to "${job.title}".`,
    type: 'application',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await saveStore();
  res.status(201).json(application);
});

app.get('/api/marketplace/jobs/:jobId/applications', async (req, res) => {
  const store = await getStore();
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (job.owner_id !== req.authUser.id) {
    res.status(403).json({ error: 'Only job owner can view applications.' });
    return;
  }

  const applications = store.marketplaceApplications
    .filter((application) => application.job_id === job.job_id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((application) => {
      const applicant = store.users.find((user) => user.id === application.applicant_id);
      return {
        ...application,
        applicant: applicant ? getPublicUserSummary(applicant) : null,
      };
    });

  res.json(applications);
});

app.patch('/api/marketplace/applications/:applicationId', async (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (!['shortlisted', 'accepted', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'status must be shortlisted, accepted, or rejected.' });
    return;
  }

  const store = await getStore();
  const application = store.marketplaceApplications.find((candidate) => candidate.application_id === req.params.applicationId);
  if (!application) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === application.job_id);
  if (!job) {
    res.status(404).json({ error: 'Job not found for application.' });
    return;
  }
  if (job.owner_id !== req.authUser.id) {
    res.status(403).json({ error: 'Only job owner can update application status.' });
    return;
  }

  application.status = status;
  if (status === 'accepted') {
    job.selectedApplicantId = application.applicant_id;
    job.status = 'ongoing';

    store.marketplaceApplications
      .filter((item) => item.job_id === job.job_id && item.application_id !== application.application_id)
      .forEach((item) => {
        item.status = item.status === 'accepted' ? 'rejected' : item.status;
      });
  }

  store.marketplaceNotifications.push({
    notification_id: createId('mn'),
    user_id: application.applicant_id,
    title: `Application ${status}`,
    body: `Your application for "${job.title}" is now ${status}.`,
    type: 'application',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await saveStore();
  res.json(application);
});

app.patch('/api/marketplace/jobs/:jobId/status', async (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (!['open', 'ongoing', 'completed'].includes(status)) {
    res.status(400).json({ error: 'status must be open, ongoing, or completed.' });
    return;
  }

  const store = await getStore();
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }

  const isOwner = job.owner_id === req.authUser.id;
  const isSelectedWorker = job.selectedApplicantId === req.authUser.id;
  if (!isOwner && !isSelectedWorker) {
    res.status(403).json({ error: 'Not allowed to update this job.' });
    return;
  }

  job.status = status;
  if (status === 'completed' && job.selectedApplicantId) {
    const worker = store.users.find((user) => user.id === job.selectedApplicantId);
    const owner = store.users.find((user) => user.id === job.owner_id);
    if (worker) {
      worker.walletBalance = Number(worker.walletBalance || 0) + Math.round(job.budget * 0.9);
      worker.ratings = Number((Math.min(5, Number(worker.ratings || 4.5) + 0.03)).toFixed(2));
    }
    if (owner) {
      owner.walletBalance = Number(owner.walletBalance || 0) - job.budget;
    }

    if (job.owner_id !== req.authUser.id) {
      store.marketplaceNotifications.push({
        notification_id: createId('mn'),
        user_id: job.owner_id,
        title: 'Job marked completed',
        body: `Worker marked "${job.title}" as completed.`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
    if (job.selectedApplicantId !== req.authUser.id) {
      store.marketplaceNotifications.push({
        notification_id: createId('mn'),
        user_id: job.selectedApplicantId,
        title: 'Payment released',
        body: `Payment for "${job.title}" has been released to your wallet.`,
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await saveStore();
  res.json(job);
});

app.get('/api/marketplace/recommendations', async (req, res) => {
  const store = await getStore();
  const profile = buildMarketplaceProfile(req.authUser, store);
  const recommendations = store.marketplaceJobs
    .filter((job) => job.owner_id !== req.authUser.id && job.status === 'open')
    .map((job) => ({
      ...job,
      matchScore: scoreJobForUser(job, profile),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  res.json({
    profile,
    jobs: recommendations,
  });
});

app.get('/api/marketplace/conversations', async (req, res) => {
  const store = await getStore();
  const userId = req.authUser.id;

  const messages = store.marketplaceMessages
    .filter((message) => message.sender_id === userId || message.receiver_id === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const map = new Map();
  messages.forEach((message) => {
    const peerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    if (map.has(peerId)) {
      return;
    }
    const peer = store.users.find((user) => user.id === peerId);
    map.set(peerId, {
      peer: peer ? getPublicUserSummary(peer) : { user_id: peerId, name: 'Unknown User', role: 'worker', ratings: 0, rank: 0 },
      lastMessage: message,
      unreadCount: store.marketplaceNotifications.filter(
        (notification) =>
          notification.user_id === userId &&
          notification.type === 'message' &&
          !notification.isRead &&
          notification.body.includes(peer ? peer.name : ''),
      ).length,
    });
  });

  res.json(Array.from(map.values()));
});

app.get('/api/marketplace/messages/:peerId', async (req, res) => {
  const store = await getStore();
  const userId = req.authUser.id;
  const peerId = String(req.params.peerId || '').trim();
  const messages = store.marketplaceMessages
    .filter(
      (message) =>
        (message.sender_id === userId && message.receiver_id === peerId) ||
        (message.sender_id === peerId && message.receiver_id === userId),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  res.json(messages);
});

app.post('/api/marketplace/messages', async (req, res) => {
  const receiverId = String(req.body?.receiver_id || req.body?.receiverId || '').trim();
  const messageText = String(req.body?.message || '').trim();
  const jobId = String(req.body?.job_id || req.body?.jobId || '').trim();

  if (!receiverId || !messageText) {
    res.status(400).json({ error: 'receiver_id and message are required.' });
    return;
  }

  const store = await getStore();
  const receiver = store.users.find((user) => user.id === receiverId);
  if (!receiver) {
    res.status(404).json({ error: 'Receiver not found.' });
    return;
  }

  const message = {
    message_id: createId('mm'),
    sender_id: req.authUser.id,
    receiver_id: receiverId,
    message: messageText,
    timestamp: new Date().toISOString(),
    job_id: jobId || '',
  };
  store.marketplaceMessages.push(message);
  store.marketplaceNotifications.push({
    notification_id: createId('mn'),
    user_id: receiverId,
    title: 'New message',
    body: `${req.authUser.name}: ${messageText.slice(0, 80)}`,
    type: 'message',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await saveStore();
  res.status(201).json(message);
});

app.get('/api/marketplace/notifications', async (req, res) => {
  const store = await getStore();
  const notifications = store.marketplaceNotifications
    .filter((notification) => notification.user_id === req.authUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
  res.json(notifications);
});

app.patch('/api/marketplace/notifications/:notificationId/read', async (req, res) => {
  const store = await getStore();
  const notification = store.marketplaceNotifications.find(
    (candidate) =>
      candidate.notification_id === req.params.notificationId &&
      candidate.user_id === req.authUser.id,
  );
  if (!notification) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  notification.isRead = true;
  await saveStore();
  res.json(notification);
});

app.get('/api/defaults', async (_req, res) => {
  res.json({
    defaultCustomerId: DEFAULT_CUSTOMER_ID,
    defaultPartnerId: DEFAULT_PARTNER_ID,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`Marketplace API running on http://localhost:${PORT}`);
});
