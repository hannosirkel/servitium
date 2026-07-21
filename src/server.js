'use strict';

const http = require('node:http');

function sendJson(response, statusCode, value) {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  response.end(body);
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/') {
      sendJson(response, 200, {
        service: 'servitium',
        message: 'Hello from Servitium!',
      });
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
