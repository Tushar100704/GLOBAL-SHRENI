const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { neon } = require('@neondatabase/serverless');
const { OAuth2Client } = require('google-auth-library');

const root = __dirname;
const dataDirectory = path.join(root, 'data');
const usePostgres = Boolean(process.env.DATABASE_URL);
if (process.env.VERCEL && !usePostgres) throw new Error('DATABASE_URL is required on Vercel.');
let database;
const httpSql = usePostgres ? neon(process.env.DATABASE_URL, { fullResults: true }) : null;
if (usePostgres) {
  database = null;
} else {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const databasePath = process.env.DATABASE_PATH || path.join(dataDirectory, 'global-shreni.sqlite');
  database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
}
const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('customer', 'worker', 'both')),
    created_at TEXT NOT NULL,
    google_sub TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    bio TEXT NOT NULL,
    category TEXT NOT NULL,
    skills TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('online', 'local', 'hybrid')),
    location TEXT NOT NULL,
    starting_rate INTEGER NOT NULL CHECK (starting_rate >= 0),
    availability TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    duration_hours INTEGER NOT NULL CHECK (duration_hours BETWEEN 1 AND 240),
    pay_per_person INTEGER NOT NULL CHECK (pay_per_person >= 100),
    workers_needed INTEGER NOT NULL CHECK (workers_needed BETWEEN 1 AND 100),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tasks_open_idx ON tasks(status, starts_at);
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'declined', 'withdrawn')),
    created_at TEXT NOT NULL,
    UNIQUE(task_id, worker_id)
  );
  CREATE INDEX IF NOT EXISTS applications_task_idx ON applications(task_id, status);
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    details TEXT NOT NULL,
    location TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    proposed_price INTEGER NOT NULL CHECK (proposed_price >= 0),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'declined', 'cancelled', 'completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS bookings_worker_idx ON bookings(worker_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reviews_worker_idx ON reviews(worker_id);
  CREATE TABLE IF NOT EXISTS marketplace_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS marketplace_events_user_idx ON marketplace_events(user_id, event_id);
  CREATE TABLE IF NOT EXISTS ai_usage (
    network_hash TEXT NOT NULL,
    usage_day TEXT NOT NULL,
    request_count INTEGER NOT NULL,
    PRIMARY KEY (network_hash, usage_day)
  );
`;
const postgresSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('customer', 'worker', 'both')),
    created_at TEXT NOT NULL,
    google_sub TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    bio TEXT NOT NULL,
    category TEXT NOT NULL,
    skills TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('online', 'local', 'hybrid')),
    location TEXT NOT NULL,
    starting_rate INTEGER NOT NULL CHECK (starting_rate >= 0),
    availability TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    duration_hours INTEGER NOT NULL CHECK (duration_hours BETWEEN 1 AND 240),
    pay_per_person INTEGER NOT NULL CHECK (pay_per_person >= 100),
    workers_needed INTEGER NOT NULL CHECK (workers_needed BETWEEN 1 AND 100),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tasks_open_idx ON tasks(status, starts_at);
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'declined', 'withdrawn')),
    created_at TEXT NOT NULL,
    UNIQUE(task_id, worker_id)
  );
  CREATE INDEX IF NOT EXISTS applications_task_idx ON applications(task_id, status);
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    details TEXT NOT NULL,
    location TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    proposed_price INTEGER NOT NULL CHECK (proposed_price >= 0),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'declined', 'cancelled', 'completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS bookings_worker_idx ON bookings(worker_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reviews_worker_idx ON reviews(worker_id);
  CREATE TABLE IF NOT EXISTS marketplace_events (
    event_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS marketplace_events_user_idx ON marketplace_events(user_id, event_id);
  CREATE TABLE IF NOT EXISTS ai_usage (
    network_hash TEXT NOT NULL,
    usage_day TEXT NOT NULL,
    request_count INTEGER NOT NULL,
    PRIMARY KEY (network_hash, usage_day)
  );
`;

const databaseReady = (async () => {
  if (usePostgres) {
    for (const statement of postgresSchema.split(';').map((part) => part.trim()).filter(Boolean)) await httpSql.query(statement);
    await httpSql.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT');
    await httpSql.query('CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub) WHERE google_sub IS NOT NULL');
  } else {
    database.exec(sqliteSchema);
    const userColumns = database.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
    if (!userColumns.includes('google_sub')) database.exec('ALTER TABLE users ADD COLUMN google_sub TEXT');
    database.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub) WHERE google_sub IS NOT NULL');
  }
  await run('DELETE FROM sessions WHERE expires_at <= $1', [nowIso()]);
})();

async function all(sql, values = [], connection = database) {
  if (usePostgres) return (await httpSql.query(sql, values)).rows;
  const statement = bindSqlite(sql, values, connection);
  return statement.prepared.all(...statement.values);
}
async function one(sql, values = [], connection = database) {
  if (usePostgres) return (await httpSql.query(sql, values)).rows[0] || null;
  const statement = bindSqlite(sql, values, connection);
  return statement.prepared.get(...statement.values) || null;
}
async function run(sql, values = [], connection = database) {
  if (usePostgres) return httpSql.query(sql, values);
  const statement = bindSqlite(sql, values, connection);
  return statement.prepared.run(...statement.values);
}
function bindSqlite(sql, values, connection) {
  const parameters = [];
  const statement = sql.replace(/\$(\d+)/g, (_, index) => {
    parameters.push(values[Number(index) - 1]);
    return '?';
  });
  return { prepared: connection.prepare(statement), values: parameters };
}
async function withTransaction(operation) {
  if (usePostgres) {
    throw new Error('Use a Neon HTTP transaction for PostgreSQL operations.');
  }
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = await operation(database);
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

const categories = [
  { name: 'Technology', detail: 'Software · AI · Data · IT', mode: 'online', icon: '⌘', tone: 'blue' },
  { name: 'Design & creative', detail: 'UI/UX · Video · Writing', mode: 'online', icon: '✦', tone: 'lilac' },
  { name: 'Business', detail: 'Consulting · Marketing · Operations', mode: 'online', icon: '↗', tone: 'sage' },
  { name: 'Professional', detail: 'Finance · Legal · Advisory', mode: 'online', icon: '◈', tone: 'sun' },
  { name: 'Skilled trades', detail: 'Electrical · Plumbing · Carpentry', mode: 'local', icon: '⚒', tone: 'peach' },
  { name: 'Home services', detail: 'Repair · Maintenance · Installation', mode: 'local', icon: '⌂', tone: 'blue' },
  { name: 'Artisan & craft', detail: 'Handmade · Textile · Woodwork', mode: 'local', icon: '✿', tone: 'rose' },
  { name: 'Education', detail: 'Tutoring · Training · Coaching', mode: 'hybrid', icon: '⌑', tone: 'sun' },
  { name: 'Agriculture', detail: 'Farm services · Equipment · Support', mode: 'local', icon: '❋', tone: 'sage' },
  { name: 'Events', detail: 'Photography · Planning · Production', mode: 'hybrid', icon: '✧', tone: 'lilac' },
  { name: 'Logistics', detail: 'Delivery · Transport · Supply', mode: 'local', icon: '⇢', tone: 'peach' },
  { name: 'Everyday guild tasks', detail: 'Short shifts · Local crews · Flexible work', mode: 'local', icon: '✳', tone: 'rose' }
];
const categoryNames = new Set(categories.map((item) => item.name.toLowerCase()));
const sessionLifetimeMs = 14 * 24 * 60 * 60 * 1000;
const rateLimits = new Map();
const safeFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/assets/global-shreni-logo.png', ['assets/global-shreni-logo.png', 'image/png']]
]);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function nowIso() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }
function fail(status, message) { throw new HttpError(status, message); }
function sendJson(response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  response.end(body);
}
function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator > -1 && part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return '';
}
function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : '';
  response.setHeader('Set-Cookie', `shreni_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}${secure}`);
}
function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : '';
  response.setHeader('Set-Cookie', `shreni_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, accountType: user.account_type };
}
async function readProfile(userId) {
  const profile = await one('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  if (!profile) return null;
  return { ...profile, skills: JSON.parse(profile.skills), active: Boolean(profile.active) };
}
async function sessionUser(request) {
  const token = getCookie(request, 'shreni_session');
  if (!token) return null;
  const row = await one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > $2', [hashToken(token), nowIso()]);
  return row || null;
}
async function requireUser(request) {
  const user = await sessionUser(request);
  if (!user) fail(401, 'Sign in to continue.');
  return user;
}
async function issueSession(response, user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
  await run('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)', [hashToken(token), user.id, expiresAt, nowIso()]);
  setSessionCookie(response, token);
}
function checkRateLimit(request, scope, limit, windowMs) {
  const forwardedAddress = request.headers['x-forwarded-for'];
  const address = (typeof forwardedAddress === 'string' && forwardedAddress.split(',')[0].trim()) || request.socket.remoteAddress || 'unknown';
  const key = `${scope}:${address}`;
  const currentTime = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= currentTime) {
    rateLimits.set(key, { count: 1, resetAt: currentTime + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) fail(429, 'Too many attempts. Please wait a moment and try again.');
}
async function checkDailyChatQuota(request) {
  const forwardedAddress = request.headers['x-forwarded-for'];
  const address = (typeof forwardedAddress === 'string' && forwardedAddress.split(',')[0].trim()) || request.socket.remoteAddress || 'unknown';
  const networkHash = crypto.createHmac('sha256', process.env.DATABASE_URL || 'global-shreni-local-rate-limit').update(address).digest('hex');
  const today = new Date().toISOString().slice(0, 10);
  const quota = await one(`INSERT INTO ai_usage (network_hash, usage_day, request_count) VALUES ($1, $2, 1)
    ON CONFLICT(network_hash, usage_day) DO UPDATE SET request_count=ai_usage.request_count+1
    WHERE ai_usage.request_count < 20 RETURNING request_count`, [networkHash, today]);
  if (!quota) fail(429, 'You have reached today’s free assistant limit. Please try again tomorrow.');
  await run('DELETE FROM ai_usage WHERE usage_day < $1', [new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString().slice(0, 10)]);
}
function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  let originHost;
  try { originHost = new URL(origin).host; } catch { fail(403, 'Request origin could not be verified.'); }
  if (originHost !== request.headers.host) fail(403, 'Request origin could not be verified.');
}
async function readJson(request, maxBytes = 64_000) {
  const contentType = request.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('application/json')) fail(415, 'Send this form as JSON.');
  if (request.body !== undefined && request.body !== null) {
    const body = typeof request.body === 'string' || Buffer.isBuffer(request.body) ? request.body.toString() : JSON.stringify(request.body);
    if (Buffer.byteLength(body) > maxBytes) fail(413, 'This request is too large.');
    try { return JSON.parse(body); } catch { fail(400, 'The submitted information could not be read.'); }
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) fail(413, 'This request is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'The submitted information could not be read.'); }
}
function requiredText(value, name, maxLength, minLength = 1) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < minLength || text.length > maxLength) fail(400, `${name} must be between ${minLength} and ${maxLength} characters.`);
  return text;
}
function wholeNumber(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) fail(400, `${name} must be between ${minimum} and ${maximum}.`);
  return number;
}
function normaliseSkills(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const skills = [...new Set(values.map((skill) => String(skill).trim()).filter(Boolean))].slice(0, 12);
  if (skills.some((skill) => skill.length > 40)) fail(400, 'Each skill must be 40 characters or less.');
  return skills;
}
function validateProfile(input, userId, createdAt = nowIso()) {
  const headline = requiredText(input.headline, 'Headline', 80);
  const bio = requiredText(input.bio, 'Profile summary', 700, 20);
  const category = requiredText(input.category, 'Category', 80);
  if (!categoryNames.has(category.toLowerCase())) fail(400, 'Choose a category from the list.');
  const mode = ['online', 'local', 'hybrid'].includes(input.mode) ? input.mode : fail(400, 'Choose online, local, or hybrid work.');
  const location = requiredText(input.location, 'Location', 100);
  const availability = requiredText(input.availability, 'Availability', 40);
  const startingRate = wholeNumber(input.startingRate, 'Starting rate', 0, 1_000_000);
  const skills = normaliseSkills(input.skills);
  return { userId, headline, bio, category, skills: JSON.stringify(skills), mode, location, startingRate, availability, active: 1, createdAt };
}
function profileValues(profile) {
  return [profile.userId, profile.headline, profile.bio, profile.category, profile.skills, profile.mode, profile.location,
    profile.startingRate, profile.availability, profile.active, profile.createdAt];
}
function saveProfile(profile, connection = database) {
  return run(`INSERT INTO profiles (user_id, headline, bio, category, skills, mode, location, starting_rate, availability, active, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT(user_id) DO UPDATE SET headline=excluded.headline, bio=excluded.bio, category=excluded.category, skills=excluded.skills,
    mode=excluded.mode, location=excluded.location, starting_rate=excluded.starting_rate, availability=excluded.availability, active=1`, profileValues(profile), connection);
}
async function createUser(input) {
  const name = requiredText(input.name, 'Name', 80, 2);
  const email = requiredText(input.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
  if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 128) fail(400, 'Use a password between 10 and 128 characters.');
  const accountType = ['customer', 'worker', 'both'].includes(input.accountType) ? input.accountType : fail(400, 'Choose how you want to use Shreni.');
  const salt = crypto.randomBytes(16);
  const passwordHash = crypto.scryptSync(input.password, salt, 64);
  const user = { id: id(), name, email, password_salt: salt.toString('hex'), password_hash: passwordHash.toString('hex'), account_type: accountType, created_at: nowIso() };
  const profile = accountType === 'worker' || accountType === 'both' ? validateProfile(input.profile || {}, user.id, user.created_at) : null;
  try {
    const userInsert = 'INSERT INTO users (id, name, email, password_salt, password_hash, account_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    const userValues = [user.id, user.name, user.email, user.password_salt, user.password_hash, user.account_type, user.created_at];
    if (usePostgres) {
      const queries = [httpSql.query(userInsert, userValues)];
      if (profile) queries.push(saveProfile(profile));
      await httpSql.transaction(queries);
    } else {
      await withTransaction(async (connection) => {
        await run(userInsert, userValues, connection);
        if (profile) await saveProfile(profile, connection);
      });
    }
  } catch (error) {
    if (error.code === '23505' || String(error.message).includes('UNIQUE constraint failed: users.email')) fail(409, 'An account with this email already exists.');
    throw error;
  }
  return user;
}
async function publish(eventName, payload, recipients = null) {
  const createdAt = nowIso();
  if (!recipients) return run('INSERT INTO marketplace_events (event_name, payload, created_at) VALUES ($1, $2, $3)', [eventName, JSON.stringify(payload), createdAt]);
  for (const userId of recipients) {
    await run('INSERT INTO marketplace_events (user_id, event_name, payload, created_at) VALUES ($1, $2, $3, $4)', [userId, eventName, JSON.stringify(payload), createdAt]);
  }
}
async function renderWorkerRows(requestUrl) {
  const q = (requestUrl.searchParams.get('q') || '').trim().toLowerCase();
  const category = (requestUrl.searchParams.get('category') || '').trim().toLowerCase();
  const mode = requestUrl.searchParams.get('mode') || '';
  const location = (requestUrl.searchParams.get('location') || '').trim().toLowerCase();
  let rows = await all(`SELECT p.user_id AS id, u.name, p.headline, p.bio, p.category, p.skills, p.mode, p.location, p.starting_rate,
    p.availability, p.created_at, COALESCE(r.rating, 0) AS rating, COALESCE(r.review_count, 0) AS review_count
    FROM profiles p JOIN users u ON u.id = p.user_id
    LEFT JOIN (SELECT worker_id, AVG(rating) AS rating, COUNT(*) AS review_count FROM reviews GROUP BY worker_id) r ON r.worker_id = p.user_id
    WHERE p.active = 1`);
  const queryTerms = q.split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 1);
  rows = rows.filter((row) => (!category || row.category.toLowerCase() === category) && (!mode || row.mode === mode || row.mode === 'hybrid'));
  return rows.map((row) => {
    const text = `${row.name} ${row.headline} ${row.bio} ${row.category} ${row.skills}`.toLowerCase();
    const matchedTerms = queryTerms.filter((term) => text.includes(term));
    const sameArea = location && row.location.toLowerCase().includes(location);
    const rating = Number(row.rating) || 0;
    const fitScore = Math.min(99, Math.round((category && row.category.toLowerCase() === category ? 48 : 0) + matchedTerms.length * 11 + (sameArea ? 18 : 0) + (row.availability.toLowerCase().includes('today') ? 9 : 0) + (row.review_count ? Math.min(rating * 2, 10) : 0)));
    const reasons = [];
    if (category && row.category.toLowerCase() === category) reasons.push('Category match');
    if (matchedTerms.length) reasons.push(`Matches ${matchedTerms.slice(0, 2).join(', ')}`);
    if (sameArea) reasons.push('Based in your area');
    if (row.availability.toLowerCase().includes('today')) reasons.push('Available today');
    return {
      id: row.id, name: row.name, headline: row.headline, bio: row.bio, category: row.category,
      skills: JSON.parse(row.skills), mode: row.mode, location: row.location, startingRate: row.starting_rate,
      availability: row.availability, rating: rating || null, reviewCount: row.review_count,
      fitScore, reasons: reasons.slice(0, 3), createdAt: row.created_at
    };
  }).filter((worker) => !queryTerms.length || worker.fitScore > 0)
    .sort((first, second) => second.fitScore - first.fitScore || (second.rating || 0) - (first.rating || 0) || first.name.localeCompare(second.name))
    .slice(0, 30);
}
async function readTasks(requestUrl, user) {
  const q = (requestUrl.searchParams.get('q') || '').trim().toLowerCase();
  const location = (requestUrl.searchParams.get('location') || '').trim().toLowerCase();
  const category = (requestUrl.searchParams.get('category') || '').trim().toLowerCase();
  let rows = await all(`SELECT t.*, u.name AS owner_name, COALESCE(a.application_count, 0) AS application_count
    FROM tasks t JOIN users u ON u.id = t.owner_id
    LEFT JOIN (SELECT task_id, COUNT(*) AS application_count FROM applications WHERE status IN ('pending', 'selected') GROUP BY task_id) a ON a.task_id = t.id
    WHERE t.status = 'open' AND t.starts_at >= $1 ORDER BY t.starts_at ASC, t.created_at DESC LIMIT 200`, [nowIso()]);
  rows = rows.filter((task) => (!q || `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(q))
    && (!location || task.location.toLowerCase().includes(location))
    && (!category || task.category.toLowerCase() === category));
  return rows.map((task) => ({
    id: task.id, title: task.title, description: task.description, category: task.category, location: task.location,
    startsAt: task.starts_at, durationHours: task.duration_hours, payPerPerson: task.pay_per_person,
    workersNeeded: task.workers_needed, applicationCount: task.application_count, ownerName: task.owner_name,
    isOwner: Boolean(user && task.owner_id === user.id), createdAt: task.created_at
  }));
}
function validateStartDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) fail(400, 'Choose a valid date and time.');
  if (date.getTime() < Date.now() - 5 * 60_000) fail(400, 'Choose a future date and time.');
  return date.toISOString();
}
async function dashboardFor(user) {
  const bookings = (await all(`SELECT b.*, c.name AS customer_name, w.name AS worker_name, r.rating AS review_rating
    FROM bookings b JOIN users c ON c.id = b.customer_id JOIN users w ON w.id = b.worker_id
    LEFT JOIN reviews r ON r.booking_id = b.id
    WHERE b.customer_id = $1 OR b.worker_id = $1 ORDER BY b.created_at DESC`, [user.id])).map((booking) => ({
    id: booking.id, customerId: booking.customer_id, workerId: booking.worker_id, customerName: booking.customer_name,
    workerName: booking.worker_name, service: booking.service, details: booking.details, location: booking.location,
    scheduledAt: booking.scheduled_at, proposedPrice: booking.proposed_price, status: booking.status,
    isCustomer: booking.customer_id === user.id, reviewRating: booking.review_rating ?? null, createdAt: booking.created_at
  }));
  const ownedTasks = (await all(`SELECT t.*, COALESCE(a.application_count, 0) AS application_count FROM tasks t
    LEFT JOIN (SELECT task_id, COUNT(*) AS application_count FROM applications WHERE status='pending' GROUP BY task_id) a ON a.task_id=t.id
    WHERE t.owner_id=$1 ORDER BY t.created_at DESC`, [user.id])).map((task) => ({
    id: task.id, title: task.title, description: task.description, category: task.category, location: task.location,
    startsAt: task.starts_at, durationHours: task.duration_hours, payPerPerson: task.pay_per_person,
    workersNeeded: task.workers_needed, applicationCount: task.application_count, status: task.status, isOwner: true, createdAt: task.created_at
  }));
  const applications = (await all(`SELECT a.*, t.title AS task_title, t.location, t.starts_at, t.pay_per_person, t.status AS task_status
    FROM applications a JOIN tasks t ON t.id=a.task_id WHERE a.worker_id=$1 ORDER BY a.created_at DESC`, [user.id])).map((application) => ({
    id: application.id, taskId: application.task_id, taskTitle: application.task_title, location: application.location,
    startsAt: application.starts_at, payPerPerson: application.pay_per_person, status: application.status,
    taskStatus: application.task_status, message: application.message, createdAt: application.created_at
  }));
  return { user: publicUser(user), profile: await readProfile(user.id), bookings, ownedTasks, applications };
}
async function taskApplications(taskId, user) {
  const task = await one('SELECT * FROM tasks WHERE id=$1', [taskId]);
  if (!task) fail(404, 'Task not found.');
  if (task.owner_id !== user.id) fail(403, 'Only the task owner can review applicants.');
  return (await all(`SELECT a.id, a.worker_id AS workerId, a.message, a.status, a.created_at AS createdAt,
    u.name, p.headline, p.category, p.skills, p.mode, p.location,
    COALESCE(r.rating, 0) AS rating, COALESCE(r.review_count, 0) AS review_count
    FROM applications a JOIN users u ON u.id=a.worker_id JOIN profiles p ON p.user_id=a.worker_id
    LEFT JOIN (SELECT worker_id, AVG(rating) AS rating, COUNT(*) AS review_count FROM reviews GROUP BY worker_id) r ON r.worker_id=a.worker_id
    WHERE a.task_id=$1 ORDER BY CASE a.status WHEN 'selected' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, rating DESC, a.created_at ASC`, [taskId])).map((application) => ({
      id: application.id, workerId: application.workerId, name: application.name, headline: application.headline,
      category: application.category, skills: JSON.parse(application.skills), mode: application.mode,
      location: application.location, rating: application.rating || null, reviewCount: application.review_count,
      message: application.message, status: application.status, createdAt: application.createdAt
    }));
}
async function recordApplication(taskId, user, message) {
  const profile = await readProfile(user.id);
  if (!profile || !profile.active) fail(403, 'Create an active worker profile before applying.');
  const task = await one('SELECT * FROM tasks WHERE id=$1', [taskId]);
  if (!task) fail(404, 'Task not found.');
  if (task.status !== 'open') fail(409, 'This task is no longer accepting applications.');
  if (Date.parse(task.starts_at) < Date.now()) fail(409, 'This task has already started.');
  if (task.owner_id === user.id) fail(400, 'You cannot apply to your own task.');
  const applicationId = id();
  try {
    await run('INSERT INTO applications (id, task_id, worker_id, message, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [applicationId, taskId, user.id, requiredText(message, 'Note to the employer', 500, 5), 'pending', nowIso()]);
  } catch (error) {
    if (error.code === '23505' || String(error.message).includes('UNIQUE constraint failed')) fail(409, 'You have already applied to this task.');
    throw error;
  }
  await publish('task.application', { taskId, applicationId, title: task.title, workerName: user.name }, new Set([task.owner_id]));
  return { id: applicationId, taskId, status: 'pending' };
}

async function handleApi(request, response, requestUrl) {
  const method = request.method || 'GET';
  const pathname = requestUrl.pathname.replace(/\/$/, '') || '/';
  if (method !== 'GET' && method !== 'HEAD') assertSameOrigin(request);

  if (pathname === '/api/health' && method === 'GET') {
    if (usePostgres) {
      const checks = await httpSql.transaction([
        httpSql.query('SELECT 1 AS healthy'),
        httpSql.query('SELECT 2 AS connected')
      ], { readOnly: true });
      if (checks[0].rows[0].healthy !== 1 || checks[1].rows[0].connected !== 2) throw new Error('Database health check failed.');
    }
    return sendJson(response, 200, { ok: true, service: 'global-shreni', storage: usePostgres ? 'neon' : 'sqlite' });
  }
  if (pathname === '/api/config' && method === 'GET') {
    return sendJson(response, 200, {
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
      aiEnabled: Boolean(process.env.GEMINI_API_KEY)
    });
  }
  if (pathname === '/api/categories' && method === 'GET') {
    const counts = new Map((await all('SELECT category, COUNT(*) AS count FROM profiles WHERE active=1 GROUP BY category')).map((row) => [row.category.toLowerCase(), Number(row.count)]));
    return sendJson(response, 200, categories.map((category) => ({ ...category, workerCount: counts.get(category.name.toLowerCase()) || 0 })));
  }
  if (pathname === '/api/events' && method === 'GET') {
    const user = await sessionUser(request);
    if (!requestUrl.searchParams.has('after')) {
      const cursor = await one('SELECT COALESCE(MAX(event_id), 0) AS cursor FROM marketplace_events');
      return sendJson(response, 200, { cursor: Number(cursor.cursor), events: [] });
    }
    const after = Math.max(0, Number.parseInt(requestUrl.searchParams.get('after') || '0', 10) || 0);
    const events = await all(`SELECT event_id, event_name, payload, created_at FROM marketplace_events
      WHERE event_id > $1 AND (user_id = $2 OR user_id IS NULL) ORDER BY event_id LIMIT 100`, [after, user?.id || null]);
    return sendJson(response, 200, { events: events.map((event) => ({
      id: Number(event.event_id), name: event.event_name, payload: JSON.parse(event.payload), createdAt: event.created_at
    })) });
  }
  if (pathname === '/api/me' && method === 'GET') {
    const user = await sessionUser(request);
    return sendJson(response, 200, { user: publicUser(user), profile: user ? await readProfile(user.id) : null });
  }
  if (pathname === '/api/auth/register' && method === 'POST') {
    checkRateLimit(request, 'register', 5, 15 * 60_000);
    const input = await readJson(request);
    const user = await createUser(input);
    await issueSession(response, user);
    await publish('account.created', { user: publicUser(user) }, new Set([user.id]));
    return sendJson(response, 201, { user: publicUser(user), profile: await readProfile(user.id) });
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    checkRateLimit(request, 'login', 10, 15 * 60_000);
    const input = await readJson(request);
    const email = requiredText(input.email, 'Email', 254).toLowerCase();
    const password = typeof input.password === 'string' ? input.password : '';
    const user = await one('SELECT * FROM users WHERE email=$1', [email]);
    const salt = user ? Buffer.from(user.password_salt, 'hex') : Buffer.alloc(16);
    const expected = user ? Buffer.from(user.password_hash, 'hex') : Buffer.alloc(64);
    const supplied = crypto.scryptSync(password.slice(0, 128), salt, 64);
    if (!user || !crypto.timingSafeEqual(expected, supplied)) {
      fail(401, 'Email or password is incorrect. Accounts created on localhost are separate from the live site; create a live account if you have not signed up here yet.');
    }
    await issueSession(response, user);
    return sendJson(response, 200, { user: publicUser(user), profile: await readProfile(user.id) });
  }
  if (pathname === '/api/auth/google' && method === 'POST') {
    checkRateLimit(request, 'google-login', 10, 15 * 60_000);
    if (!process.env.GOOGLE_CLIENT_ID) fail(503, 'Google sign-in is not configured yet.');
    const input = await readJson(request, 12_000);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Google sign-in could not read this request.');
    const credential = requiredText(input.credential, 'Google credential', 10_000);
    let claims;
    try {
      const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      claims = ticket.getPayload();
    } catch {
      fail(401, 'Google could not verify this sign-in. Please try again.');
    }
    if (!claims?.sub || !claims.email || claims.email_verified !== true) fail(401, 'Use a verified Google account to continue.');
    const email = claims.email.toLowerCase();
    let user = await one('SELECT * FROM users WHERE google_sub=$1', [claims.sub]);
    if (!user) {
      const emailUser = await one('SELECT * FROM users WHERE email=$1', [email]);
      if (emailUser?.google_sub && emailUser.google_sub !== claims.sub) fail(409, 'This email is already linked to a different Google account.');
      if (emailUser) {
        await run('UPDATE users SET google_sub=$1 WHERE id=$2', [claims.sub, emailUser.id]);
        user = await one('SELECT * FROM users WHERE id=$1', [emailUser.id]);
      } else {
        const salt = crypto.randomBytes(16).toString('hex');
        const generatedPassword = crypto.randomBytes(48).toString('hex');
        const passwordHash = crypto.scryptSync(generatedPassword, salt, 64).toString('hex');
        const accountType = ['customer', 'worker', 'both'].includes(input.accountType) ? input.accountType : 'customer';
        const newUser = {
          id: id(),
          name: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim().slice(0, 80) : 'Shreni member',
          email,
          password_salt: salt,
          password_hash: passwordHash,
          account_type: accountType,
          created_at: nowIso(),
          google_sub: claims.sub
        };
        const profile = ['worker', 'both'].includes(accountType) ? validateProfile(input.profile || {}, newUser.id, newUser.created_at) : null;
        try {
          const insertUser = 'INSERT INTO users (id, name, email, password_salt, password_hash, account_type, created_at, google_sub) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
          const userValues = [newUser.id, newUser.name, newUser.email, newUser.password_salt, newUser.password_hash, newUser.account_type, newUser.created_at, newUser.google_sub];
          if (usePostgres) {
            const queries = [httpSql.query(insertUser, userValues)];
            if (profile) queries.push(saveProfile(profile));
            await httpSql.transaction(queries);
          } else {
            await withTransaction(async (connection) => {
              await run(insertUser, userValues, connection);
              if (profile) await saveProfile(profile, connection);
            });
          }
          user = newUser;
        } catch (error) {
          user = await one('SELECT * FROM users WHERE google_sub=$1', [claims.sub]);
          if (!user) throw error;
        }
      }
    }
    await issueSession(response, user);
    return sendJson(response, 200, { user: publicUser(user), profile: await readProfile(user.id) });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = getCookie(request, 'shreni_session');
    if (token) await run('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
    clearSessionCookie(response);
    return sendJson(response, 200, { ok: true });
  }
  if (pathname === '/api/chat' && method === 'POST') {
    checkRateLimit(request, 'chat', 12, 10 * 60_000);
    if (!process.env.GEMINI_API_KEY) fail(503, 'The Shreni assistant is not connected yet. Please try again later.');
    const input = await readJson(request, 20_000);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Chat message could not be read.');
    const message = requiredText(input.message, 'Message', 800);
    await checkDailyChatQuota(request);
    const history = Array.isArray(input.history) ? input.history.slice(-10) : [];
    const contents = history.map((item) => {
      if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') fail(400, 'Chat history could not be read.');
      return { role: item.role, parts: [{ text: requiredText(item.text, 'Chat message', 1200) }] };
    });
    contents.push({ role: 'user', parts: [{ text: message }] });
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    let aiResponse;
    try {
      aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `You are the friendly Shreni Guide for Global Shreni, an Indian marketplace for local artisans, freelancers, skilled professionals, and people seeking short-duration or general-task work. Help people understand how to find or offer services, book a worker, post a short-day guild contract, apply to work, and use the marketplace safely. The employer always chooses the worker; explain that Shreni recommendations are guidance, not guarantees. Do not claim to see live listings, user accounts, or booking status. Never ask for passwords, OTPs, payment card details, or sensitive personal information. Keep answers practical, warm, concise, and in the user's language when possible. For emergencies, legal/medical/financial disputes, or safety-critical trade advice, recommend contacting a qualified local professional or emergency service. This is an AI helper, so users should verify important information.` }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
        }),
        signal: AbortSignal.timeout(15_000)
      });
    } catch {
      fail(502, 'The assistant is taking a break. Please try again shortly.');
    }
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) fail(429, 'The free assistant is busy right now. Please try again in a little while.');
      process.stderr.write(`[shreni] Gemini request failed with status ${aiResponse.status}.\n`);
      fail(502, 'The assistant could not answer just now. Please try again shortly.');
    }
    const result = await aiResponse.json();
    const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!answer) fail(502, 'The assistant could not answer just now. Please try again shortly.');
    return sendJson(response, 200, { answer });
  }
  if (pathname === '/api/workers' && method === 'GET') {
    const workers = await renderWorkerRows(requestUrl);
    return sendJson(response, 200, { workers, total: workers.length });
  }
  if (pathname === '/api/tasks' && method === 'GET') {
    const user = await sessionUser(request);
    return sendJson(response, 200, { tasks: await readTasks(requestUrl, user) });
  }
  if (pathname === '/api/tasks' && method === 'POST') {
    const user = await requireUser(request);
    checkRateLimit(request, 'task-post', 12, 60 * 60_000);
    const input = await readJson(request);
    const title = requiredText(input.title, 'Task title', 100);
    const description = requiredText(input.description, 'Task details', 1200, 10);
    const category = requiredText(input.category, 'Category', 80);
    if (!categoryNames.has(category.toLowerCase())) fail(400, 'Choose a category from the list.');
    const location = requiredText(input.location, 'Work location', 100);
    const startsAt = validateStartDate(input.startsAt);
    const durationHours = wholeNumber(input.durationHours, 'Hours', 1, 240);
    const payPerPerson = wholeNumber(input.payPerPerson, 'Pay per person', 100, 1_000_000);
    const workersNeeded = wholeNumber(input.workersNeeded || 1, 'Number of workers', 1, 100);
    const taskId = id();
    const createdAt = nowIso();
    await run(`INSERT INTO tasks (id, owner_id, title, description, category, location, starts_at, duration_hours, pay_per_person, workers_needed, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', $11)`,
    [taskId, user.id, title, description, category, location, startsAt, durationHours, payPerPerson, workersNeeded, createdAt]);
    const task = (await readTasks(new URL('http://localhost/api/tasks'), user)).find((item) => item.id === taskId);
    await publish('task.created', { task }, null);
    return sendJson(response, 201, { task });
  }

  const taskApplicationsMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/applications$/);
  if (taskApplicationsMatch && method === 'GET') {
    return sendJson(response, 200, { applications: await taskApplications(decodeURIComponent(taskApplicationsMatch[1]), await requireUser(request)) });
  }
  const taskApplyMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/apply$/);
  if (taskApplyMatch && method === 'POST') {
    const input = await readJson(request);
    const result = await recordApplication(decodeURIComponent(taskApplyMatch[1]), await requireUser(request), input.message);
    return sendJson(response, 201, { application: result });
  }
  const taskSelectMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/select$/);
  if (taskSelectMatch && method === 'POST') {
    const user = await requireUser(request);
    const taskId = decodeURIComponent(taskSelectMatch[1]);
    const input = await readJson(request);
    const task = await one('SELECT * FROM tasks WHERE id=$1', [taskId]);
    if (!task) fail(404, 'Task not found.');
    if (task.owner_id !== user.id) fail(403, 'Only the task owner can choose a worker.');
    if (task.status !== 'open') fail(409, 'This task has already been filled or closed.');
    if (Date.parse(task.starts_at) < Date.now()) fail(409, 'This task has already started.');
    const application = await one('SELECT a.*, p.location FROM applications a JOIN profiles p ON p.user_id=a.worker_id WHERE a.id=$1 AND a.task_id=$2', [input.applicationId, taskId]);
    if (!application || application.status !== 'pending') fail(404, 'This application is no longer available.');
    let nextStatus;
    if (usePostgres) {
      const transactionResults = await httpSql.transaction([
        httpSql.query("SELECT id FROM tasks WHERE id=$1 AND owner_id=$2 AND status='open' AND starts_at >= $3 FOR UPDATE", [taskId, user.id, nowIso()]),
        httpSql.query("SELECT id FROM applications WHERE id=$1 AND task_id=$2 AND status='pending' FOR UPDATE", [application.id, taskId]),
        httpSql.query(`UPDATE applications SET status='selected' WHERE id=$1 AND task_id=$2 AND status='pending'
          AND EXISTS (SELECT 1 FROM tasks WHERE id=$2 AND owner_id=$3 AND status='open' AND starts_at >= $4)`, [application.id, taskId, user.id, nowIso()]),
        httpSql.query(`UPDATE tasks SET status=CASE WHEN
          (SELECT COUNT(*) FROM applications WHERE task_id=$1 AND status='selected') >= workers_needed THEN 'filled' ELSE 'open' END
          WHERE id=$1 AND owner_id=$2 AND status='open'
          AND EXISTS (SELECT 1 FROM applications WHERE id=$3 AND task_id=$1 AND status='selected') RETURNING status`, [taskId, user.id, application.id]),
        httpSql.query(`UPDATE applications SET status='declined' WHERE task_id=$1 AND status='pending'
          AND EXISTS (SELECT 1 FROM tasks WHERE id=$1 AND status='filled')`, [taskId])
      ]);
      if (transactionResults[2].rowCount !== 1 || !transactionResults[3].rows[0]) fail(409, 'This application is no longer available.');
      nextStatus = transactionResults[3].rows[0].status;
    } else {
      await withTransaction(async (connection) => {
        const currentTask = await one('SELECT * FROM tasks WHERE id=$1', [taskId], connection);
        if (!currentTask || currentTask.status !== 'open') fail(409, 'This task has already been filled or closed.');
        if (Date.parse(currentTask.starts_at) < Date.now()) fail(409, 'This task has already started.');
        const currentApplication = await one('SELECT status FROM applications WHERE id=$1 AND task_id=$2', [application.id, taskId], connection);
        if (!currentApplication || currentApplication.status !== 'pending') fail(404, 'This application is no longer available.');
        await run("UPDATE applications SET status='selected' WHERE id=$1", [application.id], connection);
        const selectedCount = Number((await one("SELECT COUNT(*) AS count FROM applications WHERE task_id=$1 AND status='selected'", [taskId], connection)).count);
        nextStatus = selectedCount >= currentTask.workers_needed ? 'filled' : 'open';
        await run('UPDATE tasks SET status=$1 WHERE id=$2', [nextStatus, taskId], connection);
        if (nextStatus === 'filled') await run("UPDATE applications SET status='declined' WHERE task_id=$1 AND status='pending'", [taskId], connection);
      });
    }
    await publish('task.selected', { taskId, title: task.title, workerId: application.worker_id }, new Set([user.id, application.worker_id]));
    return sendJson(response, 200, { taskId, applicationId: application.id, status: 'selected' });
  }

  if (pathname === '/api/profile' && method === 'PUT') {
    const user = await requireUser(request);
    const input = await readJson(request);
    const profile = validateProfile(input, user.id);
    const name = requiredText(input.name || user.name, 'Name', 80, 2);
    const updateUserQuery = "UPDATE users SET name=$1, account_type=CASE WHEN account_type='customer' THEN 'both' ELSE account_type END WHERE id=$2";
    if (usePostgres) {
      await httpSql.transaction([httpSql.query(updateUserQuery, [name, user.id]), saveProfile(profile)]);
    } else {
      await withTransaction(async (connection) => {
        await run(updateUserQuery, [name, user.id], connection);
        await saveProfile(profile, connection);
      });
    }
    await publish('profile.updated', { userId: user.id }, new Set([user.id]));
    return sendJson(response, 200, { user: publicUser({ ...user, name }), profile: await readProfile(user.id) });
  }
  if (pathname === '/api/bookings' && method === 'POST') {
    const user = await requireUser(request);
    checkRateLimit(request, 'booking', 30, 60 * 60_000);
    const input = await readJson(request);
    const workerId = requiredText(input.workerId, 'Worker', 80);
    if (workerId === user.id) fail(400, 'Choose another worker for this booking.');
    const worker = await one('SELECT u.id, u.name, p.starting_rate FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1 AND p.active=1', [workerId]);
    if (!worker) fail(404, 'This worker profile is no longer available.');
    const service = requiredText(input.service, 'Service', 100);
    const details = requiredText(input.details, 'Work details', 1200, 5);
    const location = requiredText(input.location, 'Location', 100);
    const scheduledAt = validateStartDate(input.scheduledAt);
    const bookingId = id();
    const createdAt = nowIso();
    const proposedPrice = wholeNumber(input.proposedPrice ?? worker.starting_rate, 'Proposed price', 0, 1_000_000);
    await run(`INSERT INTO bookings (id, customer_id, worker_id, service, details, location, scheduled_at, proposed_price, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'requested', $9, $10)`,
    [bookingId, user.id, worker.id, service, details, location, scheduledAt, proposedPrice, createdAt, createdAt]);
    await publish('booking.created', { bookingId, service, customerName: user.name }, new Set([user.id, worker.id]));
    return sendJson(response, 201, { booking: { id: bookingId, workerName: worker.name, service, location, scheduledAt, proposedPrice, status: 'requested' } });
  }
  if (pathname === '/api/bookings' && method === 'GET') {
    const user = await requireUser(request);
    const bookings = (await dashboardFor(user)).bookings;
    return sendJson(response, 200, { bookings });
  }
  const bookingStatusMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/status$/);
  if (bookingStatusMatch && method === 'POST') {
    const user = await requireUser(request);
    const bookingId = decodeURIComponent(bookingStatusMatch[1]);
    const input = await readJson(request);
    const booking = await one('SELECT * FROM bookings WHERE id=$1', [bookingId]);
    if (!booking) fail(404, 'Booking not found.');
    const status = input.status;
    const isProvider = booking.worker_id === user.id;
    const isCustomer = booking.customer_id === user.id;
    const allowed = (isProvider && booking.status === 'requested' && ['accepted', 'declined'].includes(status))
      || (isCustomer && booking.status === 'accepted' && ['completed', 'cancelled'].includes(status))
      || (isCustomer && booking.status === 'requested' && status === 'cancelled');
    if (!allowed) fail(403, 'This booking cannot be updated by your account.');
    const updatedAt = nowIso();
    await run('UPDATE bookings SET status=$1, updated_at=$2 WHERE id=$3', [status, updatedAt, bookingId]);
    await publish('booking.updated', { bookingId, status, service: booking.service }, new Set([booking.customer_id, booking.worker_id]));
    return sendJson(response, 200, { bookingId, status, updatedAt });
  }
  const reviewMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/review$/);
  if (reviewMatch && method === 'POST') {
    const user = await requireUser(request);
    const bookingId = decodeURIComponent(reviewMatch[1]);
    const input = await readJson(request);
    const booking = await one('SELECT * FROM bookings WHERE id=$1', [bookingId]);
    if (!booking) fail(404, 'Booking not found.');
    if (booking.customer_id !== user.id || booking.status !== 'completed') fail(403, 'Reviews are available after you complete a booking.');
    const rating = wholeNumber(input.rating, 'Rating', 1, 5);
    const comment = requiredText(input.comment || '', 'Review', 500, 0);
    try {
      await run('INSERT INTO reviews (id, booking_id, author_id, worker_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id(), bookingId, user.id, booking.worker_id, rating, comment, nowIso()]);
    } catch (error) {
      if (error.code === '23505' || String(error.message).includes('UNIQUE constraint failed')) fail(409, 'You already reviewed this booking.');
      throw error;
    }
    await publish('review.created', { bookingId, workerId: booking.worker_id, rating }, new Set([user.id, booking.worker_id]));
    return sendJson(response, 201, { ok: true });
  }
  if (pathname === '/api/dashboard' && method === 'GET') {
    const user = await requireUser(request);
    return sendJson(response, 200, await dashboardFor(user));
  }
  fail(404, 'That marketplace action was not found.');
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; connect-src 'self' https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
}
function serveStatic(request, response, pathname) {
  const entry = safeFiles.get(pathname);
  if (!entry) return false;
  const [file, contentType] = entry;
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) return false;
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': pathname === '/' ? 'no-cache' : 'public, max-age=300' });
  if (request.method === 'HEAD') return response.end(), true;
  fs.createReadStream(filePath).pipe(response);
  return true;
}

async function handler(request, response) {
  setSecurityHeaders(response);
  try {
    await databaseReady;
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (requestUrl.pathname.startsWith('/api/')) return await handleApi(request, response, requestUrl);
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (serveStatic(request, response, requestUrl.pathname)) return;
    }
    sendJson(response, 404, { error: 'Page not found.' });
  } catch (error) {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) process.stderr.write(`[shreni] ${error.stack || error.message}\n`);
    sendJson(response, status, { error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
  }
}

module.exports = handler;

if (require.main === module) {
  const server = http.createServer(handler);
  const port = wholeNumber(process.env.PORT || 3000, 'PORT', 1, 65_535);
  const host = process.env.HOST || '127.0.0.1';
  server.listen(port, host, () => process.stdout.write(`Global Shreni is available at http://${host}:${port}\n`));
  const cleanup = setInterval(() => {
    run('DELETE FROM sessions WHERE expires_at <= $1', [nowIso()]).catch((error) => process.stderr.write(`[shreni] ${error.message}\n`));
    for (const [key, value] of rateLimits) if (value.resetAt <= Date.now()) rateLimits.delete(key);
  }, 60 * 60_000).unref();
  function shutdown() {
    clearInterval(cleanup);
    server.close(async () => {
      if (!usePostgres) database.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
