import { getLayout, type Difficulty, type Layout, type Slot } from './layouts';
import { seededRandom, shuffled } from './random';
import { TILE_DEFINITIONS, matches, tilePool, type TileDefinition } from './tiles';

export const GENERATOR_VERSION = 1;
export type Assignment = Record<string, string>;
export type CertificatePair = [string, string];
export type Deal = {
  generatorVersion: 1; difficulty: Difficulty; layoutId: string; seed: string;
  assignment: Assignment; certificate: CertificatePair[];
};

const overlaps = (a: Slot, b: Slot): boolean =>
  a.x < b.x + 2 && a.x + 2 > b.x && a.y < b.y + 2 && a.y + 2 > b.y;
const sideOverlaps = (a: Slot, b: Slot): boolean => a.y < b.y + 2 && a.y + 2 > b.y;

export function isFree(slot: Slot, occupied: Set<string>, slots: Slot[]): boolean {
  if (!occupied.has(slot.id)) return false;
  const covered = slots.some((other) => occupied.has(other.id) && other.z > slot.z && overlaps(slot, other));
  if (covered) return false;
  const leftBlocked = slots.some((other) => occupied.has(other.id) && other.z === slot.z
    && other.x + 2 === slot.x && sideOverlaps(slot, other));
  const rightBlocked = slots.some((other) => occupied.has(other.id) && other.z === slot.z
    && slot.x + 2 === other.x && sideOverlaps(slot, other));
  return !leftBlocked || !rightBlocked;
}

export function freeSlots(layout: Layout, occupied: Set<string>): Slot[] {
  return layout.slots.filter((slot) => isFree(slot, occupied, layout.slots));
}

export function removalCertificate(layout: Layout, occupiedIds: string[], seed: string): CertificatePair[] {
  const random = seededRandom(`${seed}:geometry`);
  let visits = 0;
  const search = (occupied: Set<string>): CertificatePair[] | null => {
    visits += 1;
    if (visits > 50_000) return null;
    if (!occupied.size) return [];
    const free = freeSlots(layout, occupied);
    if (free.length < 2) return null;
    const highest = Math.max(...free.map((slot) => slot.z));
    const candidates = shuffled(free.flatMap((first, index) => free.slice(index + 1).map((second) => ({
      pair: [first.id, second.id] as CertificatePair,
      priority: Number(first.z === highest && second.z === highest) * 2 + Number(first.z === second.z),
    }))), random).sort((a, b) => b.priority - a.priority);
    for (const candidate of candidates) {
      const next = new Set(occupied); next.delete(candidate.pair[0]); next.delete(candidate.pair[1]);
      const suffix = search(next);
      if (suffix) return [candidate.pair, ...suffix];
    }
    return null;
  };
  const result = search(new Set(occupiedIds));
  if (!result) throw new Error(`Layout ${layout.id} cannot be cleared within the generation bound`);
  return result;
}

function pairPool(tiles: TileDefinition[], seed: string): [TileDefinition, TileDefinition][] {
  const groups = new Map<string, TileDefinition[]>();
  for (const tile of tiles) groups.set(tile.matchGroup, [...(groups.get(tile.matchGroup) ?? []), tile]);
  const pairs: [TileDefinition, TileDefinition][] = [];
  for (const values of groups.values()) {
    if (values.length % 2) throw new Error('Tile multiset is not pair-complete');
    for (let index = 0; index < values.length; index += 2) pairs.push([values[index], values[index + 1]]);
  }
  return shuffled(pairs, seededRandom(`${seed}:faces`));
}

export function generateDeal(difficulty: Difficulty, layoutId: string, seed: string): Deal {
  const layout = getLayout(layoutId);
  if (layout.difficulty !== difficulty) throw new Error('Layout does not match difficulty');
  const certificate = removalCertificate(layout, layout.slots.map((slot) => slot.id), seed);
  const pairs = pairPool(tilePool(layout.slots.length), seed);
  if (pairs.length !== certificate.length) throw new Error('Tile and slot counts differ');
  const assignment: Assignment = {};
  certificate.forEach(([first, second], index) => {
    assignment[first] = pairs[index][0].id;
    assignment[second] = pairs[index][1].id;
  });
  return { generatorVersion: GENERATOR_VERSION, difficulty, layoutId, seed, assignment, certificate };
}

export function tileAt(assignment: Assignment, slotId: string): TileDefinition {
  const tile = TILE_DEFINITIONS.find((item) => item.id === assignment[slotId]);
  if (!tile) throw new Error(`Invalid tile assignment for ${slotId}`);
  return tile;
}

export function legalPairs(layout: Layout, occupied: Set<string>, assignment: Assignment): CertificatePair[] {
  const free = freeSlots(layout, occupied);
  const pairs: CertificatePair[] = [];
  for (let first = 0; first < free.length; first += 1) {
    for (let second = first + 1; second < free.length; second += 1) {
      if (matches(tileAt(assignment, free[first].id), tileAt(assignment, free[second].id))) {
        pairs.push([free[first].id, free[second].id]);
      }
    }
  }
  return pairs;
}

export function reshuffle(layout: Layout, occupiedIds: string[], assignment: Assignment, seed: string): { assignment: Assignment; certificate: CertificatePair[] } {
  const certificate = removalCertificate(layout, occupiedIds, `${seed}:shuffle`);
  const remainingTiles = occupiedIds.map((id) => tileAt(assignment, id));
  const pairs = pairPool(remainingTiles, `${seed}:shuffle`);
  const next = { ...assignment };
  certificate.forEach(([first, second], index) => {
    next[first] = pairs[index][0].id;
    next[second] = pairs[index][1].id;
  });
  return { assignment: next, certificate };
}

export function replayCertificate(layout: Layout, deal: Deal): boolean {
  const occupied = new Set(layout.slots.map((slot) => slot.id));
  return deal.certificate.every(([first, second]) => {
    const valid = isFree(layout.slots.find((slot) => slot.id === first)!, occupied, layout.slots)
      && isFree(layout.slots.find((slot) => slot.id === second)!, occupied, layout.slots)
      && matches(tileAt(deal.assignment, first), tileAt(deal.assignment, second));
    occupied.delete(first); occupied.delete(second);
    return valid;
  }) && occupied.size === 0;
}
