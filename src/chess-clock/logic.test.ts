import { describe, expect, it } from 'vitest';
import { currentRemaining, formatClock, initialState, pauseClock, startClock, switchTurn, type ClockConfig } from './logic';

const increment: ClockConfig = { minutes: [3, 3], bonusSeconds: 2, bonusMode: 'increment' };

describe('chess clock timing', () => {
  it('uses absolute elapsed time and applies increment after a move', () => {
    const started = startClock(initialState(increment), 0, 1_000);
    expect(currentRemaining(started, increment, 6_000)[0]).toBe(175_000);
    const switched = switchTurn(started, increment, 6_000);
    expect(switched.remainingMs).toEqual([177_000, 180_000]);
    expect(switched.activePlayer).toBe(1);
  });

  it('charges only time beyond a Bronstein-style delay', () => {
    const config: ClockConfig = { minutes: [5, 5], bonusSeconds: 5, bonusMode: 'delay' };
    const started = startClock(initialState(config), 1, 10_000);
    expect(currentRemaining(started, config, 14_000)[1]).toBe(300_000);
    expect(currentRemaining(started, config, 18_000)[1]).toBe(297_000);
  });

  it('stops and flags at zero', () => {
    const config: ClockConfig = { minutes: [1, 1], bonusSeconds: 0, bonusMode: 'none' };
    const started = startClock(initialState(config), 0, 0);
    const stopped = pauseClock(started, config, 61_000);
    expect(stopped.flaggedPlayer).toBe(0);
    expect(stopped.running).toBe(false);
  });

  it('formats time without briefly showing the next lower second', () => {
    expect(formatClock(60_001)).toBe('1:01');
    expect(formatClock(60_000)).toBe('1:00');
    expect(formatClock(1)).toBe('0:01');
  });
});
