# MTG Life Counter: research-backed design

Date: 2026-07-26

## 1. Executive summary

Servitium should add a local-first life counter at `/mtg/` for two to four
players. The game surface gives most of its area to player name, life total,
and explicit `−5`, `−1`, `+1`, and `+5` controls. Poison and Commander damage
are one visible action away, while history, first player, monarch, initiative,
commander tax, reset, and game setup live in a central toolbar or player sheet.
This is intentionally smaller than feature-maximal competitors: research
repeatedly values a fast, legible counter and reliable recovery above card art,
profiles, statistics, online sync, or exotic variants.

The first release supports Constructed/Limited (20 life), Commander (40),
two-player Brawl (25), multiplayer Brawl (30), Two-Headed Giant (30 shared
team life), and custom two-to-four-player games. It stores one versioned active
game in `localStorage`, keeps an understandable action history, and supports
undo/redo. No account, network, copyrighted card art, mana symbols, or backend
is required.

## 2. Research method and sources

Research combined official rules, recent community discussions, app-store
reviews, competitor descriptions, and an open-source implementation report.
Sources were compared for repeated needs rather than treating one request as a
roadmap.

- Wizards, [Comprehensive Rules](https://magic.wizards.com/en/rules), effective
  2026-06-19: rules 103.4, 104.3d/j, 810, and 903 establish starting life,
  poison, Two-Headed Giant, and Commander-damage behavior.
- Wizards, [Brawl format page](https://magic.wizards.com/en/formats/brawl),
  accessed 2026-07-26: confirms the current two-player 25-life presentation.
- Reddit r/EDH, [browser-based life counter feedback](https://www.reddit.com/r/EDH/comments/1erf5w4/),
  2024-08-13: requests turn tracking; reports that swipe-only Commander damage
  is hard to discover and conflicts with OS gestures; reports runaway input.
- Reddit r/EDH, [One Is Not None beta feedback](https://www.reddit.com/r/EDH/comments/1j2qjb2/),
  2025-03-03: asks for low battery use, more room for secondary counters, and
  optionally coupling Commander damage to life.
- Reddit r/EDH, [what life counters could do better](https://www.reddit.com/r/EDH/comments/1lisf96/),
  2025-06-23: asks for persistent damage history and quick monarch/initiative.
- Reddit r/mtg, [open-source life counter discussion](https://www.reddit.com/r/mtg/comments/1rxbbwp/),
  2026-03-18: exposes a real off-by-one Commander-loss bug (20 versus 21).
- Apple App Store, [Lifetap reviews](https://apps.apple.com/us/app/lifetap-life-counter-for-mtg/id1508241754?see-all=reviews&platform=iphone),
  reviews dated 2022-08-14 onward: praises responsiveness, polish, and advanced
  counters without losing the simple life-counter core; reports accidental
  continuous changes from notification gestures.
- Google Play, [Lifetap listing and reviews](https://play.google.com/store/apps/details?id=com.lifetap),
  accessed 2026-07-26: praises easy Commander/poison entry, offline use, and
  crash recovery; requests damage history.
- Lifetap, [product overview](https://getlifetap.com/), accessed 2026-07-26:
  useful market benchmark for presets, recovery, profiles, counters, and
  history. Product claims were treated as competitor evidence, not user proof.

## 3. Recurring user needs and complaints

Repeated, well-supported needs are a huge readable total, fast explicit input,
Commander damage by source, poison, recovery after interruption, simple reset,
and some way to inspect/reverse mistakes. A visible accumulated delta and
history help players verify combat arithmetic. Player colors and names prevent
confusion around a shared device.

Recurring complaints concern swipe-only controls, small horizontally scrolling
secondary-counter areas, actions near OS edge gestures, accidental repeat
input, unclear destructive actions, and rich feature sets that obscure life.
Commander damage is commonly implemented badly: wrong 20/21 threshold,
unclear source attribution, or inconsistent coupling to life. The first release
therefore uses buttons, attributes damage to a source player, subtracts it from
life in the same atomic action, and records both facts in one history entry.

Battery and tabletop usability argue against continual animation, timers, video,
or network polling. Offline state, wake lock, reduced motion, high contrast,
large targets, and recovery have broader value than cosmetic card backgrounds.

## 4. Competitor and market observations

Lifetap is the repeated community benchmark because it combines a clean core
with deep optional tools, offline behavior, and recovery. Its enormous feature
surface also shows what not to put in the primary view. Lotus is described as
adequate but sometimes clunky; newer products compete on beauty, profiles, art,
or statistics, yet users still compare their in-game ergonomics to Lifetap.

Premium value comes from reliability, layout quality, history, recovery,
low-friction Commander bookkeeping, and personalization that aids recognition.
Planechase/Archenemy card libraries, rankings, cloud profiles, card search, and
playgroup analytics can be attractive but do not improve the core counter and
would add network, licensing, privacy, and maintenance costs.

## 5. Prioritized feature set

### Must have for the first release

- Two to four players; purpose-built 2/3/4-player responsive grids.
- Constructed/Limited, Commander, Brawl, Two-Headed Giant, and custom presets.
- Large totals and explicit `−5`, `−1`, `+1`, `+5` controls.
- Names and four high-contrast, non-art player themes.
- Poison and per-opponent Commander damage, with correct warning thresholds.
- Atomic Commander-damage-plus-life updates.
- Undo, redo, contextual history, confirmed rematch/new game.
- Versioned active-game persistence with defensive validation.
- Keyboard operation, visible focus, live announcements, reduced motion.
- Optional haptics and wake lock when browser support exists.

### Should have

- Commander tax in the player detail sheet.
- Monarch and initiative ownership in the central toolbar.
- Simple dice roll and coin flip.
- Full-screen request where supported.

### Optional follow-up

- Energy, experience, storm, rad, and custom counters.
- Partner Commander sources.
- Saved local player/deck profiles.
- Installable PWA and richer completed-game archive.

### Explicitly deferred or rejected

- Card art/search and proprietary symbols or assets.
- Accounts, sync, backend, rankings, and cloud game history.
- Planechase, Archenemy, Bounty, dungeon maps, deck/card database.
- Gesture-only input, press-and-hold auto-repeat, and hidden edge swipes.
- Six-plus-player layouts. They conflict with the requested two-to-four scope.

## 6. Supported formats and verified rule assumptions

- Constructed/Limited: 20 per player (Comprehensive Rules 103.4).
- Commander: 40 per player (103.4c); a player loses after 21 or more combat
  damage from the same commander over the game (104.3j), not at 20.
- Brawl: 25 in two-player and 30 in multiplayer (103.4d). The setup changes the
  preset automatically with selected player count.
- Two-Headed Giant: four seats represented as two teams, each sharing 30 life
  (103.4a and 810). Poison is team-shared; the rules use a team threshold of 15
  poison counters (810.10).
- Other formats/custom games: two to four independent totals and custom life.
- A normal player loses at zero or less life and at ten poison counters
  (104.3b/d). The UI warns; it does not forcibly lock a player because effects
  can change outcomes and players remain the authority.

## 7. Main user flows

1. Open `/mtg/`; restore a valid active game or show setup.
2. Pick format and player count, edit names/start life if custom, start.
3. Tap explicit life controls. The total changes immediately, feedback is
   announced, haptic feedback is optional, and history/persistence update.
4. Open a player's counters sheet for poison, Commander damage, or tax.
5. Assign monarch or initiative from the table tools when relevant.
6. Undo/redo from the toolbar; inspect recent changes in the history dialog.
7. Choose Rematch to restore starting values with the same setup, or New game
   to return to setup; both confirm after game activity.

## 8. Screen and interaction design

The setup is a compact Servitium panel. The game view fills the viewport with a
small central command bar and colored player panels. Each panel uses a player
name, optional status chips, a very large numeric total, four labeled
buttons, and a visible Counters button with poison/Commander warning summaries.
There are no essential gestures. Detail sheets use native dialog semantics and
large stepper buttons.

Feedback includes immediate numeric changes, a short visible last-change badge,
an `aria-live` message, and optional short vibration. Destructive actions use a
confirm dialog. Undo/redo are disabled when unavailable.

## 9. Two-, three-, and four-player layout behavior

- Two players: two equal panels split vertically in portrait and horizontally
  in landscape. On touch devices the far player's content rotates 180 degrees
  for tabletop use; desktop browsers keep every panel upright.
- Three players: one full-width near panel and two equal far panels; the far
  pair rotate 180 degrees. This avoids an empty fourth quadrant.
- Four players: a two-by-two grid, with the far row rotated 180 degrees.
- Two-Headed Giant: two large team panels, each labeled with both seat names;
  state is shared rather than duplicated.

At extremely narrow sizes controls wrap without dropping below 44 CSS pixels.

## 10. Portrait and landscape behavior

Portrait prioritizes vertical splits and compact central tools. Landscape uses
side-by-side panels for two players and a two-column grid for three/four.
Safe-area insets keep controls away from device edges. The central toolbar is
sticky only within the app and never covers life controls. CSS orientation
queries control geometry; state and DOM order stay stable.

## 11. Progressive disclosure

Life adjustment is always visible. A compact toolbar exposes undo, redo,
history, and game menu. Poison and a warning summary are visible on each panel;
all source-specific Commander damage and tax controls open in a player sheet.
Monarch, initiative, dice, wake lock, and full screen live in the Tools dialog.
This keeps rare mechanics out of every quadrant.

## 12. Accessibility considerations

All actions are semantic buttons with explicit accessible names; dialogs have
headings and close controls; focus returns naturally after close. Controls meet
a 44-pixel target minimum and do not depend on color alone. Text has strong
contrast over solid/gradient backgrounds. `aria-live` announces changes and
status thresholds. Keyboard users can tab to every action and use Enter/Space.
Reduced-motion disables decorative transitions; forced-colors gets visible
borders; orientation is never locked.

## 13. Application state model

`GameState` contains schema version, format, starting life, players/teams,
monarch/initiative owners, history, redo stack,
and updated time. Each player has stable id, name, theme, life, poison,
commander tax, and a map of Commander damage keyed by source player id.

Every mutation is a pure `GameAction` applied by `applyAction`. A history entry
stores a human-readable label plus complete before/after gameplay snapshots.
This is modest in size for at most four players and makes undo/redo exact.
History is capped to prevent unbounded storage.

## 14. Persistence and recovery behavior

After every committed change, the full version-1 game is synchronously written
to `servitium.mtg.game.v1`. Restoration parses unknown JSON defensively,
validates format/player counts/numbers/ids, and discards corrupted or
unsupported state. The setup remains usable if storage throws. A future schema
version should add an explicit migration in `restoreGame`; unknown versions are
not guessed. Rematch persists a clean state; New game removes the key.

## 15. Technical design and Servitium integration

Use the existing React 19, TypeScript, Vite, Vitest, Testing Library, Node static
server, Servitium brand header, Georgia display type, gold accents, dark panels,
focus treatment, safe-area handling, and local-storage style. Add `mtg.html`,
`vite.mtg.config.ts`, `src/mtg/{main,App,logic,styles,testSetup}.tsx/ts`, build
and container wiring, home navigation, and route tests. No shared-component
extraction is justified yet because current modules are small independent
entrypoints and their similar brand markup has meaningful layout differences.

## 16. Risks, trade-offs, and deliberately excluded scope

Full snapshots simplify correctness at the cost of slightly larger local
storage; the bounded four-player state makes that trade worthwhile. Browser
wake lock and full screen are best-effort and require a user gesture/secure
context. Web apps cannot guarantee OS screen-awake behavior. CSS can test
responsive class behavior and viewport-safe structure, but physical
around-the-table usability still needs device testing.

Rules warnings are advisory, not automatic eliminations. Commander partners,
custom commander identities, and Commander Two-Headed Giant introduce source
and team edge cases and are deferred. Standard 2HG is supported.

## 17. Acceptance criteria

- `/mtg` redirects to `/mtg/`, builds into the production image, and appears
  on the home page.
- Setup starts valid 2/3/4-player games for each preset and custom life.
- 2HG creates two 30-life shared team panels from four seats.
- Life, poison, Commander damage, and tax updates are explicit, persistent,
  undoable, redoable, and represented correctly in history.
- Commander damage warns at 21; poison warns at 10 (15 for 2HG); life warns at
  zero without locking input.
- Refresh restores a valid game; malformed/version-unknown storage is ignored.
- Reset/new-game paths confirm after activity.
- Layouts are intentional for two, three, and four players in portrait and
  landscape, with 44-pixel targets and rotated far-side panels.
- Keyboard focus, accessible names, live feedback, reduced motion, contrast,
  and dialog behavior are covered by automated/manual checks.
- Repository typecheck, unit tests, server tests, build, and container contract
  tests pass.
