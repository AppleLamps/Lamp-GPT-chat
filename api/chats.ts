import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  if (req.method === 'POST') {
    const body = await readJson<{ userId: number; title?: string }>(req);
    const { userId, title } = body;
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    try {
      const rows = await sql`INSERT INTO chats (user_id, title) VALUES (${userId}, ${title || null}) RETURNING id, user_id, title, created_at, updated_at`;
      return json(req, res, 201, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'GET') {
    const userId = Number(req.query.userId);
    if (!userId) return json(req, res, 400, { error: 'userId required' });
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


