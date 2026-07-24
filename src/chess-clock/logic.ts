export type Player = 0 | 1;
export type BonusMode = 'none' | 'increment' | 'delay';
export type ClockConfig = {
  minutes: [number, number];
  bonusSeconds: number;
  bonusMode: BonusMode;
};
export type ClockState = {
  remainingMs: [number, number];
  activePlayer: Player | null;
  running: boolean;
  turnStartedAt: number | null;
  moveCount: number;
  flaggedPlayer: Player | null;
};
export type Preset = { id: string; label: string; detail: string; config: ClockConfig };

export const STORAGE_KEY = 'servitium.chess-clock.game.v1';
export const PRESETS: Preset[] = [
  { id: 'bullet', label: 'Bullet', detail: '1 + 0', config: { minutes: [1, 1], bonusSeconds: 0, bonusMode: 'none' } },
  { id: 'blitz', label: 'Blitz', detail: '3 + 2', config: { minutes: [3, 3], bonusSeconds: 2, bonusMode: 'increment' } },
  { id: 'rapid', label: 'Rapid', detail: '15 + 10', config: { minutes: [15, 15], bonusSeconds: 10, bonusMode: 'increment' } },
  { id: 'classical', label: 'Classical', detail: '90 + 30', config: { minutes: [90, 90], bonusSeconds: 30, bonusMode: 'increment' } },
];

export function initialState(config: ClockConfig): ClockState {
  return {
    remainingMs: [config.minutes[0] * 60_000, config.minutes[1] * 60_000],
    activePlayer: null, running: false, turnStartedAt: null, moveCount: 0, flaggedPlayer: null,
  };
}

export function currentRemaining(state: ClockState, config: ClockConfig, now: number): [number, number] {
  if (!state.running || state.activePlayer === null || state.turnStartedAt === null) return state.remainingMs;
  const elapsed = Math.max(0, now - state.turnStartedAt);
  const charged = config.bonusMode === 'delay'
    ? Math.max(0, elapsed - config.bonusSeconds * 1000)
    : elapsed;
  const next: [number, number] = [...state.remainingMs];
  next[state.activePlayer] = Math.max(0, next[state.activePlayer] - charged);
  return next;
}

export function startClock(state: ClockState, player: Player, now: number): ClockState {
  if (state.flaggedPlayer !== null) return state;
  return { ...state, activePlayer: player, running: true, turnStartedAt: now };
}

export function pauseClock(state: ClockState, config: ClockConfig, now: number): ClockState {
  const remainingMs = currentRemaining(state, config, now);
  const flaggedPlayer = state.activePlayer !== null && remainingMs[state.activePlayer] <= 0 ? state.activePlayer : state.flaggedPlayer;
  return { ...state, remainingMs, running: false, turnStartedAt: null, flaggedPlayer };
}

export function switchTurn(state: ClockState, config: ClockConfig, now: number): ClockState {
  if (!state.running || state.activePlayer === null || state.flaggedPlayer !== null) return state;
  const current = state.activePlayer;
  const remainingMs = currentRemaining(state, config, now);
  if (remainingMs[current] <= 0) {
    return { ...state, remainingMs, running: false, turnStartedAt: null, flaggedPlayer: current };
  }
  if (config.bonusMode === 'increment') remainingMs[current] += config.bonusSeconds * 1000;
  return {
    ...state, remainingMs, activePlayer: current === 0 ? 1 : 0,
    turnStartedAt: now, moveCount: state.moveCount + 1,
  };
}

export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function restoreGame(storage: Pick<Storage, 'getItem'>): { config: ClockConfig; state: ClockState } | null {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as { config?: ClockConfig; state?: ClockState } | null;
    if (!parsed?.config || !parsed.state || !Array.isArray(parsed.config.minutes)
      || !Array.isArray(parsed.state.remainingMs) || !['none', 'increment', 'delay'].includes(parsed.config.bonusMode)) return null;
    return parsed as { config: ClockConfig; state: ClockState };
  } catch { return null; }
}
