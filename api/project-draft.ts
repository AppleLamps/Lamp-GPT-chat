import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  if (req.method === 'GET') {
    const cookie = req.headers.cookie || '';
    const session = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];
    const meRow = session ? await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(session)} AND (expires_at IS NULL OR expires_at > now())` : [];
    const me = meRow[0]?.user_id || null;

    const param = String(req.query.userId || '');
    const userId = param === 'me' ? (me || 0) : Number(param);
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    const rows = await sql`SELECT draft_project FROM user_settings WHERE user_id = ${userId}`;
    return json(req, res, 200, rows[0]?.draft_project || null);
  }

  if (req.method === 'POST') {
    const body = await readJson<{ userId: number; draft: any }>(req);
    const { userId, draft } = body;
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    await sql`INSERT INTO user_settings (user_id, draft_project) VALUES (${userId}, ${JSON.stringify(draft)}::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET draft_project = EXCLUDED.draft_project, updated_at = now()`;
    return json(req, res, 200, { ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


