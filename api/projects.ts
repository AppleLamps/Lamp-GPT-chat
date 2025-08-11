import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  // Determine the currently authenticated user (if any) once per request so all
  // verb branches (GET, POST, PUT, DELETE) can use it consistently. We keep this
  // outside of the individual method blocks to avoid code duplication.
  const cookie = req.headers.cookie || '';
  const session = (cookie.match(/(?:^|; )session=([^;]+)/) || [])[1];
  const meRow = session ? await sql`SELECT user_id FROM sessions WHERE token = ${decodeURIComponent(session)} AND (expires_at IS NULL OR expires_at > now())` : [];
  const me = meRow[0]?.user_id || null;

  if (req.method === 'GET') {
    const param = String(req.query.userId || '');
    const userId = param === 'me' ? (me || 0) : Number(param);
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    try {
      const rows = await sql`SELECT id, title as name, description, (data->>'instructions') as instructions, coalesce((data->'conversationStarters')::jsonb, '[]'::jsonb) as conversationStarters, created_at as "createdAt", updated_at as "updatedAt" FROM projects WHERE user_id = ${userId} ORDER BY updated_at DESC`;
      return json(req, res, 200, rows);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'POST') {
    const body = await readJson<{ userId: number | 'me'; name: string; description?: string; instructions?: string; conversationStarters?: string[] }>(req);
    let { userId, name, description, instructions, conversationStarters } = body as any;
    if (userId === 'me') userId = me || 0;
    if (!userId || !name) return json(req, res, 400, { error: 'userId and name required' });
    try {
      const rows = await sql`INSERT INTO projects (user_id, title, description, data) VALUES (${userId}, ${name}, ${description || ''}, ${JSON.stringify({ instructions: instructions || '', conversationStarters: conversationStarters || [] })}::jsonb) RETURNING id, title as name, description, created_at as "createdAt", updated_at as "updatedAt"`;
      return json(req, res, 201, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'PUT') {
    const body = await readJson<{ id: number; userId: number | 'me'; name?: string; description?: string; instructions?: string; conversationStarters?: string[] }>(req);
    let { id, userId, name, description, instructions, conversationStarters } = body as any;
    if (userId === 'me') userId = me || 0;
    if (!id || !userId) return json(req, res, 400, { error: 'id and userId required' });
    try {
      const rows = await sql`UPDATE projects SET title = COALESCE(${name}, title), description = COALESCE(${description}, description), data = COALESCE(${JSON.stringify({ instructions, conversationStarters })}::jsonb || data, data), updated_at = now() WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
      return json(req, res, 200, rows[0] || {});
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id, userId } = req.query;
    const projectId = Number(id);
    const actualUserId = userId === 'me' ? (me || 0) : Number(userId);
    if (!projectId || !actualUserId) return json(req, res, 400, { error: 'id and userId required' });
    try {
      const rows = await sql`DELETE FROM projects WHERE id = ${projectId} AND user_id = ${actualUserId} RETURNING id`;
      if (!rows[0]) return json(req, res, 404, { error: 'Project not found' });
      return json(req, res, 200, { ok: true });
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


