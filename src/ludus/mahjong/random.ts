export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type Random = { next: () => number; int: (max: number) => number };

export function seededRandom(seed: string): Random {
  let state = hashSeed(seed) || 0x9e3779b9;
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (max) => Math.floor(next() * max) };
}

export function shuffled<T>(items: T[], random: Random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = random.int(index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
