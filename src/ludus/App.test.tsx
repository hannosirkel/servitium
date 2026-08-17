import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { GAME_KEY, saveGame } from './mahjong/persistence';
import { createGame, selectTile } from './mahjong/state';

beforeEach(() => {
  localStorage.clear(); history.replaceState({}, '', '/ludus/');
  vi.stubGlobal('confirm', vi.fn(() => true));
  Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: vi.fn(() => 'test-uuid') });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Ludus and Mahjong flow', () => {
  it('shows the data-driven shelf and routes its first game', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ludus' })).toBeInTheDocument();
    expect(screen.getByText('Time is your enemy, kill it here.')).toBeInTheDocument();
    expect(screen.queryByText('More games can join the shelf later.')).not.toBeInTheDocument();
    expect(screen.getByText('Full screen')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { name: 'Mahjong Solitaire' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/previous/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /play now/i })[0]);
    expect(location.pathname).toBe('/ludus/mahjong');
    expect(screen.getByRole('heading', { name: 'Clear the quiet table' })).toBeInTheDocument();
  });

  it('routes the FreeCell catalogue entry into a complete deal', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /play now/i })[1]);
    expect(location.pathname).toBe('/ludus/freecell');
    expect(screen.getByText('FreeCell')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /cascade \d, destination/i })).toHaveLength(8);
    expect(screen.getAllByRole('button', { name: /free cell/i })).toHaveLength(4);
    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
    const source = screen.getAllByRole('button', { name: /, cascade 1/i }).at(-1)!;
    fireEvent.click(source); expect(source).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(source); expect(source).toHaveAttribute('aria-pressed', 'false');
    fireEvent.doubleClick(source);
    expect(screen.queryByRole('button', { name: 'Empty free cell 1' })).not.toBeInTheDocument();
    expect(localStorage.getItem('servitium.ludus.freecell.v1')).toContain('cascades');
  });

  it.each([['Easy', 80], ['Medium', 144], ['Hard', 144]])('starts %s with the expected tile count', (difficulty, count) => {
    history.replaceState({}, '', '/ludus/mahjong'); render(<App />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${difficulty}`) }));
    fireEvent.click(screen.getByRole('button', { name: `Start ${difficulty}` }));
    expect(screen.getAllByRole('button', { name: /, (free|blocked)$/ })).toHaveLength(count as number);
  });

  it('continues a saved board, removes a pair without refocusing, hints, undoes, and survives reload', () => {
    const saved = createGame('easy', 'lotus-garden', 'component'); saveGame(localStorage, saved);
    history.replaceState({}, '', '/ludus/mahjong'); render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue Easy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(document.querySelectorAll('.hinted')).toHaveLength(2);
    const pair = saved.certificate[0];
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fireEvent.click(document.querySelector(`[data-slot-id="${pair[0]}"]`)!);
    fireEvent.click(document.querySelector(`[data-slot-id="${pair[1]}"]`)!);
    expect(screen.getByText('39 pairs')).toBeInTheDocument();
    expect(focus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('40 pairs')).toBeInTheDocument();
    expect(localStorage.getItem(GAME_KEY)).toContain('lotus-garden');
  });

  it('supports keyboard activation and reaches completion', () => {
    const full = createGame('easy', 'open-gate', 'victory'); const pair = full.certificate.at(-1)!;
    const saved = { ...full, remaining: [...pair], pairsRemoved: 39 };
    saveGame(localStorage, saved); history.replaceState({}, '', '/ludus/mahjong'); render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue Easy/ }));
    const first = document.querySelector(`[data-slot-id="${pair[0]}"]`) as HTMLButtonElement;
    first.focus(); fireEvent.keyDown(first, { key: 'Enter' }); fireEvent.click(first);
    fireEvent.click(document.querySelector(`[data-slot-id="${pair[1]}"]`)!);
    expect(screen.getByRole('heading', { name: /clean solve|table is clear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replay this board' })).toBeInTheDocument();
  });

  it('confirms restart and leaving a progressed game, and exposes board controls', () => {
    let game = createGame('easy', 'lotus-garden', 'confirm'); const pair = game.certificate[0];
    game = selectTile(selectTile(game, pair[0]).game, pair[1]).game; saveGame(localStorage, game);
    history.replaceState({}, '', '/ludus/mahjong'); render(<App />); fireEvent.click(screen.getByRole('button', { name: /Continue Easy/ }));
    vi.mocked(confirm).mockReturnValue(false); fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(confirm).toHaveBeenCalled(); expect(screen.getByText('39 pairs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fit board' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument();
  });

  it('pinch-zooms around a two-touch gesture without activating a tile', () => {
    history.replaceState({}, '', '/ludus/mahjong'); render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Easy' }));
    const viewport = document.querySelector('.board-viewport')!;
    const tile = document.querySelector('.mahjong-tile') as HTMLButtonElement;
    const initialWidth = Number.parseFloat(tile.style.width);
    fireEvent.pointerDown(viewport, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerDown(viewport, { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 });
    fireEvent.pointerMove(viewport, { pointerId: 2, pointerType: 'touch', clientX: 250, clientY: 100 });
    expect(Number.parseFloat(tile.style.width)).toBeGreaterThan(initialWidth);
    expect(screen.getByText('40 pairs')).toBeInTheDocument();
    fireEvent.pointerUp(viewport, { pointerId: 2, pointerType: 'touch', clientX: 250, clientY: 100 });
    fireEvent.pointerUp(viewport, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
  });
});
