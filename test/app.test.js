const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { after, before, test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
let tempDirectory;
let databasePath;
let serverProcess;
let baseUrl;
let serverError = '';

async function reservePort() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer() {
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const environment = {
    ...process.env,
    DATABASE_PATH: databasePath,
    HOST: '127.0.0.1',
    NODE_ENV: 'test',
    PORT: String(port)
  };
  for (const name of ['DATABASE_URL', 'VERCEL', 'GEMINI_API_KEY', 'GOOGLE_CLIENT_ID', 'VERCEL_OIDC_TOKEN']) delete environment[name];
  serverError = '';
  serverProcess = spawn(process.execPath, ['server.js'], { cwd: projectRoot, env: environment, stdio: ['ignore', 'ignore', 'pipe'] });
  serverProcess.stderr.setEncoding('utf8');
  serverProcess.stderr.on('data', (chunk) => { serverError += chunk; });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (serverProcess.exitCode !== null) throw new Error(`Test server stopped: ${serverError}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Test server did not become ready: ${serverError}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const processToStop = serverProcess;
  const exited = once(processToStop, 'exit');
  processToStop.kill();
  await exited;
  serverProcess = null;
}

async function api(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json', Origin: baseUrl } : {})
    }
  });
}

before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'global-shreni-test-'));
  databasePath = path.join(tempDirectory, 'legacy.sqlite');
  const legacyDatabase = new DatabaseSync(databasePath);
  legacyDatabase.exec(`CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('customer', 'worker', 'both')),
    created_at TEXT NOT NULL
  )`);
  legacyDatabase.close();
  await startServer();
});

after(async () => {
  await stopServer();
  if (databasePath && fs.existsSync(databasePath)) {
    const database = new DatabaseSync(databasePath, { readOnly: true });
    const columns = database.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
    const usageTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_usage'").get();
    database.close();
    assert.ok(columns.includes('google_sub'));
    assert.ok(usageTable);
  }
  if (tempDirectory) {
    const tempRoot = path.resolve(os.tmpdir());
    const tempTarget = path.resolve(tempDirectory);
    if (!tempTarget.startsWith(`${tempRoot}${path.sep}`)) throw new Error('Refusing to clean a test path outside the temporary directory.');
    fs.rmSync(tempTarget, { recursive: true, force: true });
  }
});

test('password sign-up, sign-in, session persistence, provider setup, and chat limits work', async () => {
  const health = await api('/api/health');
  assert.deepEqual(await health.json(), { ok: true, service: 'global-shreni', storage: 'sqlite' });

  const registration = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Customer',
      email: 'test@example.com',
      password: 'A-long-test-password-42',
      accountType: 'customer'
    })
  });
  assert.equal(registration.status, 201);
  const user = (await registration.json()).user;
  const cookieHeader = registration.headers.get('set-cookie');
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Lax/i);
  const cookie = cookieHeader.split(';')[0];

  const signedIn = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'TEST@example.com', password: 'A-long-test-password-42' })
  });
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).user.id, user.id);

  const badPassword = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com', password: 'incorrect-password' })
  });
  assert.equal(badPassword.status, 401);
  assert.match((await badPassword.json()).error, /localhost/i);

  await stopServer();
  await startServer();
  const restoredSession = await api('/api/me', { headers: { Cookie: cookie } });
  assert.equal((await restoredSession.json()).user.id, user.id);

  const config = await api('/api/config');
  assert.deepEqual(await config.json(), { googleClientId: null, aiEnabled: false });

  const googleSignIn = await api('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential: 'not-configured' })
  });
  assert.equal(googleSignIn.status, 503);

  const chat = await api('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'How do I find a worker?' })
  });
  assert.equal(chat.status, 503);
});
