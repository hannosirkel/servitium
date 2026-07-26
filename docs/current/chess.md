# Chess Clock

Chess Clock is served at `/chess/`; `/chess-clock` is a compatibility redirect.
It provides Bullet 1+0, Blitz 3+2, Rapid 15+10, and Classical 90+30 presets.

Custom games support shared or player-specific starting time, no bonus,
Fischer increment, or simple delay. Tapping the player who made the first move
starts the opponent's clock, matching a physical chess clock. During play only
the active clock can be tapped to switch turns. The game can be paused and
resumed.

The header exposes the shared full-screen control independently of clock
settings and game state.

Running time is derived from wall-clock timestamps so background tabs and page
reloads do not stop or drift the clock. Active state is stored in
`localStorage`. Resetting an active game requires confirmation, and leaving
while a clock runs triggers the browser's navigation warning.
