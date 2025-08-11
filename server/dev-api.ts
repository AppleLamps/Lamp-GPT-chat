// Load environment variables from .env before anything else
import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

// Simple dev API server that mounts all handlers in the `api/` directory at /api/*
// Handlers must export default function (req, res)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadHandlers(): Promise<Record<string, (req: Request, res: Response) => unknown>> {
  const apiDir = path.resolve(__dirname, '../api');
  const files = fs.readdirSync(apiDir).filter((f) => f.endsWith('.ts'));
  const routes: Record<string, (req: Request, res: Response) => unknown> = {};
  for (const file of files) {
    const name = file.replace(/\.ts$/, '');
    const modulePath = path.resolve(apiDir, file);
    // Dynamic import of TS file; run with `tsx` in dev.
    // On Windows, convert the absolute path to a file URL, otherwise Node's ESM loader
    // throws "ERR_UNSUPPORTED_ESM_URL_SCHEME".
    const mod = (await import(pathToFileURL(modulePath).href)) as any;
    if (mod && typeof mod.default === 'function') {
      routes[`/api/${name}`] = mod.default as (req: Request, res: Response) => unknown;
    }
  }
  return routes;
}

function wrap(handler: (req: Request, res: Response) => unknown) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.resolve(handler(req, res));
    } catch (err: any) {
      const message = err?.message || 'Internal Server Error';
      // Ensure JSON response so the frontend doesn't fail parsing
      res.status(500).json({ error: message });
    }
  };
}

async function main() {
  const app = express();

  // Accept JSON; allow raw bodies too (some handlers parse manually)
  app.use(express.text({ type: '*/*' }));
  app.use(express.json());

  const routes = await loadHandlers();
  Object.entries(routes).forEach(([routePath, handler]) => {
    app.all(routePath, wrap(handler));
    // Also support trailing slash
    app.all(`${routePath}/`, wrap(handler));
  });

  // Health check
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  const port = Number(process.env.API_PORT) || 8787;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Dev API server listening on http://localhost:${port}`);
  });

  // Keep process alive (tsx may exit when top-level promise resolves on some setups)
  await new Promise(() => {});
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


