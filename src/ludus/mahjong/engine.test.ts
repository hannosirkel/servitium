import { describe, expect, it } from 'vitest';
import { freeSlots, generateDeal, isFree, legalPairs, replayCertificate, reshuffle, tileAt } from './engine';
import { LAYOUTS, type Layout } from './layouts';
import { canonicalTilePool, matches, tilePool } from './tiles';

describe('Mahjong matching', () => {
  it('matches exact ordinary tiles and family-wide Flowers and Seasons', () => {
    const pool = canonicalTilePool();
    const bamboo = pool.find((tile) => tile.id === 'bamboo-7')!;
    expect(matches(bamboo, bamboo)).toBe(true);
    expect(matches(bamboo, pool.find((tile) => tile.id === 'bamboo-8')!)).toBe(false);
    expect(matches(pool.find((tile) => tile.id === 'flower-plum')!, pool.find((tile) => tile.id === 'flower-orchid')!)).toBe(true);
    expect(matches(pool.find((tile) => tile.id === 'season-spring')!, pool.find((tile) => tile.id === 'season-winter')!)).toBe(true);
    expect(canonicalTilePool()).toHaveLength(144);
    expect(tilePool(80)).toHaveLength(80);
  });
});

describe('free-tile geometry', () => {
  const layout: Layout = { id: 'test', name: 'Test', difficulty: 'easy', slots: [
    { id: 'left', x: 0, y: 0, z: 0 }, { id: 'middle', x: 2, y: 0, z: 0 }, { id: 'right', x: 4, y: 1, z: 0 },
    { id: 'cover', x: 1, y: 1, z: 1 },
  ] };
  it('handles both-side blocking, one open side, top overlap, half offsets and removed neighbours', () => {
    const all = new Set(layout.slots.map((slot) => slot.id));
    expect(isFree(layout.slots[0], all, layout.slots)).toBe(false); // half-offset cover
    expect(isFree(layout.slots[1], all, layout.slots)).toBe(false); // cover and both sides
    expect(isFree(layout.slots[2], all, layout.slots)).toBe(true); // one side open
    all.delete('cover');
    expect(isFree(layout.slots[1], all, layout.slots)).toBe(false);
    all.delete('left');
    expect(isFree(layout.slots[1], all, layout.slots)).toBe(true);
  });
});

describe('solvable generator', () => {
  it.each(LAYOUTS)('validates $id across dozens of deterministic seeds', (layout) => {
    const signatures = new Set<string>();
    for (let seed = 0; seed < 36; seed += 1) {
      const deal = generateDeal(layout.difficulty, layout.id, `matrix-${seed}`);
      expect(deal.assignment).toEqual(generateDeal(layout.difficulty, layout.id, `matrix-${seed}`).assignment);
      expect(Object.keys(deal.assignment)).toHaveLength(layout.slots.length);
      expect(replayCertificate(layout, deal)).toBe(true);
      signatures.add(layout.slots.slice(0, 12).map((slot) => deal.assignment[slot.id]).join(','));
    }
    expect(signatures.size).toBeGreaterThan(20);
  });

  it('disperses matching tiles across the larger boards', () => {
    for (const layout of LAYOUTS.filter((item) => item.slots.length === 144)) {
      let nearby = 0; let pairs = 0;
      for (let seed = 0; seed < 24; seed += 1) {
        const deal = generateDeal(layout.difficulty, layout.id, `dispersion-${seed}`);
        for (let first = 0; first < layout.slots.length; first += 1) {
          for (let second = first + 1; second < layout.slots.length; second += 1) {
            if (!matches(tileAt(deal.assignment, layout.slots[first].id), tileAt(deal.assignment, layout.slots[second].id))) continue;
            pairs += 1;
            const a = layout.slots[first]; const b = layout.slots[second];
            if (Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2 && Math.abs(a.z - b.z) <= 1) nearby += 1;
          }
        }
      }
      expect(nearby / pairs).toBeLessThan(.08);
    }
  });

  it('starts with legal matches and produces a certificate-cleared shuffle', () => {
    const layout = LAYOUTS[0]; const deal = generateDeal('easy', layout.id, 'shuffle-source');
    expect(legalPairs(layout, new Set(layout.slots.map((slot) => slot.id)), deal.assignment).length).toBeGreaterThan(0);
    const remaining = layout.slots.map((slot) => slot.id).slice(12);
    // Use a certificate suffix so its multiset remains pair-complete.
    const certificateRemaining = deal.certificate.slice(6).flat();
    const shuffled = reshuffle(layout, certificateRemaining, deal.assignment, 'again');
    expect(shuffled.certificate).toHaveLength(certificateRemaining.length / 2);
    expect(certificateRemaining.map((id) => tileAt(deal.assignment, id).matchGroup).sort())
      .toEqual(certificateRemaining.map((id) => tileAt(shuffled.assignment, id).matchGroup).sort());
    expect(remaining.length).toBeGreaterThan(0);
  });

  it('has unique, non-identical slots and even counts for every layout', () => {
    for (const layout of LAYOUTS) {
      expect(layout.slots.length % 2).toBe(0);
      expect(new Set(layout.slots.map((slot) => `${slot.x}:${slot.y}:${slot.z}`)).size).toBe(layout.slots.length);
    }
  });
});
