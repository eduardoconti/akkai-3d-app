import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeModeProvider } from './theme-mode-context';
import { useThemeMode } from './use-theme-mode';

type ChangeListener = (event: MediaQueryListEvent) => void;

/** Simula a preferência de cor do sistema e permite alterá-la no teste. */
function mockSystemScheme(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<ChangeListener>();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        return query.includes('dark') ? matches : false;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) =>
        listeners.delete(listener),
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  return {
    setDark(dark: boolean) {
      matches = dark;
      listeners.forEach((listener) =>
        listener({ matches: dark } as MediaQueryListEvent),
      );
    },
  };
}

function ModeProbe() {
  const { mode, toggleColorMode } = useThemeMode();

  return (
    <button type="button" onClick={toggleColorMode}>
      {mode}
    </button>
  );
}

function renderProvider() {
  render(
    <ThemeModeProvider>
      <ModeProbe />
    </ThemeModeProvider>,
  );
}

describe('ThemeModeProvider', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('usa o modo escuro do sistema na primeira visita', () => {
    mockSystemScheme(true);
    renderProvider();

    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('acompanha mudanças do sistema enquanto não há escolha salva', () => {
    const system = mockSystemScheme(false);
    renderProvider();

    act(() => system.setDark(true));

    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('salva a escolha do usuário, que passa a prevalecer sobre o sistema', async () => {
    const system = mockSystemScheme(false);
    renderProvider();

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(window.localStorage.getItem('akkai-3d-theme-mode')).toBe('dark');

    act(() => system.setDark(false));

    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('respeita a escolha salva anteriormente', () => {
    mockSystemScheme(true);
    window.localStorage.setItem('akkai-3d-theme-mode', 'light');
    renderProvider();

    expect(screen.getByRole('button')).toHaveTextContent('light');
  });
});
