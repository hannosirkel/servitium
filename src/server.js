'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Load the immutable hero asset once during process startup.
const heroImage = fs.readFileSync(path.join(__dirname, 'assets', 'fantasy-overlord.png'));
const diceRoot = path.join(__dirname, '..', 'dist', 'dice');
const chessClockRoot = path.join(__dirname, '..', 'dist', 'chess-clock');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg',
};

const homePage = `<!doctype html>
<html lang="et">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Servitium</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; background: #080b0d; }
    body { color: #f6ebd0; font-family: Inter, system-ui, sans-serif; }
    main { position: relative; width: 100%; height: 100%; overflow: hidden; }
    .hero { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; object-position: center; }
    .shade { position: absolute; inset: 0; background: linear-gradient(90deg, #090c0fd9 0, #090c0f70 48%, transparent 75%), linear-gradient(0deg, #090c0fd9, transparent 50%); }
    .content { position: relative; z-index: 1; width: min(1120px, calc(100% - 40px)); height: 100%; margin: auto; display: flex; flex-direction: column; justify-content: end; padding: 8vh 0; }
    .eyebrow { color: #dba64b; font: 600 10px Georgia, serif; letter-spacing: .28em; }
    h1 { max-width: 650px; margin: 10px 0 28px; color: #fff6df; font: 500 clamp(38px, 6vw, 76px)/.95 Georgia, serif; letter-spacing: -.035em; }
    nav { display: grid; grid-template-columns: repeat(2, minmax(210px, 290px)); gap: 12px; }
    a { min-height: 105px; display: flex; align-items: center; gap: 18px; padding: 18px; color: inherit; text-decoration: none; border: 1px solid #d3a8543d; background: linear-gradient(145deg, #262b30ed, #14181ded); box-shadow: 0 15px 35px #0008; transition: border-color .2s, transform .2s; }
    a:hover { border-color: #dba64b; transform: translateY(-2px); }
    a:focus-visible { outline: 2px solid #f3d28b; outline-offset: 3px; }
    .icon { width: 58px; height: 58px; flex: none; display: grid; place-items: center; color: #f3d28b; border: 1px solid #dba64b; background: #1a1e22; font: 500 31px Georgia, serif; }
    a b, a small { display: block; } a b { font: 500 20px Georgia, serif; } a small { margin-top: 7px; color: #9d978d; font-size: 10px; letter-spacing: .08em; }
    @media (max-width: 560px) { .content { width: calc(100% - 24px); padding-bottom: max(24px, env(safe-area-inset-bottom)); } h1 { margin-bottom: 20px; } nav { grid-template-columns: 1fr; } a { min-height: 84px; padding: 12px 15px; } .icon { width: 52px; height: 52px; } }
    @media (prefers-reduced-motion: reduce) { a { transition: none; } }
  </style>
</head>
<body>
  <main>
    <img class="hero" src="/assets/fantasy-overlord.png" alt="Musta raudrüüga fantaasiavalitseja vaatab süngele mägilinnale">
    <div class="shade" aria-hidden="true"></div>
    <section class="content">
      <span class="eyebrow">SERVITIUM</span>
      <h1>Choose your table</h1>
      <nav aria-label="Applications">
        <a href="/dice/"><span class="icon" aria-hidden="true">⚄</span><span><b>Dice Hall</b><small>CAST YOUR FATE</small></span></a>
        <a href="/chess-clock/"><span class="icon" aria-hidden="true">♞</span><span><b>Chess Clock</b><small>COMMAND THE TEMPO</small></span></a>
      </nav>
    </section>
  </main>
</body>
</html>
`;

function sendJson(response, statusCode, value) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  response.end(body);
}

function send(response, statusCode, contentType, body, cacheControl = 'no-store') {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body),
    'cache-control': cacheControl,
  });
  response.end(body);
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/') {
      send(response, 200, 'text/html; charset=utf-8', homePage);
      return;
    }

    if (request.method === 'GET' && request.url === '/assets/fantasy-overlord.png') {
      send(response, 200, 'image/png', heroImage, 'public, max-age=31536000, immutable');
      return;
    }

    if (request.method === 'GET' && request.url === '/dice') {
      response.writeHead(308, { location: '/dice/' });
      response.end();
      return;
    }

    if (request.method === 'GET' && request.url.startsWith('/dice/')) {
      const relativePath = request.url === '/dice/'
        ? 'index.html'
        : decodeURIComponent(request.url.slice('/dice/'.length).split('?')[0]);
      const filePath = path.resolve(diceRoot, relativePath);
      if (filePath.startsWith(`${diceRoot}${path.sep}`) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const body = fs.readFileSync(filePath);
        const immutable = relativePath !== 'index.html';
        send(response, 200, mimeTypes[path.extname(filePath)] || 'application/octet-stream', body,
          immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
        return;
      }
    }

    if (request.method === 'GET' && request.url === '/chess-clock') {
      response.writeHead(308, { location: '/chess-clock/' });
      response.end();
      return;
    }

    if (request.method === 'GET' && request.url.startsWith('/chess-clock/')) {
      const relativePath = request.url === '/chess-clock/'
        ? 'chess-clock.html'
        : decodeURIComponent(request.url.slice('/chess-clock/'.length).split('?')[0]);
      const filePath = path.resolve(chessClockRoot, relativePath);
      if (filePath.startsWith(`${chessClockRoot}${path.sep}`) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const body = fs.readFileSync(filePath);
        const immutable = relativePath !== 'chess-clock.html';
        send(response, 200, mimeTypes[path.extname(filePath)] || 'application/octet-stream', body,
          immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
        return;
      }
    }

    if (request.method === 'GET' && request.url === '/healthz') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }

    sendJson(response, 404, { error: 'not found' });
  });
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

if (require.main === module) {
  const host = process.env.HOST || '0.0.0.0';
  const port = parsePort(process.env.PORT || '8099');
  const server = createServer();

  server.listen(port, host, () => {
    console.log(`servitium listening on ${host}:${port}`);
  });

  const shutdown = () => {
    server.close((error) => {
      process.exitCode = error ? 1 : 0;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = { createServer, parsePort };
