# MTG Life Counter implementation plan

Date: 2026-07-26

## Ordered implementation

1. Add `src/mtg/logic.ts` with presets, setup normalization, pure state
   transitions, history/undo/redo, threshold helpers, versioned serialization,
   and defensive restoration. Cover it in `src/mtg/logic.test.ts`.
2. Add `mtg.html`, `src/mtg/main.tsx`, `src/mtg/App.tsx`, and
   `src/mtg/styles.css`. Build setup, responsive player grids, explicit life
   controls, counter/history/tools dialogs, status feedback, wake lock, full
   screen, haptics, and persistence.
3. Add `src/mtg/App.test.tsx` and `src/mtg/testSetup.ts`. Test setup counts,
   changes, large steps, undo/redo/history, confirmations, format presets,
   poison, Commander damage, 2HG, keyboard semantics, responsive classes, and
   corrupted storage.
4. Add `vite.mtg.config.ts`; update `package.json` build scripts and Vitest
   setup; update `Dockerfile` to copy/build the entrypoint and source.
5. Add `/mtg` redirect/static serving and a home navigation card in
   `src/server.js`; extend `test/server.test.js` and README.
6. Run focused tests, then `npm run format:check`, `npm run typecheck`,
   `npm run test:unit`, `npm test`, `npm run build`, and
   `bash test/container.test.sh`. Exercise the built route with the Node server
   and inspect representative narrow portrait and short landscape layouts.

## Files and reuse

Create:

- `docs/working/mtg-life-counter-implementation.md`
- `mtg.html`, `vite.mtg.config.ts`
- `src/mtg/App.tsx`, `logic.ts`, `styles.css`, `main.tsx`, `testSetup.ts`
- `src/mtg/App.test.tsx`, `logic.test.ts`

Modify:

- `package.json`, `Dockerfile`, `README.md`
- `src/server.js`, `test/server.test.js`
- `vite.config.ts` for shared Vitest setup discovery

Reuse the Servitium brand link/mark, dark stone panels, gold accents, Georgia
display typography, safe-area CSS, focus-visible and reduced-motion patterns,
native `dialog`, React local state, and tested local-storage approach. Do not
generalize a shared shell in this change: extracting the three currently small
and layout-specific shells would enlarge review scope without reducing MTG
complexity.

## State and transitions

`createGame(setup)` creates normalized stable players or two 2HG teams.
`commit(game, mutation, label)` captures before/after snapshots, clears redo,
caps history, and stamps the update. Domain helpers implement life, poison,
Commander damage plus life, tax, and global-role changes. `undo` applies
the previous snapshot and pushes the entry to redo; `redo` reverses that.
Rematch creates fresh values with the same format/names/themes.

Presets are data objects:

- Constructed/Limited: 20, 2 default players
- Commander: 40, 4 default players and Commander counters
- Brawl: computed 25 for two, otherwise 30
- Two-Headed Giant: fixed four seats represented by two shared 30-life teams
- Custom: supplied 1–999 starting life and two-to-four players

## Persistence and compatibility

Use `servitium.mtg.game.v1` and embed `schemaVersion: 1`. Validate all restored
ids, player counts, numeric bounds, Commander maps, and history snapshots.
Unknown versions or malformed JSON return `null` without overwriting the bad
value until a new valid game starts. Catch quota/security exceptions. A schema
change must increment the key or add an explicit migration and fixture tests.

## Responsive and accessible implementation

Use a stable CSS grid with `data-count` and orientation queries:

- two: stacked portrait, side-by-side landscape;
- three: one near full-width plus two far halves portrait, intentional
  one-plus-two landscape arrangement;
- four: two-by-two;
- far-side panels receive a presentation-only 180-degree inner rotation on
  coarse-pointer touch devices; desktop panels stay upright.

Every target is at least 44 px. Use buttons rather than gesture surfaces,
visible text/icon-independent labels, `aria-live`, native dialog focus
management, `aria-pressed` status controls, focus-visible outlines, solid
contrast, safe-area padding, reduced-motion and forced-colors rules. Keyboard
coverage relies on native button behavior and tests Enter activation.

## Test coverage

Unit:

- presets and starting 2/3/4-player state;
- Brawl 25/30 and 2HG shared 30 life;
- `±1/±5`, Commander coupled life, poison and 21/10/15 thresholds;
- exact undo/redo and history labels/order;
- rematch; bounded history;
- valid persistence, corrupt JSON, unsupported schema, invalid numbers/ids.

Component:

- setup and each player count;
- life and large adjustments; live feedback;
- undo/redo and history dialog;
- reset/new-game confirmation;
- poison and per-source Commander controls;
- table-role tools and 2HG UI;
- keyboard activation and accessible dialog/control names;
- `data-count` hooks used by portrait/landscape CSS.

Integration:

- home link, canonical redirect, built HTML/assets, 404 safety.

Manual matrix:

- 320×568, 390×844, 768×1024 portrait;
- 568×320, 844×390, 1024×768 landscape;
- 2, 3, 4 independent players and 2HG;
- each panel operated from its table edge;
- long player names, negative/three-digit life, poison/Commander warnings;
- refresh/restart, private-storage failure, wake lock/fullscreen unsupported;
- keyboard-only, screen-reader announcements, reduced motion, forced colors.

## Completion criteria

The behavior documented in `docs/current/mtg.md` is implemented; no new runtime
dependencies exist; all specified automated tests and repository validation
commands pass; the production server serves `/mtg/`; changes are limited to the
module, integration, tests, documentation, and necessary build wiring; and the
final diff contains no licensed Wizards art, symbols, credentials, or
unrelated changes.
