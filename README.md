# Servitium

A small Node.js service for the community sandbox. It listens on port `8099`.

## Applications

- `/dice` — 3D dice roller with common dice, multi-die throws, shake/flick
  controls, reduced-motion fallback, and local history.
- `/chess` — two-player chess clock with Bullet, Blitz, Rapid, Classical, and
  custom time controls; increment, delay, pause, reset protection, and local
  recovery. The former `/chess-clock` URL redirects here.
- `/mtg` — local-first MTG life counter for two to four players. Supports
  Constructed/Limited, Commander, Brawl, Two-Headed Giant, and custom games;
  life, poison, Commander damage and tax, monarch, initiative, undo/redo,
  history, rematches, dice/coin tools, wake lock, and local recovery.
- `/healthz` — readiness and liveness status.

The home page at `/` links to every application. The MTG research and plans are
in `docs/working/`. All pages share the Servitium favicon, and each application
provides a full-screen control.

## Development

```bash
npm install
npm run build
npm run typecheck
npm run test:unit
npm test
HOST=127.0.0.1 PORT=8099 npm start
```
