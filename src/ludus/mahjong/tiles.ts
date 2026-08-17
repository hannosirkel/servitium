export type TileFamily = 'character' | 'bamboo' | 'circle' | 'wind' | 'dragon' | 'flower' | 'season';
export type TileDefinition = { id: string; family: TileFamily; face: string; label: string; matchGroup: string };

const numbered = (family: 'character' | 'bamboo' | 'circle', symbol: string): TileDefinition[] =>
  Array.from({ length: 9 }, (_, index) => ({
    id: `${family}-${index + 1}`, family, face: `${index + 1}${symbol}`,
    label: `${family[0].toUpperCase()}${family.slice(1)} ${index + 1}`, matchGroup: `${family}-${index + 1}`,
  }));
const named = (family: TileFamily, values: [string, string][], group?: string): TileDefinition[] =>
  values.map(([id, face]) => ({ id: `${family}-${id}`, family, face, label: `${id[0].toUpperCase()}${id.slice(1)} ${family}`, matchGroup: group ?? `${family}-${id}` }));

export const TILE_DEFINITIONS: TileDefinition[] = [
  ...numbered('character', '萬'), ...numbered('bamboo', '竹'), ...numbered('circle', '●'),
  ...named('wind', [['east', '東'], ['south', '南'], ['west', '西'], ['north', '北']]),
  ...named('dragon', [['red', '中'], ['green', '發'], ['white', '□']]),
  ...named('flower', [['plum', '梅'], ['orchid', '蘭'], ['chrysanthemum', '菊'], ['bamboo', '竹']], 'flower'),
  ...named('season', [['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']], 'season'),
];

export function matches(a: TileDefinition, b: TileDefinition): boolean { return a.matchGroup === b.matchGroup; }

export function canonicalTilePool(): TileDefinition[] {
  return TILE_DEFINITIONS.flatMap((tile) => (tile.family === 'flower' || tile.family === 'season') ? [tile] : [tile, tile, tile, tile]);
}

export function tilePool(count: number): TileDefinition[] {
  const full = canonicalTilePool();
  if (count === 144) return full;
  const pairs: TileDefinition[][] = [];
  for (const tile of TILE_DEFINITIONS) {
    if (tile.family === 'flower' || tile.family === 'season') continue;
    pairs.push([tile, tile], [tile, tile]);
  }
  pairs.push([TILE_DEFINITIONS.find((t) => t.id === 'flower-plum')!, TILE_DEFINITIONS.find((t) => t.id === 'flower-orchid')!]);
  pairs.push([TILE_DEFINITIONS.find((t) => t.id === 'flower-chrysanthemum')!, TILE_DEFINITIONS.find((t) => t.id === 'flower-bamboo')!]);
  pairs.push([TILE_DEFINITIONS.find((t) => t.id === 'season-spring')!, TILE_DEFINITIONS.find((t) => t.id === 'season-summer')!]);
  pairs.push([TILE_DEFINITIONS.find((t) => t.id === 'season-autumn')!, TILE_DEFINITIONS.find((t) => t.id === 'season-winter')!]);
  return pairs.slice(0, count / 2).flat();
}
