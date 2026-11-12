import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { buildTheme } from '@/theme/theme';
import MainLayoutAppBar from './main-layout-app-bar';

/** Simula a largura da janela respondendo às media queries `min-width`. */
function mockViewportWidth(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const minWidth = /min-width:\s*([\d.]+)px/.exec(query);

      return {
        matches: minWidth ? width >= Number(minWidth[1]) : false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      };
    },
  });
}

function renderAppBar(
  overrides: Partial<Parameters<typeof MainLayoutAppBar>[0]> = {},
) {
  const props = {
    drawerWidth: 256,
    sectionTitle: 'Vendas',
    userName: 'Maria Souza',
    userInitials: 'MA',
    hideValues: false,
    pendingSalesCount: 0,
    rejectedSalesCount: 0,
    isSyncingPendingSales: false,
    onToggleMobileMenu: vi.fn(),
    onOpenSearch: vi.fn(),
    onOpenPendingSales: vi.fn(),
    onToggleHideValues: vi.fn(),
    onOpenCashRegister: vi.fn(),
    onNewSale: vi.fn(),
    onOpenUserMenu: vi.fn(),
    ...overrides,
  };

  render(
    <ThemeProvider theme={buildTheme('light')}>
      <MainLayoutAppBar {...props} />
    </ThemeProvider>,
  );

  return props;
}

describe('MainLayoutAppBar', () => {
  describe('no celular', () => {
    it('exibe somente as ações essenciais, com rótulos acessíveis', async () => {
      mockViewportWidth(375);
      const props = renderAppBar();

      expect(screen.getByText('Vendas')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Ocultar valores' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Abertura de caixa' }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Abrir menu de navegação' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Busca rápida' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Nova venda' }));

      expect(props.onToggleMobileMenu).toHaveBeenCalledTimes(1);
      expect(props.onOpenSearch).toHaveBeenCalledTimes(1);
      expect(props.onNewSale).toHaveBeenCalledTimes(1);
    });

    it('mostra o atalho de vendas pendentes apenas quando houver pendências', async () => {
      mockViewportWidth(375);
      const props = renderAppBar({ pendingSalesCount: 3 });

      await userEvent.click(
        screen.getByRole('button', { name: 'Vendas pendentes: 3' }),
      );

      expect(props.onOpenPendingSales).toHaveBeenCalledTimes(1);
    });
  });

  describe('no desktop estreito', () => {
    it('usa botões só de ícone para as ações secundárias', async () => {
      mockViewportWidth(1000);
      const props = renderAppBar({ hideValues: true });

      await userEvent.click(
        screen.getByRole('button', { name: 'Busca rápida (Ctrl+K)' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Exibir valores' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Abertura de caixa' }),
      );

      expect(props.onOpenSearch).toHaveBeenCalledTimes(1);
      expect(props.onToggleHideValues).toHaveBeenCalledTimes(1);
      expect(props.onOpenCashRegister).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Ctrl K')).not.toBeInTheDocument();
      expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Nova venda' }),
      ).toHaveTextContent('Nova venda');
    });
  });

  describe('no desktop largo', () => {
    it('exibe as ações com texto e o nome do usuário', () => {
      mockViewportWidth(1440);
      renderAppBar();

      expect(
        screen.getByRole('button', { name: 'Busca rápida (Ctrl+K)' }),
      ).toHaveTextContent('Ctrl K');
      expect(
        screen.getByRole('button', { name: 'Ocultar valores' }),
      ).toHaveTextContent('Ocultar valores');
      expect(
        screen.getByRole('button', { name: 'Abertura de caixa' }),
      ).toHaveTextContent('Abertura de caixa');
      expect(screen.getByText('Maria Souza')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Abrir menu de navegação' }),
      ).not.toBeInTheDocument();
      // O título da seção fica no cabeçalho da página, não na barra.
      expect(screen.queryByText('Vendas')).not.toBeInTheDocument();
    });
  });
});
