import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY, createGame } from './logic';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('confirm', vi.fn(() => true));
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vi.fn() });
});

function start(format: string, players = 2) {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${format}`) }));
  if (format !== 'Two-Headed Giant') fireEvent.click(screen.getByRole('button', { name: String(players) }));
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
}

describe('MTG table flow', () => {
  it('offers full screen from setup and the active table, not Tools', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /full screen/i })).not.toBeInTheDocument();
  });

  it('defaults to Constructed with two visibly selected players', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^Constructed/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([2, 3, 4])('starts and renders %i intentional player panels', (count) => {
    start('Constructed', count);
    expect(screen.getAllByRole('region')).toHaveLength(count);
    expect(document.querySelector('.player-grid')).toHaveAttribute('data-count', String(count));
  });

  it('applies large life changes, undo, redo, and history', () => {
    start('Constructed');
    fireEvent.click(screen.getByRole('button', { name: 'Player 1 lose 5 life' }));
    expect(screen.getAllByText('15')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo last change' }));
    expect(screen.getAllByText('20')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Redo change' }));
    expect(screen.getAllByText('15')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByText('Player 1 -5 life')).toBeInTheDocument();
  });

  it('tracks poison and commander damage from the relevant opponent', () => {
    start('Commander', 3);
    const first = screen.getAllByRole('region')[0];
    fireEvent.click(within(first).getByRole('button', { name: 'Player 1 counters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Poison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase From Player 2' }));
    expect(screen.getByLabelText('Poison: 1')).toBeInTheDocument();
    expect(screen.getByLabelText('From Player 2: 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(within(first).getByText('39')).toBeInTheDocument();
  });

  it('uses shared team life for Two-Headed Giant', () => {
    start('Two-Headed Giant');
    expect(screen.getAllByRole('region')).toHaveLength(2);
    expect(screen.getAllByText('30')).toHaveLength(2);
    expect(screen.getAllByText(/\/15/)).toHaveLength(2);
  });

  it('highlights table roles and shows random utility results', () => {
    start('Constructed');
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    expect(screen.queryByRole('heading', { name: 'Pass the turn' })).not.toBeInTheDocument();
    const crown = screen.getByRole('button', { name: 'Crown Player 1' });
    fireEvent.click(crown);
    expect(crown).toHaveAttribute('aria-pressed', 'true');
    vi.spyOn(Math, 'random').mockReturnValue(.1);
    fireEvent.click(screen.getByRole('button', { name: 'Flip coin' }));
    expect(document.querySelector('.utility-result')).toHaveTextContent('Coin: heads');
    fireEvent.click(screen.getByRole('button', { name: 'Roll d20' }));
    expect(document.querySelector('.utility-result')).toHaveTextContent('D20: 3');
  });

  it('persists and restores the active game', () => {
    start('Brawl');
    fireEvent.click(screen.getByRole('button', { name: 'Player 1 lose 1 life' }));
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"life":24');
    const saved = localStorage.getItem(STORAGE_KEY)!;
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    expect(screen.getAllByText('24').length).toBeGreaterThan(0);
  });

  it('confirms rematch and new game after activity', () => {
    start('Constructed');
    fireEvent.click(screen.getByRole('button', { name: 'Player 1 lose 1 life' }));
    fireEvent.click(screen.getByRole('button', { name: 'Game' }));
    vi.mocked(confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Rematch with same setup' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getAllByText('19')[0]).toBeInTheDocument();
    vi.mocked(confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('heading', { name: 'Set the life totals' })).toBeInTheDocument();
  });

  it('supports keyboard activation through native controls', () => {
    start('Constructed');
    const button = screen.getByRole('button', { name: 'Player 1 gain 1 life' });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button);
    expect(screen.getAllByText('21')[0]).toBeInTheDocument();
  });

  it('falls back to setup for corrupted persistence', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Set the life totals' })).toBeInTheDocument();
  });

  it('restores a valid persisted game directly', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame({ format: 'custom', playerCount: 4, startingLife: 33 })));
    render(<App />);
    expect(screen.getAllByText('33')).toHaveLength(4);
  });
});
