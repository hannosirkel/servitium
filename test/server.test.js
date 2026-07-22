'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { createServer } = require('../src/server');

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('GET / returns the Servitium image page', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  const body = await response.text();
  assert.match(body, /<title>Servitium<\/title>/);
  assert.match(body, /src="\/assets\/fantasy-overlord\.png"/);
  assert.match(body, /alt="[^"]+"/);
});

test('GET /assets/fantasy-overlord.png returns the hero image', async () => {
  const response = await fetch(`${baseUrl}/assets/fantasy-overlord.png`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  const body = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual(Array.from(body.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});

test('GET /healthz reports readiness', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('unknown paths return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not found' });
});
