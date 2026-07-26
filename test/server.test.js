'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
  assert.match(body, /href="\/dice\/"/);
  assert.match(body, /href="\/chess-clock\/"/);
  assert.match(body, /href="\/mtg\/"/);
});

test('GET /assets/fantasy-overlord.png returns the hero image', async () => {
  const response = await fetch(`${baseUrl}/assets/fantasy-overlord.png`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  const body = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual(Array.from(body.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});

test('GET /dice redirects to the canonical trailing-slash path', async () => {
  const response = await fetch(`${baseUrl}/dice`, { redirect: 'manual' });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/dice/');
});

test('GET /dice/ serves the built frontend with subpath assets', {
  skip: !fs.existsSync(path.join(__dirname, '..', 'dist', 'dice', 'index.html')),
}, async () => {
  const response = await fetch(`${baseUrl}/dice/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  const body = await response.text();
  assert.match(body, /Dice Hall/);
  assert.match(body, /\/dice\/assets\//);
});

test('GET /chess-clock redirects to the canonical trailing-slash path', async () => {
  const response = await fetch(`${baseUrl}/chess-clock`, { redirect: 'manual' });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/chess-clock/');
});

test('GET /chess-clock/ serves the built frontend with subpath assets', {
  skip: !fs.existsSync(path.join(__dirname, '..', 'dist', 'chess-clock', 'chess-clock.html')),
}, async () => {
  const response = await fetch(`${baseUrl}/chess-clock/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  const body = await response.text();
  assert.match(body, /Chess Clock/);
  assert.match(body, /\/chess-clock\/assets\//);
});

test('GET /mtg redirects to the canonical trailing-slash path', async () => {
  const response = await fetch(`${baseUrl}/mtg`, { redirect: 'manual' });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/mtg/');
});

test('GET /mtg/ serves the built frontend with subpath assets', {
  skip: !fs.existsSync(path.join(__dirname, '..', 'dist', 'mtg', 'mtg.html')),
}, async () => {
  const response = await fetch(`${baseUrl}/mtg/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  const body = await response.text();
  assert.match(body, /MTG Life Counter/);
  assert.match(body, /\/mtg\/assets\//);
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
