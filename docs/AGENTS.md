# Documentation Structure

This directory contains Servitium's durable documentation.

## Intent

Keep documentation brief, accurate, and useful for future maintenance.
Describe durable truth, not implementation history. Prefer present-state
accuracy, explicit boundaries, and low maintenance cost.

## Layout

```text
docs/
  current/    Implemented behavior and operational source of truth
  decisions/  ADR-style records for durable architectural choices
  issues/     Durable open correctness or operability issues, when needed
  working/    Active plans and designs
```

## Current state

Write `docs/current/` in the present tense. When application behavior, routes,
build integration, persistence, or operational contracts change, update the
relevant current-state file in the same commit. Contradictory current
documentation is worse than no document.

## Decisions

Use `docs/decisions/` when a maintainer might reasonably ask why an obvious
alternative was rejected. Use:

```text
Status / Context / Decision / Rationale / Consequences
```

Accepted ADRs are append-only. Supersede them with a new decision rather than
rewriting their original rationale.

## Working documents

`docs/working/` may be committed for active or review-stage work. These files
describe intent and are not a source of truth. After implementation is
complete, absorb durable facts into `current/` and non-obvious rationale into
`decisions/`. Completed working files may remain until a follow-up request or
pipeline step performs that cleanup.

## Exclusions

Do not store secrets, credentials, transient deployment output, changelogs,
step-by-step histories of completed work, or details directly discoverable
from obvious code. Document external systems only through the contract
Servitium depends on.
