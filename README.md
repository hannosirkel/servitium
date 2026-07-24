# Servitium

A small Node.js service for the community sandbox. It listens on port `8099`
by default and exposes:

- `GET /` — full-screen fantasy artwork
- `GET /assets/fantasy-overlord.png` — generated hero artwork
- `GET /dice` — frontend-only 3D dice hall
- `GET /chess-clock` — two-player chess clock with presets, increment, and delay
- `GET /healthz` — readiness and liveness response

## Chess clock product decisions

The clock starts when the player who made the first move taps their side, which
matches a physical chess clock: that action starts the opponent's time. Tapping
is limited to the active side during play to prevent accidental double switches.
The four presets cover the most recognizable over-the-board formats without
making users understand classification formulas: Bullet 1+0, Blitz 3+2, Rapid
15+10, and Classical 90+30.

Custom mode supports no bonus, Fischer increment, or simple delay. Different
player times are optional and hidden by default. Multi-stage tournament controls
and move counters that add time at a specific move are intentionally omitted;
they add substantial setup complexity for uncommon casual use.

An active game is persisted locally using wall-clock timestamps, so background
tabs and page reloads do not stop or drift the clock. Resetting a started game
requires confirmation, and navigating away while a clock runs prompts the user.

Run locally:

```bash
npm install
npm run build
npm test
HOST=127.0.0.1 PORT=8099 npm start
```
