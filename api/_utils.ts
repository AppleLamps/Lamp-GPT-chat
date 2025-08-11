export function json(req, res, status: number, data: unknown) {
  res.status(status).json(data);
}

export async function readJson<T = any>(req): Promise<T> {
  if (req.method === 'GET') return {} as T;
  try {
    return typeof req.body === 'object' ? (req.body as T) : JSON.parse(req.body || '{}');
  } catch {
    return {} as T;
  }
}


