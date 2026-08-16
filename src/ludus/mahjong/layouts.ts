export type Difficulty = 'easy' | 'medium' | 'hard';
export type Slot = { id: string; x: number; y: number; z: number };
export type Layout = { id: string; name: string; difficulty: Difficulty; slots: Slot[] };

function rectangle(prefix: string, columns: number, rows: number, z: number, x = 0, y = 0): Slot[] {
  return Array.from({ length: columns * rows }, (_, index) => ({
    id: `${prefix}-${index}`, x: x + (index % columns) * 2, y: y + Math.floor(index / columns) * 2, z,
  }));
}

function layout(id: string, name: string, difficulty: Difficulty, groups: Slot[][]): Layout {
  const slots = groups.flat();
  return { id, name, difficulty, slots: slots.map((slot, index) => ({ ...slot, id: `${id}-${index}` })) };
}

export const LAYOUTS: Layout[] = [
  layout('lotus-garden', 'Lotus Garden', 'easy', [rectangle('a', 10, 6, 0), rectangle('b', 5, 4, 1, 5, 2)]),
  layout('open-gate', 'Open Gate', 'easy', [rectangle('a', 12, 5, 0), rectangle('b', 10, 2, 1, 2, 3)]),
  layout('turtle', 'Turtle', 'medium', [rectangle('a', 12, 8, 0), rectangle('b', 8, 4, 1, 4, 4), rectangle('c', 6, 2, 2, 6, 6), rectangle('d', 2, 2, 3, 10, 6)]),
  layout('bridge', 'Moon Bridge', 'medium', [rectangle('a', 14, 6, 0), rectangle('b', 10, 4, 1, 4, 2), rectangle('c', 8, 2, 2, 6, 4), rectangle('d', 2, 2, 3, 12, 4)]),
  layout('fortress', 'Quiet Fortress', 'hard', [rectangle('a', 12, 8, 0), rectangle('b', 6, 4, 1, 6, 4), rectangle('c', 4, 4, 2, 8, 4), rectangle('d', 2, 2, 3, 10, 6), rectangle('e', 2, 2, 4, 10, 6)]),
  layout('pagoda', 'High Pagoda', 'hard', [rectangle('a', 14, 6, 0), rectangle('b', 8, 4, 1, 6, 2), rectangle('c', 6, 3, 2, 8, 3), rectangle('d', 3, 2, 3, 11, 4), rectangle('e', 2, 2, 4, 12, 4)]),
];

export const layoutsFor = (difficulty: Difficulty): Layout[] => LAYOUTS.filter((item) => item.difficulty === difficulty);
export const getLayout = (id: string): Layout => {
  const found = LAYOUTS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown layout: ${id}`);
  return found;
};
