# Servitium

A small Node.js service for the community sandbox. It listens on port `8099`
by default and exposes:

- `GET /` — hello response
- `GET /healthz` — readiness and liveness response

Run locally:

```bash
npm test
HOST=127.0.0.1 PORT=8099 npm start
```
