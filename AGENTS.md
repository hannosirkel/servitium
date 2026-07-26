# Servitium Agent Instructions

This file guides coding agents working in this repository.

## Commands

```bash
npm install
npm run typecheck
npm run test:unit
npm run build
npm test
npm run format:check
bash test/container.test.sh
```

Run focused tests while developing, then the complete relevant validation
before handoff.

## Workflow

- Inspect Git status, relevant code, tests, and `docs/current/` before changes.
- Develop on a feature branch from current `main`.
- Keep the Node server dependency-light and frontend applications compatible
  with the existing React, TypeScript, Vite, and Vitest stack.
- Update the relevant `docs/current/` file in the same commit when behavior
  changes. Add an ADR only for a durable, non-obvious choice.
- Review the complete diff and outgoing history before push. Never bypass the
  repository's pre-push secret scan.
- Keep the tracked `.githooks/pre-commit` gitleaks scan enabled in provisioned
  checkouts. Hook activation is managed by checkout provisioning; do not
  replace it with an undocumented local Git configuration.
- Push a reviewable branch and open a pull request. Test deployment uses the
  `deploy-test` label; deployment and merge rules are documented outside this
  repository in Mihkel's workspace.

## Documentation

Durable documentation lives in [`docs/`](./docs/).

| Path | Contents |
|---|---|
| [`docs/current/`](./docs/current/) | Source of truth for implemented behavior |
| [`docs/decisions/`](./docs/decisions/) | Accepted architectural decisions |
| [`docs/working/`](./docs/working/) | Active plans and designs |
| [`docs/AGENTS.md`](./docs/AGENTS.md) | Documentation upkeep rules |

Working documents may be committed to assist review. They are temporary intent,
not current-state documentation. Absorb durable information into `current/` or
`decisions/` after implementation, then remove completed working documents when
requested or when the project workflow automates that lifecycle.

## Architecture

Servitium is one Node HTTP server with independent frontend applications:

- `/dice/` — React/Vite dice application
- `/chess/` — React/Vite chess clock
- `/mtg/` — React/Vite MTG life counter
- `/healthz` — server health response

Each frontend has its own entrypoint, styles, logic, and tests. The server
serves immutable hashed assets and non-cacheable HTML. Keep application state
local unless a requirement clearly justifies shared server state.

## Security and scope

- Never commit credentials, tokens, private keys, rendered Secrets, or OAuth
  state.
- Do not add accounts, remote persistence, tracking, or new external services
  without explicit product and architectural justification.
- Do not use copyrighted card art or proprietary game assets without verified
  licensing.
- Preserve path traversal protections and the non-root production container.

## Testing

Prefer tests that protect user-visible behavior and non-obvious state
transitions. Cover server routes, persistence recovery, destructive-action
confirmation, responsive layout hooks, keyboard accessibility, and game-rule
thresholds where applicable. Documentation-only changes need static checks;
behavior changes require focused tests plus the repository validation suite.

## Review cutoff

Must fix contradictions between documentation and code, unsafe server or
storage behavior, broken recovery, inaccessible core controls, incorrect game
rules, and missing information needed to operate or extend the service. Avoid
historical narration, obvious code walkthroughs, and stylistic expansion that
adds maintenance cost without preserving a decision.
