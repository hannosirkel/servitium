import type { TileDefinition } from './tiles';

const numerals = ['一', '二', '三', '四', '伍', '六', '七', '八', '九'];
const pipColours = ['red', 'blue', 'green', 'blue', 'red', 'green', 'blue', 'green', 'blue'];
const rankOf = (tile: TileDefinition): number => Number(tile.id.split('-')[1]);

export default function TileFace({ tile, clear = false }: { tile: TileDefinition; clear?: boolean }) {
  if (clear) { const part = tile.id.split('-')[1]; return <span className="tile-face clear-face"><strong>{/^\d+$/.test(part) ? part : part.slice(0, 1).toUpperCase()}</strong><small>{tile.family.toUpperCase()}</small></span>; }
  if (tile.family === 'character') return <span className="tile-face tile-character"><b>{numerals[rankOf(tile) - 1]}</b><i>萬</i></span>;
  if (tile.family === 'circle') { const rank = rankOf(tile); return <span className={`tile-face tile-pips pips-${rank}`}>{Array.from({ length: rank }, (_, index) => <i className={pipColours[index]} key={index} />)}</span>; }
  if (tile.family === 'bamboo') {
    const rank = rankOf(tile); if (rank === 1) return <span className="tile-face tile-bamboo bamboo-one"><i className="bird">鳳</i></span>;
    return <span className={`tile-face tile-bamboo bamboo-${rank}`}>{Array.from({ length: rank }, (_, index) => <i className={index === 4 ? 'red' : index % 2 ? 'blue' : 'green'} key={index}><span /></i>)}</span>;
  }
  if (tile.id === 'dragon-white') return <span className="tile-face tile-honour white-dragon"><i /></span>;
  return <span className={`tile-face tile-honour honour-${tile.id}`}><strong>{tile.face}</strong></span>;
}
