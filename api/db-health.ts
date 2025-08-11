import { getSql } from '../lib/db';

export default async function handler(req, res) {
  try {
    const sql = getSql();
    const result = await sql`select now() as now`;
    res.status(200).json({ ok: true, now: (result as any)?.[0]?.now });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'Unknown error' });
  }
}


