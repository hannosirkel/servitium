import { seededRandom, shuffled } from '../mahjong/random';

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Card = { id: string; suit: Suit; rank: number; color: 'red' | 'black' };
export type Source = { kind: 'cascade'; index: number; cardIndex: number } | { kind: 'cell'; index: number };
export type Destination = { kind: 'cascade' | 'cell'; index: number } | { kind: 'foundation'; suit: Suit };
export type Snapshot = Pick<FreeCellGame, 'cascades' | 'cells' | 'foundations' | 'moves'>;
export type FreeCellGame = {
  version: 1; deal: string; cascades: Card[][]; cells: (Card | null)[];
  foundations: Record<Suit, Card[]>; moves: number; elapsedMs: number; history: Snapshot[];
};
export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const color = (suit: Suit) => suit === 'diamonds' || suit === 'hearts' ? 'red' : 'black';
export const deck = (): Card[] => SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({ id: `${suit}-${index + 1}`, suit, rank: index + 1, color: color(suit) })));
export function newGame(deal: string): FreeCellGame {
  const cards = shuffled(deck(), seededRandom(`freecell:${deal}`));
  const cascades = Array.from({ length: 8 }, () => [] as Card[]);
  cards.forEach((card, index) => cascades[index % 8].push(card));
  return { version: 1, deal, cascades, cells: [null, null, null, null], foundations: { clubs: [], diamonds: [], hearts: [], spades: [] }, moves: 0, elapsedMs: 0, history: [] };
}
export const canStack = (card: Card, target: Card) => card.color !== target.color && card.rank + 1 === target.rank;
export function movableRun(cards: Card[], start: number): boolean { return cards.slice(start, -1).every((card, index) => canStack(cards[start + index + 1], card)); }
export function capacity(game: FreeCellGame, destination: number): number {
  const cells = game.cells.filter((card) => !card).length;
  const empty = game.cascades.filter((column, index) => !column.length && index !== destination).length;
  return (cells + 1) * (2 ** empty);
}
const snapshot = (game: FreeCellGame): Snapshot => ({ cascades: game.cascades.map((column) => [...column]), cells: [...game.cells], foundations: Object.fromEntries(SUITS.map((suit) => [suit, [...game.foundations[suit]]])) as Record<Suit, Card[]>, moves: game.moves });
function take(game: FreeCellGame, source: Source): Card[] | null {
  if (source.kind === 'cell') return game.cells[source.index] ? [game.cells[source.index]!] : null;
  const column = game.cascades[source.index];
  if (!column[source.cardIndex] || !movableRun(column, source.cardIndex)) return null;
  return column.slice(source.cardIndex);
}
export function move(game: FreeCellGame, source: Source, destination: Destination): FreeCellGame | null {
  const cards = take(game, source); if (!cards) return null;
  if (destination.kind !== 'cascade' && cards.length !== 1) return null;
  if (destination.kind === 'cell' && game.cells[destination.index]) return null;
  if (destination.kind === 'foundation') {
    const card = cards[0]; const pile = game.foundations[destination.suit];
    if (card.suit !== destination.suit || card.rank !== pile.length + 1) return null;
  }
  if (destination.kind === 'cascade') {
    if (cards.length > capacity(game, destination.index)) return null;
    const target = game.cascades[destination.index].at(-1);
    if (target && !canStack(cards[0], target)) return null;
  }
  if (source.kind === destination.kind && 'index' in destination && source.index === destination.index) return null;
  const next: FreeCellGame = { ...game, cascades: game.cascades.map((column) => [...column]), cells: [...game.cells], foundations: Object.fromEntries(SUITS.map((suit) => [suit, [...game.foundations[suit]]])) as Record<Suit, Card[]>, moves: game.moves + 1, history: [...game.history, snapshot(game)] };
  if (source.kind === 'cell') next.cells[source.index] = null; else next.cascades[source.index].splice(source.cardIndex);
  if (destination.kind === 'cell') next.cells[destination.index] = cards[0];
  else if (destination.kind === 'foundation') next.foundations[destination.suit].push(cards[0]);
  else next.cascades[destination.index].push(...cards);
  return next;
}
export function undo(game: FreeCellGame): FreeCellGame { const prior = game.history.at(-1); return prior ? { ...game, ...prior, history: game.history.slice(0, -1) } : game; }
export const won = (game: FreeCellGame) => SUITS.every((suit) => game.foundations[suit].length === 13);
export const rankLabel = (rank: number) => ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][rank];
export const suitMark: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
