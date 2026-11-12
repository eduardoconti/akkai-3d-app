import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider, type PaletteMode } from '@mui/material';
import { buildTheme } from './theme';
import {
  ThemeModeContext,
  type ThemeModeContextValue,
} from './theme-mode-context-value';

const STORAGE_KEY = 'akkai-3d-theme-mode';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Modo escolhido explicitamente pelo usuário, se houver. */
function getStoredMode(): PaletteMode | null {
  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return storedMode === 'light' || storedMode === 'dark' ? storedMode : null;
  } catch {
    return null;
  }
}

function getSystemMode(): PaletteMode {
  return window.matchMedia?.(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
}

interface ThemeModeProviderProps {
  children: ReactNode;
}

/**
 * Segue o modo claro/escuro do sistema até o usuário escolher um pelo menu;
 * a partir daí, a escolha fica salva e prevalece.
 */
export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  const [storedMode, setStoredMode] = useState<PaletteMode | null>(
    getStoredMode,
  );
  const [systemMode, setSystemMode] = useState<PaletteMode>(getSystemMode);
  const mode = storedMode ?? systemMode;

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(DARK_SCHEME_QUERY);

    if (!mediaQuery) {
      return undefined;
    }

    const handleChange = (event: MediaQueryListEvent) =>
      setSystemMode(event.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      toggleColorMode: () => {
        const nextMode: PaletteMode = mode === 'light' ? 'dark' : 'light';

        try {
          window.localStorage.setItem(STORAGE_KEY, nextMode);
        } catch {
          // Sem armazenamento disponível: a escolha vale só nesta sessão.
        }

        setStoredMode(nextMode);
      },
    }),
    [mode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
