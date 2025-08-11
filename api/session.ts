import { getSql } from '../lib/db';
import { json } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();
  const cookie = req.headers.cookie || '';
  const token = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];
  if (!token) return json(req, res, 200, { userId: null });
  const rows = await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(token)} AND (expires_at IS NULL OR expires_at > now())`;
  return json(req, res, 200, { userId: rows[0]?.user_id || null });
}


