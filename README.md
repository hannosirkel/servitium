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
- `/ludus` — a game shelf whose first game is local-first Mahjong Solitaire,
  with deterministic solvable deals, six layouts, three difficulty levels,
  Daily Puzzles, assistance, and local recovery.
- `/healthz` — readiness and liveness status.

The home page at `/` links to every application. The MTG research and plans are
in `docs/working/`. All pages share the Servitium favicon, and each application
provides a full-screen control.

## Development

```bash
npm ci
bash scripts/validate
HOST=127.0.0.1 PORT=8099 npm start
```

Dependency installation is intentionally separate so repeated validation does
not reinstall packages.

Published test and live images carry minimum provenance and an OCI SBOM. Their
immutable digest must pass the fixed-CRITICAL vulnerability gate before the
corresponding GitOps promotion.

## Repository boundaries

This repository is public and must stay safe to publish.

**It owns** the Node HTTP server and the frontend applications listed above, its
own documentation in [`docs/`](./docs/), its tests, and the promotion of image
digests into `hannosirkel/deploys`.

**It does not own** the Kubernetes manifests, which `hannosirkel/deploys` owns,
or any deployment credential, secret, or per-environment value.

Repository-local current state and decisions live in [`docs/`](./docs/).
Cross-repository standards and initiatives live in
[`hannosirkel/architecture`](https://github.com/hannosirkel/architecture).
