# FreeCell build prompt

Build a polished, offline FreeCell game inside the existing Ludus React/Vite app.

Use standard rules: one shuffled 52-card deck dealt face-up across eight cascades
(7/7/7/7/6/6/6/6), four single-card free cells, and four suit foundations built
Ace through King. Cascades build downward in alternating colours. Empty cascades
accept any card or legal run. Permit sequence moves only when they can be
decomposed through available free cells and empty cascades: `(empty cells + 1) ×
2^empty cascades`, excluding an empty destination cascade from the multiplier.

Make the core a pure, deterministic TypeScript engine. Support numbered/random
deals, legal-move validation, multi-card moves, undo, exact restart, win detection,
move count, elapsed time, and versioned local persistence. Do not silently make
strategically unsafe foundation moves. Provide explicit new-deal confirmation.

Match Ludus visually and responsively. Cards must remain readable on phones.
Every move must work with select-source then select-destination taps/clicks and
native keyboard activation; dragging must never be required. Give cards, cells,
foundations, cascades, status changes, invalid moves, and selection accessible
names/states, visible focus, and a polite live region. Honour reduced motion.

Add the game to the data-driven Ludus shelf and `/ludus/freecell`. Include concise
rules/help in the game screen. Test deck integrity, deterministic deals, every move
rule, supermove capacity including empty destinations, undo/restart, persistence,
winning, routing, and core user interaction. Update current documentation.

Research basis: standard FreeCell rules and supermoves as documented by the
FreeCell community/help references; W3C WCAG 2.2 keyboard and dragging guidance.

## Research findings applied

- MobilityWare's FreeCell help documents the 7/6 cascade deal, four cells,
  alternating-colour runs, foundations, and capacity-limited sequence moves:
  <https://mobilityware.helpshift.com/hc/en/12-freecell/faq/580-how-do-i-play-freecell-1629417414/>
- The FreeCell help supermove explanation confirms that empty cells add one
  movable card and each usable empty cascade doubles capacity:
  <https://www.apeth.com/FreeCellHelpHTML/supermoves.html>
- W3C WCAG 2.2 requires a single-pointer alternative to dragging, so tap/click
  source then destination is the primary interaction:
  <https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements>
- W3C keyboard guidance requires all interactive functionality and visible,
  logical focus without traps:
  <https://www.w3.org/WAI/fundamentals/accessibility-principles/>
- Product implications: expose Undo, Restart, New Deal, elapsed time, moves,
  concise rules, deterministic deal identity, recovery, invalid-move feedback,
  readable responsive cards, and no strategically unsafe forced automation.
