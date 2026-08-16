# Ludus and Mahjong Solitaire

Ludus is served at `/ludus/`. It is a native horizontally scrollable game
shelf backed by a typed catalogue. Catalogue entries supply their title,
description, route, artwork mark, and availability status. Mahjong Solitaire
is the first entry and is served at `/ludus/mahjong` by the same independent
React/Vite application.

Mahjong has start, active-game, and completion views. Easy uses two open
80-tile layouts. Medium and Hard each use two full 144-tile layouts; Medium
includes Turtle. Players can choose a layout or start a deterministic Medium
Daily Puzzle derived from their local calendar date. The canonical tile
families are represented, including family-wide Flower and Season matching.

The pure TypeScript engine models tile faces separately from layered slots.
Free-tile checks use rectangle overlap across layers and same-layer side
blockers, including half-tile offsets. Generation is deterministic from the
generator version, difficulty, layout, and seed. It first constructs a bounded
legal slot-removal certificate, then assigns matching tile pairs to that
sequence. Shuffling preserves occupied slots and the remaining tile multiset
while constructing a new certificate.

Hint, unlimited Undo, Shuffle, Restart, zoom, fit, and Help are available.
Blocked tiles are disabled; free tiles are keyboard-operable native buttons
with descriptive labels. Status changes use a polite live region. The board
uses native panning when it exceeds the viewport, retains visible focus, and
honours reduced-motion preferences.

Current game state, generator inputs, assignment, removal history, active
elapsed time, assistance counts, settings, completion statistics, best times,
and Daily Puzzle progress use separate versioned `localStorage` records.
Invalid active state is discarded without removing valid settings or
statistics. Timing pauses while the document is hidden. The server remains
stateless and the game makes no runtime network requests.
