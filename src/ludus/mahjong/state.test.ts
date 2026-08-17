import { describe, expect, it } from 'vitest';
import { generateDeal } from './engine';
import { getLayout } from './layouts';
import { availablePairs, createGame, restart, selectTile, shuffleGame, undo } from './state';

describe('Mahjong game state', () => {
  it('selects and removes a legal pair, detects a win, and undoes', () => {
    let game = createGame('easy', 'lotus-garden', 'state');
    const first = game.certificate[0];
    game = selectTile(game, first[0]).game;
    const removed = selectTile(game, first[1]).game;
    expect(removed.remaining).toHaveLength(78);
    expect(removed.pairsRemoved).toBe(1);
    expect(undo(removed).remaining).toHaveLength(80);

    const deal = generateDeal('easy', 'lotus-garden', 'tiny');
    const winning = { ...game, assignment: deal.assignment, remaining: [...deal.certificate.at(-1)!], selectedId: null };
    const selected = selectTile(winning, winning.remaining[0]).game;
    expect(selectTile(selected, winning.remaining[1]).event).toBe('won');
  });

  it('restarts exactly and makes shuffle undoable', () => {
    let game = createGame('easy', 'open-gate', 'restart'); const first = game.certificate[0];
    game = selectTile(selectTile(game, first[0]).game, first[1]).game;
    const shuffled = shuffleGame(game);
    expect(shuffled.assistance.shuffles).toBe(1);
    expect(undo(shuffled).assignment).toEqual(game.assignment);
    const fresh = restart(shuffled, 100);
    expect(fresh.assignment).toEqual(fresh.initialAssignment);
    expect(fresh.remaining).toHaveLength(getLayout('open-gate').slots.length);
  });

  it('detects a synthetic dead end with no legal pairs', () => {
    const game = createGame('easy', 'lotus-garden', 'dead-end');
    const free = game.certificate[0];
    const assignment = { ...game.assignment, [free[1]]: 'character-9' };
    expect(availablePairs({ ...game, remaining: free, assignment })).toHaveLength(0);
  });
});
