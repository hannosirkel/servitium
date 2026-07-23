'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Load the immutable hero asset once during process startup.
const heroImage = fs.readFileSync(path.join(__dirname, 'assets', 'fantasy-overlord.png'));

const homePage = `<!doctype html>
<html lang="et">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Servitium</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; background: #080b0d; }
    main { width: 100%; height: 100%; overflow: hidden; }
    img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: center; }
  </style>
</head>
<body>
  <main>
    <img src="/assets/fantasy-overlord.png" alt="Musta raudrüüga fantaasiavalitseja vaatab süngele mägilinnale">
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
