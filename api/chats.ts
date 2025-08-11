import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  // Get authenticated user once for both GET and POST
  const cookie = req.headers.cookie || '';
  const session = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];
  const meRow = session ? await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(session)} AND (expires_at IS NULL OR expires_at > now())` : [];
  const me = meRow[0]?.user_id || null;

  if (req.method === 'POST') {
    const body = await readJson<{ userId: number | 'me'; title?: string }>(req);
    let { userId, title } = body;
    if (userId === 'me') {
      if (!me) return json(req, res, 401, { error: 'Not authenticated' });
      userId = me;
    }
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    try {
      const rows = await sql`INSERT INTO chats (user_id, title) VALUES (${userId}, ${title || null}) RETURNING id, user_id, title, created_at, updated_at`;
      return json(req, res, 201, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'GET') {

    const param = String(req.query.userId || '');
    const userId = param === 'me' ? (me || 0) : Number(param);
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    if (param === 'me' && !me) return json(req, res, 401, { error: 'Not authenticated' });
    try {
      const rows = await sql`SELECT id, user_id, title, created_at, updated_at FROM chats WHERE user_id = ${userId} ORDER BY updated_at DESC`;
      return json(req, res, 200, rows);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


