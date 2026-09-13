import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeContext';

function makeMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
    dispatch(matches: boolean) {
      this.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
}

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="preference">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('system')}>system</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to the OS preference when nothing is stored and no OS dark mode is set', () => {
    window.matchMedia = vi.fn().mockReturnValue(makeMatchMedia(false));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('preference').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('resolves to dark when the OS prefers dark and nothing is stored', () => {
    window.matchMedia = vi.fn().mockReturnValue(makeMatchMedia(true));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies and persists an explicit choice, overriding the OS preference', async () => {
    window.matchMedia = vi.fn().mockReturnValue(makeMatchMedia(false));
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'dark' }));

    expect(screen.getByTestId('preference').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('management-theme')).toBe('dark');
  });

  it('reads a previously stored preference on mount instead of the OS default', () => {
    window.localStorage.setItem('management-theme', 'dark');
    window.matchMedia = vi.fn().mockReturnValue(makeMatchMedia(false));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('preference').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('switching back to system re-follows a subsequent OS change', async () => {
    const mql = makeMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(screen.getByTestId('resolved').textContent).toBe('light');

    mql.dispatch(true);

    await waitFor(() => {
      expect(screen.getByTestId('resolved').textContent).toBe('dark');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('throws when useTheme is called outside a ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken() {
      useTheme();
      return null;
    }
    expect(() => render(<Broken />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});
