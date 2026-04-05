import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const storeFile = path.resolve(dataDir, 'store.json');

let initialized = false;
let stateCache = null;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    const raw = await fs.readFile(storeFile, 'utf8');
    stateCache = JSON.parse(raw);
  } catch {
    stateCache = deepClone(seedData);
    await fs.writeFile(storeFile, JSON.stringify(stateCache, null, 2), 'utf8');
  }

  initialized = true;
}

export async function getStore() {
  if (!initialized) {
    await ensureStoreFile();
  }

  return stateCache;
}

export async function saveStore() {
  if (!initialized) {
    await ensureStoreFile();
  }

  await fs.writeFile(storeFile, JSON.stringify(stateCache, null, 2), 'utf8');
}

export { storeFile };
