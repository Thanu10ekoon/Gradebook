import { Readable } from 'node:stream';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleRequest } from './server/http.js';

function mountApi(server) {
  server.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    const headers = new Headers(req.headers);
    headers.delete('x-vercel-forwarded-for');
    headers.set('x-gradebook-local-ip', req.socket.remoteAddress ?? 'local');
    const init = { headers, method: req.method };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = Readable.toWeb(req);
      init.duplex = 'half';
    }
    try {
      const request = new Request(new URL(req.url, 'http://' + headers.get('host')), init);
      const response = await handleRequest(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(400);
      res.end('Invalid request.');
    }
  });
}

export default defineConfig(() => {
  try {
    process.loadEnvFile('.env.local');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { plugins: [react(), { name: 'gradebook-api', configureServer: mountApi, configurePreviewServer: mountApi }] };
});
