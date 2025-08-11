import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  if (req.method === 'GET') {
    const userId = Number(req.query.userId);
    if (!userId) return json(req, res, 400, { error: 'userId required' });
    try {
      const rows = await sql`SELECT id, title as name, description, (data->>'instructions') as instructions, coalesce((data->'conversationStarters')::jsonb, '[]'::jsonb) as conversationStarters, created_at as "createdAt", updated_at as "updatedAt" FROM projects WHERE user_id = ${userId} ORDER BY updated_at DESC`;
      return json(req, res, 200, rows);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'POST') {
    const body = await readJson<{ userId: number; name: string; description?: string; instructions?: string; conversationStarters?: string[] }>(req);
    const { userId, name, description, instructions, conversationStarters } = body;
    if (!userId || !name) return json(req, res, 400, { error: 'userId and name required' });
    try {
      const rows = await sql`INSERT INTO projects (user_id, title, description, data) VALUES (${userId}, ${name}, ${description || ''}, ${JSON.stringify({ instructions: instructions || '', conversationStarters: conversationStarters || [] })}::jsonb) RETURNING id, title as name, description, created_at as "createdAt", updated_at as "updatedAt"`;
      return json(req, res, 201, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'PUT') {
    const body = await readJson<{ id: number; userId: number; name?: string; description?: string; instructions?: string; conversationStarters?: string[] }>(req);
    const { id, userId, name, description, instructions, conversationStarters } = body;
    if (!id || !userId) return json(req, res, 400, { error: 'id and userId required' });
    try {
      const rows = await sql`UPDATE projects SET title = COALESCE(${name}, title), description = COALESCE(${description}, description), data = COALESCE(${JSON.stringify({ instructions, conversationStarters })}::jsonb || data, data), updated_at = now() WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
      return json(req, res, 200, rows[0] || {});
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    const userId = Number(req.query.userId);
    if (!id || !userId) return json(req, res, 400, { error: 'id and userId required' });
    try {
      await sql`DELETE FROM projects WHERE id = ${id} AND user_id = ${userId}`;
      return json(req, res, 200, { ok: true });
    } catch (error) {
      return json(req, res, 500, { error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


