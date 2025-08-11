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

  // --- Enforce foreign key cascades & NOT NULL constraints on existing tables ---

  // Chats → Users
  await sql`ALTER TABLE chats ALTER COLUMN user_id SET NOT NULL`;
  // Replace existing FK (if any) with ON DELETE CASCADE
  await sql`ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey`;
  await sql`ALTER TABLE chats DROP CONSTRAINT IF EXISTS fk_user`;
  await sql`ALTER TABLE chats ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`;

  // Messages → Chats
  await sql`ALTER TABLE messages ALTER COLUMN chat_id SET NOT NULL`;
  await sql`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey`;
  await sql`ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_chat`;
  await sql`ALTER TABLE messages ADD CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE`;

  // Projects.user_id MUST be present
  await sql`ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL`;

  // Project history must reference a project
  await sql`ALTER TABLE project_history ALTER COLUMN project_id SET NOT NULL`;

  // Sessions.user_id cannot be null
  await sql`ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL`;

  // User API Keys foreign key non-null
  await sql`ALTER TABLE user_api_keys ALTER COLUMN user_id SET NOT NULL`;

  // project_history table already ensured at top of file (or in earlier migrations)

  // Ensure users.username is unique
  await sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_username_uidx') THEN
      CREATE UNIQUE INDEX users_username_uidx ON users(username);
    END IF;
  END $$;`;

  // Ensure sessions.token is unique
  await sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_token_uidx') THEN
      CREATE UNIQUE INDEX sessions_token_uidx ON sessions(token);
    END IF;
  END $$;`;

  // Make sure users.email cannot be NULL
  await sql`ALTER TABLE users ALTER COLUMN email SET NOT NULL`;

  // Indexes for foreign keys
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON project_history(project_id);`;

  console.log('Schema updated.');
}

main().catch((e) => { console.error(e); process.exit(1); });


