# Servitium

A small Node.js service for the community sandbox. It listens on port `8099`
by default and exposes:

- `GET /` — full-screen fantasy artwork
- `GET /assets/fantasy-overlord.png` — generated hero artwork
- `GET /dice` — frontend-only 3D dice hall
- `GET /healthz` — readiness and liveness response

Run locally:

```bash
npm install
npm run build
npm test
HOST=127.0.0.1 PORT=8099 npm start
```
