import { getSql } from '../lib/db';
import { json, readJson } from './_utils';

export default async function handler(req, res) {
  const sql = getSql();

  if (req.method === 'POST') {
    const body = await readJson<{ chatId: number; role: string; content: string }>(req);
    const { chatId, role, content } = body;
    if (!chatId || !role || !content) return json(req, res, 400, { error: 'chatId, role, content required' });
    
    // TODO: Add user authorization check - only allow users to add messages to their own chats
    try {
      const rows = await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, ${role}, ${content}) RETURNING id, chat_id, role, content, timestamp`;
      return json(req, res, 201, rows[0]);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  if (req.method === 'GET') {
    const chatId = Number(req.query.chatId);
    if (!chatId) return json(req, res, 400, { error: 'chatId required' });
    
    // TODO: Add user authorization check - only allow users to read messages from their own chats
    try {
      const rows = await sql`SELECT id, chat_id, role, content, timestamp FROM messages WHERE chat_id = ${chatId} ORDER BY timestamp ASC`;
      return json(req, res, 200, rows);
    } catch (error) {
      return json(req, res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return json(req, res, 405, { error: 'Method Not Allowed' });
}


