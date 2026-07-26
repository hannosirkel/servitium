export type FormatId = 'constructed' | 'commander' | 'brawl' | 'two-headed-giant' | 'custom';
export type ThemeId = 'ember' | 'tide' | 'grove' | 'amethyst';

export type PlayerState = {
  id: string;
  name: string;
  theme: ThemeId;
  life: number;
  poison: number;
  commanderTax: number;
  commanderDamage: Record<string, number>;
};

export type Snapshot = {
  players: PlayerState[];
  activePlayerId: string | null;
  firstPlayerId: string | null;
  monarchId: string | null;
  initiativeId: string | null;
  turn: number;
};

export type HistoryEntry = {
  id: string;
  label: string;
  timestamp: number;
  before: Snapshot;
  after: Snapshot;
};

export type GameState = Snapshot & {
  schemaVersion: 1;
  format: FormatId;
  startingLife: number;
  seatCount: number;
  history: HistoryEntry[];
  future: HistoryEntry[];
  updatedAt: number;
};

export type GameSetup = {
  format: FormatId;
  playerCount: number;
  startingLife?: number;
  names?: string[];
};

export type FormatPreset = {
  id: FormatId;
  label: string;
  detail: string;
  defaultPlayers: number;
};

export const STORAGE_KEY = 'servitium.mtg.game.v1';
export const HISTORY_LIMIT = 60;
export const THEMES: ThemeId[] = ['ember', 'tide', 'grove', 'amethyst'];
export const PRESETS: FormatPreset[] = [
  { id: 'constructed', label: 'Constructed / Limited', detail: '20 life', defaultPlayers: 2 },
  { id: 'commander', label: 'Commander', detail: '40 life', defaultPlayers: 4 },
  { id: 'brawl', label: 'Brawl', detail: '25 / 30 life', defaultPlayers: 2 },
  { id: 'two-headed-giant', label: 'Two-Headed Giant', detail: '2 teams · 30 shared life', defaultPlayers: 4 },
  { id: 'custom', label: 'Custom', detail: 'Choose life and seats', defaultPlayers: 2 },
];

const copyPlayers = (players: PlayerState[]): PlayerState[] => players.map((player) => ({
  ...player,
  commanderDamage: { ...player.commanderDamage },
}));

export function snapshot(game: Snapshot): Snapshot {
  return {
    players: copyPlayers(game.players),
    activePlayerId: game.activePlayerId,
    firstPlayerId: game.firstPlayerId,
    monarchId: game.monarchId,
    initiativeId: game.initiativeId,
    turn: game.turn,
  };
}

export function startingLifeFor(format: FormatId, playerCount: number, customLife = 20): number {
  if (format === 'commander') return 40;
  if (format === 'brawl') return playerCount === 2 ? 25 : 30;
  if (format === 'two-headed-giant') return 30;
  if (format === 'custom') return Math.min(999, Math.max(1, Math.round(customLife)));
  return 20;
}

export function createGame(setup: GameSetup, now = Date.now()): GameState {
  const seatCount = setup.format === 'two-headed-giant'
    ? 4
    : Math.min(4, Math.max(2, Math.round(setup.playerCount)));
  const life = startingLifeFor(setup.format, seatCount, setup.startingLife);
  const count = setup.format === 'two-headed-giant' ? 2 : seatCount;
  const defaultNames = setup.format === 'two-headed-giant'
    ? ['Team One', 'Team Two']
    : Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
  const players: PlayerState[] = Array.from({ length: count }, (_, index) => ({
    id: setup.format === 'two-headed-giant' ? `team-${index + 1}` : `player-${index + 1}`,
    name: setup.names?.[index]?.trim().slice(0, 24) || defaultNames[index],
    theme: THEMES[index],
    life,
    poison: 0,
    commanderTax: 0,
    commanderDamage: {},
  }));
  return {
    schemaVersion: 1,
    format: setup.format,
    startingLife: life,
    seatCount,
    players,
    activePlayerId: null,
    firstPlayerId: null,
    monarchId: null,
    initiativeId: null,
    turn: 1,
    history: [],
    future: [],
    updatedAt: now,
  };
}

export function commit(game: GameState, label: string, mutate: (draft: Snapshot) => void, now = Date.now()): GameState {
  const before = snapshot(game);
  const after = snapshot(game);
  mutate(after);
  const entry: HistoryEntry = { id: `${now}-${game.history.length}`, label, timestamp: now, before, after };
  return {
    ...game,
    ...after,
    history: [...game.history, entry].slice(-HISTORY_LIMIT),
    future: [],
    updatedAt: now,
  };
}

export function adjustLife(game: GameState, playerId: string, amount: number, now = Date.now()): GameState {
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !Number.isInteger(amount) || amount === 0) return game;
  const sign = amount > 0 ? '+' : '';
  return commit(game, `${player.name} ${sign}${amount} life`, (draft) => {
    const target = draft.players.find((item) => item.id === playerId);
    if (target) target.life = Math.min(9999, Math.max(-999, target.life + amount));
  }, now);
}

export function adjustPoison(game: GameState, playerId: string, amount: number, now = Date.now()): GameState {
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !Number.isInteger(amount) || amount === 0) return game;
  return commit(game, `${player.name} ${amount > 0 ? '+' : ''}${amount} poison`, (draft) => {
    const target = draft.players.find((item) => item.id === playerId);
    if (target) target.poison = Math.min(99, Math.max(0, target.poison + amount));
  }, now);
}

export function adjustCommanderDamage(
  game: GameState, targetId: string, sourceId: string, amount: number, now = Date.now(),
): GameState {
  const target = game.players.find((item) => item.id === targetId);
  const source = game.players.find((item) => item.id === sourceId);
  if (!target || !source || targetId === sourceId || !Number.isInteger(amount) || amount === 0) return game;
  return commit(game, `${target.name} ${amount > 0 ? '+' : ''}${amount} commander damage from ${source.name}`, (draft) => {
    const player = draft.players.find((item) => item.id === targetId);
    if (!player) return;
    const previous = player.commanderDamage[sourceId] ?? 0;
    const next = Math.min(999, Math.max(0, previous + amount));
    const applied = next - previous;
    player.commanderDamage[sourceId] = next;
    player.life = Math.min(9999, Math.max(-999, player.life - applied));
  }, now);
}

export function adjustCommanderTax(game: GameState, playerId: string, amount: number, now = Date.now()): GameState {
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !Number.isInteger(amount) || amount === 0) return game;
  return commit(game, `${player.name} commander tax ${amount > 0 ? '+' : ''}${amount}`, (draft) => {
    const target = draft.players.find((item) => item.id === playerId);
    if (target) target.commanderTax = Math.min(99, Math.max(0, target.commanderTax + amount));
  }, now);
}

export function setTurn(game: GameState, playerId: string, now = Date.now()): GameState {
  const index = game.players.findIndex((player) => player.id === playerId);
  if (index < 0) return game;
  const nextTurn = game.activePlayerId && index <= game.players.findIndex((player) => player.id === game.activePlayerId)
    ? game.turn + 1
    : game.turn;
  return commit(game, `${game.players[index].name}'s turn`, (draft) => {
    draft.activePlayerId = playerId;
    draft.firstPlayerId ??= playerId;
    draft.turn = nextTurn;
  }, now);
}

export function setRole(game: GameState, role: 'monarchId' | 'initiativeId', playerId: string | null, now = Date.now()): GameState {
  const name = playerId ? game.players.find((player) => player.id === playerId)?.name : 'Nobody';
  if (playerId && !name) return game;
  const label = role === 'monarchId' ? 'monarch' : 'initiative';
  return commit(game, `${name} has ${label}`, (draft) => { draft[role] = playerId; }, now);
}

export function undo(game: GameState, now = Date.now()): GameState {
  const entry = game.history.at(-1);
  if (!entry) return game;
  return {
    ...game,
    ...snapshot(entry.before),
    history: game.history.slice(0, -1),
    future: [entry, ...game.future],
    updatedAt: now,
  };
}

export function redo(game: GameState, now = Date.now()): GameState {
  const entry = game.future[0];
  if (!entry) return game;
  return {
    ...game,
    ...snapshot(entry.after),
    history: [...game.history, entry].slice(-HISTORY_LIMIT),
    future: game.future.slice(1),
    updatedAt: now,
  };
}

export function rematch(game: GameState, now = Date.now()): GameState {
  const next = createGame({
    format: game.format,
    playerCount: game.seatCount,
    startingLife: game.startingLife,
    names: game.players.map((player) => player.name),
  }, now);
  next.players.forEach((player, index) => { player.theme = game.players[index]?.theme ?? player.theme; });
  return next;
}

export function poisonLimit(game: Pick<GameState, 'format'>): number {
  return game.format === 'two-headed-giant' ? 15 : 10;
}

export function playerWarnings(game: GameState, player: PlayerState): string[] {
  const warnings: string[] = [];
  if (player.life <= 0) warnings.push('life total is zero or less');
  if (player.poison >= poisonLimit(game)) warnings.push(`${player.poison} poison`);
  for (const [sourceId, damage] of Object.entries(player.commanderDamage)) {
    if (damage >= 21) {
      const source = game.players.find((item) => item.id === sourceId);
      warnings.push(`21+ commander damage${source ? ` from ${source.name}` : ''}`);
    }
  }
  return warnings;
}

function validPlayer(value: unknown): value is PlayerState {
  if (!value || typeof value !== 'object') return false;
  const player = value as Partial<PlayerState>;
  return typeof player.id === 'string' && player.id.length > 0
    && typeof player.name === 'string' && player.name.length > 0 && player.name.length <= 24
    && THEMES.includes(player.theme as ThemeId)
    && Number.isInteger(player.life) && Number(player.life) >= -999 && Number(player.life) <= 9999
    && Number.isInteger(player.poison) && Number(player.poison) >= 0 && Number(player.poison) <= 99
    && Number.isInteger(player.commanderTax) && Number(player.commanderTax) >= 0
    && !!player.commanderDamage && typeof player.commanderDamage === 'object'
    && Object.values(player.commanderDamage).every((damage) => Number.isInteger(damage) && damage >= 0 && damage <= 999);
}

function validSnapshot(value: unknown, ids: Set<string>, playerCount: number): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<Snapshot>;
  return Array.isArray(state.players) && state.players.length === playerCount
    && state.players.every(validPlayer)
    && new Set(state.players.map((player) => player.id)).size === playerCount
    && state.players.every((player) => ids.has(player.id)
      && Object.keys(player.commanderDamage).every((id) => ids.has(id)))
    && [state.activePlayerId, state.firstPlayerId, state.monarchId, state.initiativeId]
      .every((id) => id === null || (typeof id === 'string' && ids.has(id)))
    && Number.isInteger(state.turn) && Number(state.turn) >= 1;
}

function validHistoryEntry(value: unknown, ids: Set<string>, playerCount: number): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<HistoryEntry>;
  return typeof entry.id === 'string' && typeof entry.label === 'string'
    && entry.label.length > 0 && entry.label.length <= 120 && Number.isFinite(entry.timestamp)
    && validSnapshot(entry.before, ids, playerCount) && validSnapshot(entry.after, ids, playerCount);
}

export function restoreGame(storage: Pick<Storage, 'getItem'>): GameState | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const game = parsed as Partial<GameState>;
    if (game.schemaVersion !== 1 || !PRESETS.some((preset) => preset.id === game.format)
      || !Number.isInteger(game.startingLife) || !Number.isInteger(game.seatCount)
      || !Array.isArray(game.players) || !game.players.every(validPlayer)
      || !Array.isArray(game.history) || game.history.length > HISTORY_LIMIT
      || !Array.isArray(game.future) || game.future.length > HISTORY_LIMIT
      || !Number.isInteger(game.turn) || !Number.isFinite(game.updatedAt)) return null;
    const expectedPlayers = game.format === 'two-headed-giant' ? 2 : game.seatCount;
    if (game.seatCount! < 2 || game.seatCount! > 4 || game.players.length !== expectedPlayers) return null;
    const ids = new Set(game.players.map((player) => player.id));
    if (ids.size !== game.players.length
      || game.players.some((player) => Object.keys(player.commanderDamage).some((id) => !ids.has(id)))
      || !game.history.every((entry) => validHistoryEntry(entry, ids, game.players!.length))
      || !game.future.every((entry) => validHistoryEntry(entry, ids, game.players!.length))
      || [game.activePlayerId, game.firstPlayerId, game.monarchId, game.initiativeId]
        .some((id) => id !== null && id !== undefined && !ids.has(id))) return null;
    return game as GameState;
  } catch {
    return null;
  }
}

export function persistGame(storage: Pick<Storage, 'setItem'>, game: GameState): void {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch { /* storage can be unavailable */ }
}
