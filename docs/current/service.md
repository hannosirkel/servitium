# Service

Servitium is a Node.js HTTP service listening on port `8099` by default. The
home page links to three independent browser applications:

- `/dice/`
- `/chess/`
- `/mtg/`

`/dice`, `/chess`, and `/mtg` redirect to their trailing-slash canonical
paths. The retired `/chess-clock` path redirects to `/chess/`. `/healthz`
returns `{"status":"ok"}`.

The server loads the home artwork at startup and serves each built frontend
from its own `dist/` directory. Hashed assets use immutable caching; application
HTML is not cached. Resolved file paths must remain inside the relevant
application root.

The production image builds every frontend in a Node build stage, then runs the
server as user `10001` in a smaller Node runtime stage. The service has no
database, account system, or server-side application state.

## Build and validation

`npm run build` builds Dice Hall, Chess Clock, and Arcane Ledger. TypeScript and
Vitest cover frontend logic and components; Node tests cover routes and
delivery workflow contracts. `test/container.test.sh` protects the container
runtime contract.
