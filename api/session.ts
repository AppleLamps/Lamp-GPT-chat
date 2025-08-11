import { getSql } from '../lib/db';
import { json } from './_utils';

export default async function handler(req, res) {
  try {
    const sql = getSql();
    const cookie = req.headers.cookie || '';
    let token = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];

    let userId: number | null = null;

    if (token) {
      const rows = await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(token)} AND (expires_at IS NULL OR expires_at > now())`;
      userId = rows[0]?.user_id || null;
    }

    // If no valid session, auto-create a temporary dev session (development only)
    if (!userId && process.env.NODE_ENV !== 'production') {
      // Ensure a guest user exists (username 'guest')
      const guestRows = await sql`SELECT id FROM users WHERE username = 'guest' LIMIT 1`;
      if (guestRows.length > 0) {
        userId = guestRows[0].id;
      } else {
        const created = await sql`INSERT INTO users (username, email, password_hash) VALUES ('guest', 'guest@dev.local', 'dev') RETURNING id`;
        userId = created[0].id;
      }

      // Create a session token
      token = 'dev-' + Math.random().toString(36).slice(2);
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year
      await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expires.toISOString()})`;
      // Set cookie so subsequent requests use it
      res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`);
    }

    return json(req, res, 200, { userId });
  } catch (error) {
    return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}


