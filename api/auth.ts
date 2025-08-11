import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  // Initialize database connection inside try/catch so we can gracefully
  // handle missing DATABASE_URL or connection errors in production (e.g. Vercel)
  let sql: ReturnType<typeof getSql>;

  if (req.method === 'POST') {
    const body = await readJson<{ action: 'signup' | 'signin'; email: string; password: string }>(req);
    const { action, email, password } = body;
    if (!action || !email || !password) return json(req, res, 400, { error: 'action, email, password required' });

    try {
      // Database connection may throw if env vars are missing – catch and return JSON instead of a plain 500 text response
      sql = getSql();
      if (action === 'signup') {
        const hash = await bcrypt.hash(password, 10);
        // If account exists, return 409
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing[0]) return json(req, res, 409, { error: 'Email already in use' });
        const rows = await sql`INSERT INTO users (email, username, password_hash) VALUES (${email}, ${email}, ${hash}) RETURNING id, email`;
        const token = crypto.randomBytes(24).toString('hex');
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
        await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${rows[0].id}, ${expires.toISOString()})`;
        res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
        return json(req, res, 201, rows[0]);
      } else {
        const rows = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email}`;
        if (!rows[0]) return json(req, res, 401, { error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, rows[0].password_hash);
        if (!ok) return json(req, res, 401, { error: 'Invalid credentials' });
        const token = crypto.randomBytes(24).toString('hex');
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${rows[0].id}, ${expires.toISOString()})`;
        res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
        return json(req, res, 200, { id: rows[0].id, email: rows[0].email });
      }
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  res.setHeader('Allow', 'POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


