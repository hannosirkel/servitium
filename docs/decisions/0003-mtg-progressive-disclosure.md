# MTG controls use progressive disclosure

Status: Accepted

## Context

MTG life counters can accumulate counters, timers, statistics, card art, and
format-specific tools. Table use prioritizes legible totals, reliable input,
and quick correction. Gesture-only controls and mandatory turn passing create
avoidable interaction cost.

## Decision

Arcane Ledger keeps life and counter summaries visible, places less common
counters and utilities in dialogs, uses explicit buttons, and omits turn
tracking, accounts, card databases, and remote profiles.

## Rationale

This preserves the frequently used surface while retaining Commander and
table-role bookkeeping one action away. Turn tracking has meaningful value
mainly when it powers timers or statistics, neither of which is in scope.

## Consequences

Niche counters and analytics require later product decisions rather than
occupying the initial interface. New tools should remain secondary unless
repeated table use proves they belong on every player panel.
