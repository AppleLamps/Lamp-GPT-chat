import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('Missing DATABASE_URL/POSTGRES_URL');
  const sql = neon(url);

  // Users: ensure email column and unique index exist
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`;
  await sql`DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_uidx'
    ) THEN
      CREATE UNIQUE INDEX users_email_uidx ON users(email);
    END IF;
  END $$;`;

  // Sessions
  await sql`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
  );`;

  await sql`CREATE TABLE IF NOT EXISTS user_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    secret_encrypted TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, provider)
  );`;

  // Projects must exist before user_settings due to FK
  await sql`CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    model_temperature DOUBLE PRECISION DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 8192,
    current_model TEXT DEFAULT 'x-ai/grok-4',
    theme TEXT DEFAULT 'system',
    draft_project JSONB,
    active_project_id INTEGER REFERENCES projects(id),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS project_history (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    snapshot JSONB,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );`;

  console.log('Schema updated.');
}

main().catch((e) => { console.error(e); process.exit(1); });


