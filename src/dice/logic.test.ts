import { describe, expect, it, vi } from 'vitest';
import {
  DICE_TYPES, HISTORY_KEY, HISTORY_LIMIT, SHAKE_COOLDOWN, addHistory, clampCount,
  clearHistory, isFlick, makeRecord, restoreHistory, shouldShakeRoll,
  type ThrowRecord,
} from './logic';

describe('dice configuration', () => {
  it('supports the required polyhedral dice', () => {
    expect(DICE_TYPES).toEqual([4, 6, 8, 10, 12, 20]);
  });

  it('keeps selected quantity between one and ten', () => {
    expect(clampCount(-5)).toBe(1);
    expect(clampCount(6)).toBe(6);
    expect(clampCount(99)).toBe(10);
  });

  it('calculates individual results and total', () => {
    expect(makeRecord(8, 3, [3, 7, 5], 10)).toMatchObject({
      die: 8, count: 3, values: [3, 7, 5], total: 15,
    });
  });
});

describe('history', () => {
  it('limits history to the newest ten entries', () => {
    let history: ThrowRecord[] = [];
    for (let index = 0; index < 14; index += 1) {
      history = addHistory(history, makeRecord(6, 1, [index % 6 + 1], index));
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].timestamp).toBe(13);
  });

  it('restores valid persisted history', () => {
    const record = makeRecord(12, 2, [4, 9], 100);
    const storage = { getItem: vi.fn(() => JSON.stringify([record])) };
    expect(restoreHistory(storage)).toEqual([record]);
    expect(storage.getItem).toHaveBeenCalledWith(HISTORY_KEY);
  });

  it('clears persisted history', () => {
    const storage = { removeItem: vi.fn() };
    clearHistory(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
  });
});

describe('gesture recognition and lockout', () => {
  it('recognizes deliberate directional flicks but rejects taps', () => {
    expect(isFlick({ x: 20, y: 20, time: 0 }, { x: 120, y: 95, time: 220 })).toBe(true);
    expect(isFlick({ x: 20, y: 20, time: 0 }, { x: 27, y: 24, time: 100 })).toBe(false);
  });

  it('requires shake threshold, cooldown and an idle animation state', () => {
    expect(shouldShakeRoll(25, 5000, 0, false)).toBe(true);
    expect(shouldShakeRoll(12, 5000, 0, false)).toBe(false);
    expect(shouldShakeRoll(25, SHAKE_COOLDOWN - 1, 0, false)).toBe(false);
    expect(shouldShakeRoll(25, 5000, 0, true)).toBe(false);
  });
});
