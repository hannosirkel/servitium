# Arcane Ledger

Arcane Ledger is a local-first MTG life counter at `/mtg/` for two to four
seats. Constructed/Limited is the default setup.

## Formats

- Constructed/Limited: 20 life
- Commander: 40 life
- Brawl: 25 life for two players, 30 for multiplayer
- Two-Headed Giant: four seats represented by two teams sharing 30 life
- Custom: two to four players and configurable starting life

The starting values and loss warnings follow the Magic Comprehensive Rules:
zero life, ten poison counters, 21 combat damage from one commander, and 15
shared poison counters for Two-Headed Giant. Warnings do not lock controls or
declare a winner.

## Table behavior

Every player panel keeps explicit `−5`, `−1`, `+1`, and `+5` life controls
visible. Counter dialogs provide poison, Commander damage by source, and
Commander tax. Commander damage changes life in the same undoable action.
Monarch and initiative ownership are optional table roles with highlighted
selection and player-panel status.

The tools dialog also provides visible coin and d20 results, optional haptics,
and screen wake lock. Full-screen mode is a primary shared control on both
setup and active-table screens rather than an MTG-specific tool. Turn tracking
is not part of the interface because it adds an action every turn without
powering statistics or timing in this application.

Two-, three-, and four-player grids have explicit layouts. Far-side panels
rotate only on coarse-pointer touch devices for tabletop use; desktop panels
remain upright. Setup names collapse to one column on narrow screens.

## State and recovery

Changes use pure state transitions with bounded history and exact undo/redo
snapshots. One versioned active game is stored in `localStorage`. Restoration
validates players, ids, counters, history snapshots, and schema version;
invalid state falls back to setup. Rematch preserves setup and names while
resetting gameplay state. Leaving an active game or starting a rematch requires
confirmation after recorded changes.
