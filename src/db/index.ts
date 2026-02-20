import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const url =
  process.env.TURSO_DATABASE_URL ??
  `file:${path.join(process.cwd(), 'data', 'fitness.db')}`;

const authToken = process.env.TURSO_AUTH_TOKEN;

// Ensure data directory exists for local file-based SQLite
if (url.startsWith('file:')) {
  const dbPath = url.slice(5);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export type DB = typeof db;
