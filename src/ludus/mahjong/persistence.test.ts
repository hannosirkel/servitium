import { describe, expect, it } from 'vitest';
import { createGame } from './state';
import { dailySeed, DEFAULT_SETTINGS, GAME_KEY, loadSettings, restoreGame, saveGame } from './persistence';

function storage(initial: Record<string, string> = {}) {
  const values = { ...initial };
  return { getItem: (key: string) => values[key] ?? null, setItem: (key: string, value: string) => { values[key] = value; } };
}

describe('Mahjong persistence', () => {
  it('round trips a game and rejects corrupt or incompatible state', () => {
    const target = storage(); const game = createGame('medium', 'turtle', 'persist', 'daily', 10);
    saveGame(target, game);
    expect(restoreGame(target)).toEqual(game);
    expect(restoreGame(storage({ [GAME_KEY]: '{bad' }))).toBeNull();
    expect(restoreGame(storage({ [GAME_KEY]: JSON.stringify({ ...game, schemaVersion: 9 }) }))).toBeNull();
  });
  it('recovers settings independently and keeps daily seeds stable', () => {
    expect(loadSettings(storage({ 'servitium.mahjong.settings.v1': '{bad' }))).toEqual(DEFAULT_SETTINGS);
    expect(dailySeed('2026-08-16')).toBe(dailySeed('2026-08-16'));
    expect(dailySeed('2026-08-17')).not.toBe(dailySeed('2026-08-16'));
  });
});
