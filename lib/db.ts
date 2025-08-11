import { neon } from '@neondatabase/serverless';

let cachedSql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (cachedSql) return cachedSql;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    // Do not crash at import time; let callers handle missing configuration
    throw new Error('Missing DATABASE_URL or POSTGRES_URL environment variable');
  }
  cachedSql = neon(connectionString);
  return cachedSql;
}


