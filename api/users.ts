import bcrypt from 'bcryptjs';
import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  if (req.method === 'POST') {
    const body = await readJson<{ username: string; password: string }>(req);
    const { username, password } = body;
    if (!username || !password) return json(req, res, 400, { error: 'username and password required' });
    const password_hash = await bcrypt.hash(password, 10);
    try {
      const rows = await sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${password_hash}) RETURNING id, username, created_at`;
      return json(req, res, 201, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT id, username, created_at FROM users ORDER BY id DESC LIMIT 50`;
      return json(req, res, 200, rows);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


