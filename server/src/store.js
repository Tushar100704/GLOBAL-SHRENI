import pg from 'pg';
import { seedData } from './seedData.js';

const { Pool } = pg;

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let pool = null;
let initialized = false;
let stateCache = null;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getPool() {
  if (!pool) {
    if (!connectionString) {
      throw new Error(
        'No Postgres connection string found. Set POSTGRES_URL or DATABASE_URL.'
      );
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=') ? undefined : { rejectUnauthorized: false },
    });
  }

  return pool;
}

async function ensureTable() {
  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS global_shreni_store (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function ensureStoreRow() {
  await ensureTable();
  const client = getPool();
  const result = await client.query(
    'SELECT data FROM global_shreni_store WHERE id = 1'
  );

  if (result.rows.length > 0) {
    stateCache = result.rows[0].data;
  } else {
    stateCache = deepClone(seedData);
    await client.query(
      'INSERT INTO global_shreni_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING',
      [stateCache]
    );
  }

  initialized = true;
}

export async function getStore() {
  if (!initialized) {
    await ensureStoreRow();
  }

  return stateCache;
}

export async function saveStore() {
  if (!initialized) {
    await ensureStoreRow();
  }

  const client = getPool();
  await client.query(
    `INSERT INTO global_shreni_store (id, data, updated_at)
     VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
    [stateCache]
  );
}
