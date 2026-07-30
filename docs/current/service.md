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

The home page and all application entrypoints use the shared Servitium SVG
favicon at `/favicon.svg`. Each application exposes the same shared full-screen
control; it enters or exits browser full-screen mode where the API is supported.

The production image builds every frontend in a Node build stage, then runs the
server as user `10001` in a smaller Node runtime stage. The service has no
database, account system, or server-side application state.

## Build and validation

After `npm ci`, `bash scripts/validate` is the canonical local and CI
validation entry point. It checks formatting and syntax, TypeScript, Vitest and
Node tests, all frontend builds, the container runtime contract, and the
digest-update guard. Dependency installation remains separate so repeated
validation does not reinstall packages.

Pull requests and pushes to `main` run the same command. A release validates
the exact pushed revision before package-write permission is granted. Test and
live promotions serialize writes to the GitOps repository, update only their
exact overlay path, render both overlays, and check the Git diff before an
ordinary non-force push.

Test and live builds attach minimum BuildKit provenance and an OCI SBOM to the
pushed GHCR image. A pinned Trivy action scans that immutable digest before
promotion, fails on fixed CRITICAL vulnerabilities, and ignores findings with
no available fix. The vulnerability-only JSON report is retained for seven
days. Weekly Dependabot checks keep npm, the Docker base image, and GitHub
Actions separately reviewable; routine development dependencies are grouped.

The repository ships a fail-closed `.githooks/pre-commit` hook that scans
staged changes with gitleaks. Checkout provisioning owns the `core.hooksPath`
setting that activates tracked hooks; the repository does not mutate local Git
configuration.
