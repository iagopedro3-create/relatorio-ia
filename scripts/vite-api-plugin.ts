/**
 * Serve as funções de `api/` no `vite dev`, no mesmo formato da Vercel
 * (`export default (req, res) => ...`), sem precisar do `vercel dev`.
 *
 *   /api/ai/generate  -> api/ai/generate.ts
 *   /api/admin/users  -> api/admin/users.ts
 *
 * Carrega as variáveis de servidor do `.env` (SUPABASE_SERVICE_ROLE_KEY,
 * AI_API_KEY, ...) em process.env — elas nunca chegam ao bundle do front
 * porque não têm prefixo VITE_.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, type Plugin } from 'vite';

type Handler = (req: unknown, res: unknown) => Promise<unknown> | unknown;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  const type = req.headers['content-type'] ?? '';
  if (type.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export function vercelApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      // No dev local o .env é a fonte da verdade: sobrescreve sempre, senão um
      // valor vazio herdado do primeiro start "gruda" nos restarts seguintes.
      for (const [k, v] of Object.entries(env)) process.env[k] = v;

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        const rel = url.pathname.slice('/api/'.length).replace(/\/+$/, '');
        const file = resolve(server.config.root, 'api', `${rel}.ts`);
        if (!rel || rel.includes('..') || !existsSync(file)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Função não encontrada: ${url.pathname}` }));
          return;
        }

        try {
          const mod = await server.ssrLoadModule(file);
          const handler = mod.default as Handler;
          const vreq = Object.assign(req, {
            query: Object.fromEntries(url.searchParams),
            cookies: {},
            body: await readBody(req),
          });
          const vres = Object.assign(res as ServerResponse, {
            status(code: number) { res.statusCode = code; return vres; },
            json(data: unknown) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return vres;
            },
            send(data: unknown) {
              if (typeof data === 'object') return vres.json(data);
              res.end(String(data ?? ''));
              return vres;
            },
            redirect(a: number | string, b?: string) {
              const [code, location] = typeof a === 'number' ? [a, b ?? '/'] : [302, a];
              res.statusCode = code; res.setHeader('Location', location); res.end();
              return vres;
            },
          });
          await handler(vreq, vres);
          if (!res.writableEnded) res.end();
        } catch (err) {
          server.config.logger.error(`[api] ${url.pathname}: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
          }
          if (!res.writableEnded) res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno.' }));
        }
      });
    },
  };
}
