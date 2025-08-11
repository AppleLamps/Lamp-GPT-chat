import { getSql } from '../lib/db';
import { json, readJson } from './_utils';
import { encrypt, decrypt } from '../lib/crypto';

// Stores per-user provider API keys securely (encrypted at rest)
// Table suggestion:
// CREATE TABLE IF NOT EXISTS user_api_keys (
//   id SERIAL PRIMARY KEY,
//   user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
//   provider VARCHAR(64) NOT NULL,
//   secret_encrypted TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT now(),
//   UNIQUE(user_id, provider)
// );

export default async function handler(req, res) {
  const sql = getSql();

  const cookie = req.headers.cookie || '';
  const session = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];
  let me: number | null = null;
  if (session) {
    const rows = await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(session)} AND (expires_at IS NULL OR expires_at > now())`;
    me = rows[0]?.user_id || null;
  }

  if (req.method === 'POST') {
    const body = await readJson<{ userId?: number | 'me'; provider: string; secret: string }>(req);
    let { userId, provider, secret } = body as any;
    if (userId === 'me') userId = me || 0;
    if (!userId || !provider || !secret) return json(req, res, 400, { error: 'userId, provider, secret required' });
    const secret_encrypted = encrypt(secret);
    try {
      const rows = await sql`INSERT INTO user_api_keys (user_id, provider, secret_encrypted)
        VALUES (${userId}, ${provider}, ${secret_encrypted})
        ON CONFLICT (user_id, provider) DO UPDATE SET secret_encrypted = EXCLUDED.secret_encrypted
        RETURNING id, user_id, provider, created_at`;
      return json(req, res, 200, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'GET') {
    const userParam = String(req.query.userId || '');
    const userId = userParam === 'me' ? (me || 0) : Number(userParam);
    const provider = String(req.query.provider || '');
    if (!userId || !provider) return json(req, res, 400, { error: 'userId and provider required' });
    try {
      const rows = await sql`SELECT secret_encrypted FROM user_api_keys WHERE user_id = ${userId} AND provider = ${provider}`;
      if (!rows[0]) return json(req, res, 404, { error: 'Not found' });
      const secret = decrypt(rows[0].secret_encrypted);
      return json(req, res, 200, { userId, provider, secret });
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


