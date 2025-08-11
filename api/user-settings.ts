import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  const cookie = req.headers.cookie || '';
  const session = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];
  let me: number | null = null;
  if (session) {
    const row = await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(session)} AND (expires_at IS NULL OR expires_at > now())`;
    me = row[0]?.user_id || null;
  }

  if (req.method === 'GET') {
    const param = String(req.query.userId || '');
    const userId = param === 'me' ? (me || 0) : Number(param);
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    try {
      const rows = await sql`SELECT model_temperature, max_tokens, current_model, theme, active_project_id FROM user_settings WHERE user_id = ${userId}`;
      if (!rows[0]) return json(req, res, 200, {});
      return json(req, res, 200, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'POST') {
    const body = await readJson<{ userId?: number | 'me'; model_temperature?: number; max_tokens?: number; current_model?: string; theme?: string; active_project_id?: number }>(req);
    let { userId, model_temperature, max_tokens, current_model, theme, active_project_id } = body as any;
    if (userId === 'me') userId = me || 0;
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    try {
      const rows = await sql`INSERT INTO user_settings (user_id, model_temperature, max_tokens, current_model, theme, active_project_id) VALUES (${userId}, ${model_temperature ?? null}, ${max_tokens ?? null}, ${current_model ?? null}, ${theme ?? null}, ${active_project_id ?? null})
        ON CONFLICT (user_id) DO UPDATE SET model_temperature = EXCLUDED.model_temperature, max_tokens = EXCLUDED.max_tokens, current_model = EXCLUDED.current_model, theme = EXCLUDED.theme, active_project_id = EXCLUDED.active_project_id, updated_at = now()
        RETURNING user_id`;
      return json(req, res, 200, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


