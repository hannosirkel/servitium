import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT, STORAGE_KEY, adjustCommanderDamage, adjustLife, adjustPoison, createGame,
  persistGame, playerWarnings, poisonLimit, redo, rematch, restoreGame, setTurn, undo,
} from './logic';

describe('MTG game model', () => {
  it.each([2, 3, 4])('creates a %i player game', (playerCount) => {
    const game = createGame({ format: 'constructed', playerCount }, 100);
    expect(game.players).toHaveLength(playerCount);
    expect(game.players.every((player) => player.life === 20)).toBe(true);
    expect(game.seatCount).toBe(playerCount);
  });

  it('uses verified format starting life', () => {
    expect(createGame({ format: 'commander', playerCount: 4 }).startingLife).toBe(40);
    expect(createGame({ format: 'brawl', playerCount: 2 }).startingLife).toBe(25);
    expect(createGame({ format: 'brawl', playerCount: 3 }).startingLife).toBe(30);
    const teams = createGame({ format: 'two-headed-giant', playerCount: 4 });
    expect(teams.players).toHaveLength(2);
    expect(teams.seatCount).toBe(4);
    expect(teams.players.map((team) => team.life)).toEqual([30, 30]);
    expect(poisonLimit(teams)).toBe(15);
  });

  it('applies small and large life changes with exact undo and redo', () => {
    const initial = createGame({ format: 'constructed', playerCount: 2 }, 1);
    const changed = adjustLife(adjustLife(initial, 'player-1', -5, 2), 'player-1', 1, 3);
    expect(changed.players[0].life).toBe(16);
    expect(changed.history.map((entry) => entry.label)).toEqual(['Player 1 -5 life', 'Player 1 +1 life']);
    const undone = undo(changed, 4);
    expect(undone.players[0].life).toBe(15);
    expect(redo(undone, 5).players[0].life).toBe(16);
  });

  it('couples commander damage to life and warns at 21, not 20', () => {
    const initial = createGame({ format: 'commander', playerCount: 3 });
    const atTwenty = adjustCommanderDamage(initial, 'player-1', 'player-2', 20);
    expect(atTwenty.players[0].life).toBe(20);
    expect(playerWarnings(atTwenty, atTwenty.players[0])).toEqual([]);
    const atTwentyOne = adjustCommanderDamage(atTwenty, 'player-1', 'player-2', 1);
    expect(atTwentyOne.players[0].life).toBe(19);
    expect(playerWarnings(atTwentyOne, atTwentyOne.players[0])).toContain('21+ commander damage from Player 2');
    expect(undo(atTwentyOne).players[0].commanderDamage['player-2']).toBe(20);
  });

  it('warns at the correct poison and life thresholds', () => {
    let game = createGame({ format: 'constructed', playerCount: 2 });
    for (let index = 0; index < 10; index += 1) game = adjustPoison(game, 'player-1', 1, index);
    expect(playerWarnings(game, game.players[0])).toContain('10 poison');
    game = adjustLife(game, 'player-1', -20);
    expect(playerWarnings(game, game.players[0])).toContain('life total is zero or less');
  });

  it('tracks turn order and rematches without retaining counters', () => {
    let game = createGame({ format: 'commander', playerCount: 3 });
    game = setTurn(game, 'player-2');
    game = setTurn(game, 'player-1');
    expect(game.turn).toBe(2);
    const next = rematch(adjustPoison(game, 'player-1', 3));
    expect(next.players[0].poison).toBe(0);
    expect(next.players[0].name).toBe('Player 1');
    expect(next.history).toEqual([]);
  });

  it('caps history', () => {
    let game = createGame({ format: 'constructed', playerCount: 2 });
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) game = adjustLife(game, 'player-1', 1, index);
    expect(game.history).toHaveLength(HISTORY_LIMIT);
  });
});

describe('persistence', () => {
  it('round trips a valid active game', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const game = adjustLife(createGame({ format: 'custom', playerCount: 4, startingLife: 55 }), 'player-4', -5);
    persistGame(storage, game);
    expect(values.has(STORAGE_KEY)).toBe(true);
    expect(restoreGame(storage)?.players[3].life).toBe(50);
  });

  it.each([
    '{broken',
    JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify({ schemaVersion: 1, format: 'commander', players: [] }),
    JSON.stringify({ ...createGame({ format: 'constructed', playerCount: 2 }), history: ['invalid'] }),
  ])('rejects corrupted or unsupported state', (value) => {
    expect(restoreGame({ getItem: () => value })).toBeNull();
  });
});
