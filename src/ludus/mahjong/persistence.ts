import { GENERATOR_VERSION, tileAt } from './engine';
import { getLayout, LAYOUTS, type Difficulty } from './layouts';
import type { MahjongGame } from './state';

export type TileStyle = 'traditional' | 'clear';
export type Settings = { tileStyle: TileStyle; highlightFree: boolean; showTimer: boolean; sound: boolean; autoFit: boolean };
export type LayoutStats = { completed: number; bestMs: number | null; clean: number };
export type Statistics = {
  schemaVersion: 1; completed: Record<Difficulty, number>; layouts: Record<string, LayoutStats>;
  dailyDates: string[]; dailyStreak: number; lastDailyDate: string | null;
};

export const GAME_KEY = 'servitium.mahjong.game.v1';
export const SETTINGS_KEY = 'servitium.mahjong.settings.v1';
export const STATS_KEY = 'servitium.mahjong.stats.v1';
export const DEFAULT_SETTINGS: Settings = { tileStyle: 'traditional', highlightFree: true, showTimer: false, sound: true, autoFit: true };
export const EMPTY_STATS: Statistics = { schemaVersion: 1, completed: { easy: 0, medium: 0, hard: 0 }, layouts: {}, dailyDates: [], dailyStreak: 0, lastDailyDate: null };

export function saveGame(storage: Pick<Storage, 'setItem'>, game: MahjongGame): void { storage.setItem(GAME_KEY, JSON.stringify(game)); }
export function clearGame(storage: Pick<Storage, 'removeItem'>): void { storage.removeItem(GAME_KEY); }

export function restoreGame(storage: Pick<Storage, 'getItem'>): MahjongGame | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(GAME_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const game = value as Partial<MahjongGame>;
    if (game.schemaVersion !== 1 || game.generatorVersion !== GENERATOR_VERSION
      || !['easy', 'medium', 'hard'].includes(game.difficulty ?? '') || typeof game.layoutId !== 'string'
      || !LAYOUTS.some((layout) => layout.id === game.layoutId && layout.difficulty === game.difficulty)
      || typeof game.seed !== 'string' || !game.seed.length || !game.assignment || !game.initialAssignment
      || !Array.isArray(game.remaining) || !Array.isArray(game.certificate) || !Array.isArray(game.history)
      || !game.assistance || !Number.isFinite(game.elapsedMs) || !Number.isFinite(game.startedAt)
      || !Number.isInteger(game.pairsRemoved) || !['standard', 'daily'].includes(game.kind ?? '')) return null;
    const layout = getLayout(game.layoutId);
    const ids = new Set(layout.slots.map((slot) => slot.id));
    if (new Set(game.remaining).size !== game.remaining.length || !game.remaining.every((id) => ids.has(id))
      || Object.keys(game.assignment).some((id) => !ids.has(id))) return null;
    layout.slots.forEach((slot) => { tileAt(game.assignment!, slot.id); });
    return game as MahjongGame;
  } catch { return null; }
}

export function loadSettings(storage: Pick<Storage, 'getItem'>): Settings {
  try {
    const value = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null;
    if (!value || !['traditional', 'clear'].includes(value.tileStyle ?? '')
      || ['highlightFree', 'showTimer', 'sound', 'autoFit'].some((key) => typeof value[key as keyof Settings] !== 'boolean')) return DEFAULT_SETTINGS;
    return value as Settings;
  } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(storage: Pick<Storage, 'setItem'>, settings: Settings): void { storage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

export function loadStats(storage: Pick<Storage, 'getItem'>): Statistics {
  try {
    const value = JSON.parse(storage.getItem(STATS_KEY) ?? 'null') as Partial<Statistics> | null;
    if (!value || value.schemaVersion !== 1 || !value.completed || !value.layouts || !Array.isArray(value.dailyDates)) return EMPTY_STATS;
    return value as Statistics;
  } catch { return EMPTY_STATS; }
}
export function saveStats(storage: Pick<Storage, 'setItem'>, stats: Statistics): void { storage.setItem(STATS_KEY, JSON.stringify(stats)); }

const dayBefore = (date: string): string => {
  const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - 1);
  return localDate(value);
};
export const localDate = (date = new Date()): string => {
  const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const dailySeed = (date = localDate()): string => `servitium-mahjong-v${GENERATOR_VERSION}:${date}`;

export function recordCompletion(stats: Statistics, game: MahjongGame): Statistics {
  const clean = game.assistance.hints + game.assistance.undos + game.assistance.shuffles === 0;
  const current = stats.layouts[game.layoutId] ?? { completed: 0, bestMs: null, clean: 0 };
  const date = game.kind === 'daily' ? game.seed.split(':').at(-1)! : null;
  const newDaily = date && !stats.dailyDates.includes(date);
  return {
    ...stats,
    completed: { ...stats.completed, [game.difficulty]: stats.completed[game.difficulty] + 1 },
    layouts: { ...stats.layouts, [game.layoutId]: { completed: current.completed + 1,
      bestMs: current.bestMs === null ? game.elapsedMs : Math.min(current.bestMs, game.elapsedMs), clean: current.clean + (clean ? 1 : 0) } },
    dailyDates: newDaily ? [...stats.dailyDates, date].slice(-400) : stats.dailyDates,
    dailyStreak: newDaily ? (stats.lastDailyDate === dayBefore(date) ? stats.dailyStreak + 1 : 1) : stats.dailyStreak,
    lastDailyDate: newDaily ? date : stats.lastDailyDate,
  };
}
