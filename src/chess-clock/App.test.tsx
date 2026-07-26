import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('navigator', { ...navigator, vibrate: vi.fn() });
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('chess clock flow', () => {
  it('offers the universal full-screen control', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
  });

  it('starts the opponent clock when the first mover taps', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /White clock/ }));
    expect(screen.getByRole('button', { name: /Black clock.*running/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /White clock/ })).toBeDisabled();
  });

  it('pauses, resumes and protects reset', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /White clock/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    vi.mocked(confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('exposes custom delay and player-specific time', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    fireEvent.change(screen.getByLabelText('Timing mode'), { target: { value: 'delay' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Different player times/ }));
    expect(screen.getByLabelText('Bonus seconds')).toBeInTheDocument();
    expect(screen.getByLabelText('Black minutes')).toBeInTheDocument();
  });
});
