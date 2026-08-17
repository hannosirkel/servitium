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

FreeCell is available at `/ludus/freecell`. It uses a deterministic standard
52-card deal across eight face-up cascades, four free cells, four suit
foundations, alternating-colour descending tableau runs, and capacity-correct
supermoves. Select-source then select-destination interaction works with taps,
clicks, and keyboard activation; selecting the same card again clears the
selection, and double-clicking an exposed card moves it to the first available
free cell. Free-cell cards highlight when selected and double-click to a legal
foundation; foundation top cards can return to free cells or cascades. Game
controls use the shared bottom action bar, cards and the shelf
have game-specific artwork, and completion triggers a reduced-motion-safe
celebration. Games persist locally with elapsed time, move history, unlimited
Undo, exact progress recovery, Restart, and New Deal.
Overlapped tableau cards reveal fully on desktop hover and after a deliberate
mobile long-press without also activating a move.
When every exposed remaining card can advance directly to its foundation with
no rearrangement, the engine proves the clean finish first and then animates the
cards home one at a time.

The pure TypeScript engine models tile faces separately from layered slots.
Free-tile checks use rectangle overlap across layers and same-layer side
blockers, including half-tile offsets. Generation is deterministic from the
generator version, difficulty, layout, and seed. It first constructs a bounded
legal slot-removal certificate, then assigns matching tile pairs to that
sequence. Certificate generation pairs a tile from the highest open layer with
a distant free tile across the whole board, while repeated matching groups are
dispersed from their earlier copies. Shuffling preserves occupied slots and the
remaining tile multiset while constructing a new certificate.

Hint, unlimited Undo, Shuffle, Restart, pinch-to-zoom, and Help are available.
Explicit zoom and fit controls remain available on larger screens and are hidden
on mobile, where pinch zoom is available.
Blocked tiles are disabled; free tiles are keyboard-operable native buttons
with descriptive labels. Status changes use a polite live region. The board
uses native one-finger panning when it exceeds the viewport, keeps the board
point between two fingers stable while pinching, preserves the viewport after
tile removal, and honours reduced-motion preferences.

Current game state, generator inputs, assignment, removal history, active
elapsed time, assistance counts, settings, completion statistics, best times,
and Daily Puzzle progress use separate versioned `localStorage` records.
Invalid active state is discarded without removing valid settings or
statistics. Timing pauses while the document is hidden. The server remains
stateless and the game makes no runtime network requests.
