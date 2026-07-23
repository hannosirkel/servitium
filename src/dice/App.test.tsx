import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const requestPermission = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('pointer: coarse') || query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
  vi.stubGlobal('DeviceMotionEvent', { requestPermission });
  vi.stubGlobal('navigator', { ...navigator, vibrate: vi.fn() });
  requestPermission.mockReset();
});

describe('accessible fallbacks', () => {
  it('motion denial leaves the tap control available', async () => {
    requestPermission.mockResolvedValue('denied');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable shake' }));
    await screen.findByText(/Motion unavailable/);
    expect(screen.getByRole('button', { name: /Throw 2d20/ })).toBeEnabled();
  });

  it('locks repeated rolls until the reduced-motion transition completes', async () => {
    vi.useFakeTimers();
    vi.mocked(matchMedia).mockImplementation((query: string) => ({
      matches: query.includes('reduce') || query.includes('pointer: coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList));
    render(<App />);
    const throwButton = screen.getByRole('button', { name: /Throw 2d20/ });
    fireEvent.click(throwButton);
    expect(throwButton).toBeDisabled();
    fireEvent.click(throwButton);
    await act(async () => { vi.advanceTimersByTime(361); });
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
