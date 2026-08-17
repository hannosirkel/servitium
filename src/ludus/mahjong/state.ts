import { freeSlots, generateDeal, legalPairs, reshuffle, tileAt, type Assignment, type CertificatePair, type Deal } from './engine';
import { getLayout, type Difficulty } from './layouts';
import { matches } from './tiles';

export type Assistance = { hints: number; undos: number; shuffles: number };
export type Snapshot = { remaining: string[]; assignment: Assignment; selectedId: string | null; certificate: CertificatePair[] };
export type GameHistory = { kind: 'remove' | 'shuffle'; before: Snapshot };
export type MahjongGame = Deal & {
  schemaVersion: 1; kind: 'standard' | 'daily'; startedAt: number; elapsedMs: number; lastActiveAt: number;
  remaining: string[]; initialAssignment: Assignment; selectedId: string | null; history: GameHistory[];
  assistance: Assistance; pairsRemoved: number; completedAt: number | null;
};

const snapshot = (game: MahjongGame): Snapshot => ({
  remaining: [...game.remaining], assignment: { ...game.assignment }, selectedId: game.selectedId,
  certificate: game.certificate.map((pair) => [...pair] as CertificatePair),
});

export function createGame(difficulty: Difficulty, layoutId: string, seed: string, kind: 'standard' | 'daily' = 'standard', now = Date.now()): MahjongGame {
  const deal = generateDeal(difficulty, layoutId, seed);
  return { ...deal, schemaVersion: 1, kind, startedAt: now, elapsedMs: 0, lastActiveAt: now,
    remaining: getLayout(layoutId).slots.map((slot) => slot.id), initialAssignment: { ...deal.assignment },
    selectedId: null, history: [], assistance: { hints: 0, undos: 0, shuffles: 0 }, pairsRemoved: 0, completedAt: null };
}

export function selectTile(game: MahjongGame, slotId: string, now = Date.now()): { game: MahjongGame; event: 'selected' | 'removed' | 'mismatch' | 'blocked' | 'won' } {
  if (game.completedAt || !game.remaining.includes(slotId)) return { game, event: 'blocked' };
  const layout = getLayout(game.layoutId);
  const occupied = new Set(game.remaining);
  if (!legalFree(layout.id, slotId, occupied)) return { game, event: 'blocked' };
  if (!game.selectedId) return { game: { ...game, selectedId: slotId }, event: 'selected' };
  if (game.selectedId === slotId) return { game: { ...game, selectedId: null }, event: 'selected' };
  if (!matches(tileAt(game.assignment, game.selectedId), tileAt(game.assignment, slotId))) {
    return { game: { ...game, selectedId: slotId }, event: 'mismatch' };
  }
  const before = snapshot(game);
  const remaining = game.remaining.filter((id) => id !== game.selectedId && id !== slotId);
  const won = remaining.length === 0;
  return { game: { ...game, remaining, selectedId: null, history: [...game.history, { kind: 'remove', before }],
    pairsRemoved: game.pairsRemoved + 1, completedAt: won ? now : null }, event: won ? 'won' : 'removed' };
}

function legalFree(layoutId: string, slotId: string, occupied: Set<string>): boolean {
  const layout = getLayout(layoutId);
  const freeIds = new Set(freeSlots(layout, occupied).map((slot) => slot.id));
  return freeIds.has(slotId);
}

export function legalPairsFree(layoutId: string, occupied: Set<string>): string[] {
  const layout = getLayout(layoutId);
  return freeSlots(layout, occupied).map((slot) => slot.id);
}

export const availablePairs = (game: MahjongGame): CertificatePair[] => legalPairs(getLayout(game.layoutId), new Set(game.remaining), game.assignment);

export function hint(game: MahjongGame): { game: MahjongGame; pair: CertificatePair | null } {
  const pairs = availablePairs(game);
  if (!pairs.length) return { game, pair: null };
  const layout = getLayout(game.layoutId);
  const scored = pairs.map((pair) => {
    const remaining = new Set(game.remaining.filter((id) => !pair.includes(id)));
    return { pair, score: legalPairsFree(layout.id, remaining).length };
  }).sort((a, b) => b.score - a.score);
  return { game: { ...game, assistance: { ...game.assistance, hints: game.assistance.hints + 1 } }, pair: scored[0].pair };
}

export function undo(game: MahjongGame): MahjongGame {
  const entry = game.history.at(-1);
  if (!entry) return game;
  return { ...game, ...entry.before, completedAt: null, history: game.history.slice(0, -1),
    pairsRemoved: entry.kind === 'remove' ? Math.max(0, game.pairsRemoved - 1) : game.pairsRemoved,
    assistance: { ...game.assistance, undos: game.assistance.undos + 1 } };
}

export function shuffleGame(game: MahjongGame): MahjongGame {
  if (!game.remaining.length) return game;
  const before = snapshot(game);
  const result = reshuffle(getLayout(game.layoutId), game.remaining, game.assignment, `${game.seed}:${game.assistance.shuffles + 1}`);
  return { ...game, assignment: result.assignment, certificate: result.certificate, selectedId: null,
    history: [...game.history, { kind: 'shuffle', before }], assistance: { ...game.assistance, shuffles: game.assistance.shuffles + 1 } };
}

export function restart(game: MahjongGame, now = Date.now()): MahjongGame {
  return { ...game, assignment: { ...game.initialAssignment }, remaining: getLayout(game.layoutId).slots.map((slot) => slot.id),
    selectedId: null, history: [], assistance: { hints: 0, undos: 0, shuffles: 0 }, pairsRemoved: 0,
    elapsedMs: 0, startedAt: now, lastActiveAt: now, completedAt: null };
}
