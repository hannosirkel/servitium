# Local-first application state

Status: Accepted

## Context

Dice history, clock recovery, and MTG game recovery are useful on one tabletop
device. Accounts, synchronization, and remote storage would add privacy,
credential, availability, and operational costs.

## Decision

Browser applications keep active state in memory and persist only the local
history or active game needed for recovery in `localStorage`. The server
remains stateless.

## Rationale

The tools remain usable without accounts or network requests after loading,
recover from ordinary refreshes, and require no database lifecycle.

## Consequences

State does not synchronize across devices and clearing browser storage removes
it. Persisted schemas must be validated defensively and versioned when their
shape changes.
