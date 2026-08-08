// Minimal Express server for the static portfolio.
//
// Why not `serve`? `serve` writes a single-line log per request and has no
// health endpoint of its own. EasyPanel uses its own probe on the EXPOSE
// port and on the path the app considers "healthy"; giving it a dedicated
// /health endpoint makes the contract explicit. Express also lets us
// handle SIGTERM/SIGINT gracefully so Docker restarts don't drop
// in-flight requests.

import compression from 'compression';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Compress every text asset (HTML, CSS, JS, JSON, SVG, woff2). Photos
// are already compressed and skip automatically because of the type
// filter. With Brotli negotiated by EasyPanel's reverse proxy and gzip
// as fallback, the JS bundle (~310 KB gzipped) drops to ~110 KB over
// the wire.
app.use(
  compression({
    threshold: 512,
    level: 6
  })
);

// Liveness probe — returns 200 with a tiny body. Cheap and predictable.
app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

// Hashed assets are immutable; index.html must always revalidate.
app.use((_req, res, next) => {
  if (_req.path === '/' || _req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-cache');
  }
  next();
});

app.use(
  express.static(path.join(__dirname, 'dist'), {
    immutable: true,
    maxAge: '1y',
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  })
);

// SPA fallback so client routes resolve to index.html.
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`[portfolio] listening on :${PORT}`);
});

// Graceful shutdown: EasyPanel / Docker send SIGTERM before killing the
// container. Closing the HTTP socket here lets in-flight requests finish.
const shutdown = (signal) => {
  console.log(`[portfolio] ${signal} received, closing...`);
  server.close(() => process.exit(0));
  // Hard exit if close hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
