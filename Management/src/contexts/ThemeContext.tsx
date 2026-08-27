import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

// Keep in sync with the no-FOUC inline script in index.html.
const STORAGE_KEY = 'management-theme';

interface ThemeContextValue {
  /** What the user picked: 'system' means "follow the OS", not a third visual theme. */
  theme: ThemePreference;
  /** What's actually applied right now — always 'light' or 'dark'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/** Handle returned by `window.setTimeout` in a browser environment. */
type TransitionTimeoutHandle = number;

function applyResolvedTheme(resolved: ResolvedTheme): TransitionTimeoutHandle {
  // Briefly enable transitions on theme-affected properties so the swap reads
  // as a shift rather than a hard cut, without adding a global transition
  // that would also animate hover/focus states.
  document.documentElement.classList.add('theme-transitioning');
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return window.setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 200);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? getSystemTheme() : theme
  );
  // Tracks the pending "remove .theme-transitioning" timer so it can be
  // cleared on unmount/theme change — an uncleared timer would otherwise
  // touch `document` after the component (or, in tests, the whole DOM
  // environment) is gone.
  const transitionTimeoutRef = useRef<TransitionTimeoutHandle | undefined>(undefined);

  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    transitionTimeoutRef.current = applyResolvedTheme(resolved);

    let media: MediaQueryList | undefined;
    let onChange: (() => void) | undefined;

    if (theme === 'system') {
      // Only 'system' needs to keep listening — an explicit light/dark choice
      // shouldn't silently follow the OS afterwards.
      media = window.matchMedia('(prefers-color-scheme: dark)');
      onChange = () => {
        const next = getSystemTheme();
        setResolvedTheme(next);
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = applyResolvedTheme(next);
      };
      media.addEventListener('change', onChange);
    }

    return () => {
      clearTimeout(transitionTimeoutRef.current);
      if (media && onChange) media.removeEventListener('change', onChange);
    };
  }, [theme]);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
