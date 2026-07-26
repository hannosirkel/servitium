import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FullscreenButton from './FullscreenButton';

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
});

describe('FullscreenButton', () => {
  it('enters full screen from a user action', () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true, value: requestFullscreen,
    });
    render(<FullscreenButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter full screen' }));
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it('reflects full-screen state and exits', () => {
    const exitFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true, value: document.documentElement,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true, value: exitFullscreen,
    });
    render(<FullscreenButton />);
    const button = screen.getByRole('button', { name: 'Exit full screen' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });

  it('is disabled when the browser has no full-screen API', () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true, value: undefined,
    });
    render(<FullscreenButton />);
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeDisabled();
  });
});
