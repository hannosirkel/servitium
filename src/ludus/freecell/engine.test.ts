import { describe, expect, it } from 'vitest';
import { capacity, deck, move, movableRun, newGame, undo } from './engine';
describe('FreeCell engine', () => {
  it('creates complete deterministic 7/6-card deals', () => { const a = newGame('42'); expect(deck()).toHaveLength(52); expect(new Set(a.cascades.flat().map((c) => c.id)).size).toBe(52); expect(a.cascades.map((c) => c.length)).toEqual([7,7,7,7,6,6,6,6]); expect(a).toEqual(newGame('42')); expect(a).not.toEqual(newGame('43')); });
  it('moves single cards to cells and undoes', () => { const game = newGame('cell'); const next = move(game, { kind:'cascade', index:0, cardIndex:6 }, { kind:'cell', index:0 })!; expect(next.cells[0]).toBeTruthy(); expect(next.moves).toBe(1); expect(undo(next).cascades).toEqual(game.cascades); });
  it('enforces alternating runs, foundations and supermove capacity', () => { const game = newGame('rules'); expect(movableRun([{id:'a',suit:'clubs',rank:5,color:'black'},{id:'b',suit:'hearts',rank:4,color:'red'}],0)).toBe(true); expect(capacity(game,0)).toBe(5); const ace={id:'hearts-1',suit:'hearts' as const,rank:1,color:'red' as const}; const custom={...game,cascades:[[ace],...game.cascades.slice(1)]}; expect(move(custom,{kind:'cascade',index:0,cardIndex:0},{kind:'foundation',suit:'hearts'})?.foundations.hearts).toEqual([ace]); });
});
