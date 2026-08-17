export type GameCatalogueEntry = {
  id: string;
  title: string;
  description: string;
  route: string;
  mark: string;
  status: 'available';
};

export const GAME_CATALOGUE: GameCatalogueEntry[] = [{
  id: 'mahjong-solitaire',
  title: 'Mahjong Solitaire',
  description: 'Clear a layered board by matching free tiles.',
  route: '/ludus/mahjong',
  mark: '🀄',
  status: 'available',
}];
