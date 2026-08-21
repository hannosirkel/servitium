# Servitium Agent Instructions

<!-- BEGIN MANAGED ARCHITECTURE BASELINE -->
<!-- Generated from hannosirkel/architecture. Do not edit inside these markers.
     Regenerate with: tooling/universe sync-baseline servitium -->

Governed by [`architecture`](https://github.com/hannosirkel/architecture).

| | |
| --- | --- |
| Profile | `application-public` |
| Visibility | declared public, currently public |
| Public-safe required | yes |
| Languages | typescript, shell |

**Standards that apply here.** Read a standard before you change something it
governs.

- [Agent operation](https://github.com/hannosirkel/architecture/blob/main/standards/agent-operation.md) — worktrees, branches, multi-agent safety, delegation
- [Security](https://github.com/hannosirkel/architecture/blob/main/standards/security.md) — secrets, public and private boundaries, workflow hardening
- [Code quality](https://github.com/hannosirkel/architecture/blob/main/standards/code-quality.md) — gates, coaching, testing, review cutoff
- [Repository contract](https://github.com/hannosirkel/architecture/blob/main/standards/repository-contract.md) — required files, profiles, skills
- [GitOps and deployment](https://github.com/hannosirkel/architecture/blob/main/standards/gitops-and-deployment.md) — promotion by digest, rollback, the sanctioned secrets path
- Language standards: [typescript](https://github.com/hannosirkel/architecture/blob/main/standards/languages/typescript.md), [shell](https://github.com/hannosirkel/architecture/blob/main/standards/languages/shell.md)

**Never commit to a default branch.** Work in `~/app/.worktrees/servitium/<task>`,
branch from `origin/main`, and open a pull request.

**This repository must be safe to publish.** Never commit a password, token, key, kubeconfig,
rendered Secret, or live export. No repository here holds a secret value, and a
private one is no exception.

**Run `habit-hooks` before declaring an edit done.** If it is not on `PATH`:

```bash
uv tool install "habit-hooks[python,typescript]"
```

Name every language in that one command. A later install naming a different
extra silently replaces this one. Then re-run `habit-hooks`.

<!-- END MANAGED ARCHITECTURE BASELINE -->

## Commands

```bash
npm ci
bash scripts/validate
```

Install dependencies separately from validation. Run `bash scripts/validate`
before handoff.

## Workflow

- Keep the Node server dependency-light. Keep the frontend applications on the
  existing React, TypeScript, Vite, and Vitest stack.
- The tracked `.githooks/pre-commit` gitleaks scan is activated by checkout
  provisioning. Do not replace it with an undocumented local Git configuration.
- Test deployment uses the `deploy-test` label on the pull request. Deployment
  and merge rules are documented outside this repository, in Mihkel's
  workspace.

## Documentation

[`docs/`](./docs/) follows the layout, the ADR format, and the exclusions in the
[documentation standard](https://github.com/hannosirkel/architecture/blob/main/standards/documentation.md).

| Path | Contents |
|---|---|
| [`docs/current/`](./docs/current/) | implemented behavior |
| [`docs/decisions/`](./docs/decisions/) | accepted architectural decisions |
| [`docs/working/`](./docs/working/) | active plans and designs |

Update the matching `docs/current/` file in the same commit when behavior
changes.

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

Cover server routes, persistence recovery, destructive-action confirmation,
responsive layout hooks, keyboard accessibility, and game-rule thresholds.

## Review cutoff

Must fix, beyond the central list: unsafe server or storage behavior, broken
local recovery, an inaccessible core control, and an incorrect game rule.
