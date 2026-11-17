import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTheme } from '@/theme/theme';
import type { Alerta } from '@/shared/lib/types/domain';
import { useNotificationsStore } from '@/features/notifications/store/use-notifications-store';
import NotificationsButton from './notifications-button';

const { listAlertsMock } = vi.hoisted(() => ({ listAlertsMock: vi.fn() }));

vi.mock('@/features/notifications/api/notifications-api', () => ({
  listAlerts: () => listAlertsMock(),
}));

const orcamentos: Alerta = {
  tipo: 'ORCAMENTO_PENDENTE',
  severidade: 'AVISO',
  titulo: '7 orçamentos pendentes',
  descricao: 'Aguardando andamento.',
  quantidade: 7,
  chave: 'ORCAMENTO_PENDENTE:7:1,2',
  itens: [
    { id: 1, titulo: 'Maria', detalhe: 'Orçamento #1' },
    { id: 2, titulo: 'João', detalhe: 'Orçamento #2' },
  ],
};
const estoque: Alerta = {
  tipo: 'ESTOQUE_NEGATIVO',
  severidade: 'CRITICO',
  titulo: '1 produto com estoque negativo',
  descricao: 'Corrija o estoque.',
  quantidade: 1,
  chave: 'ESTOQUE_NEGATIVO:1:5',
  itens: [{ id: 5, titulo: 'Dragão', detalhe: 'Código 101 · saldo -3' }],
};

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{location.pathname + location.search}</div>
  );
}

function renderButton() {
  render(
    <ThemeProvider theme={buildTheme('light')}>
      <MemoryRouter initialEntries={['/']}>
        <NotificationsButton />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('NotificationsButton', () => {
  beforeEach(() => {
    window.localStorage.clear();
    listAlertsMock.mockReset();
    listAlertsMock.mockResolvedValue({
      total: 2,
      alertas: [estoque, orcamentos],
    });
    useNotificationsStore.setState({
      alertas: [estoque, orcamentos],
      dismissed: {},
      userId: 1,
      isFetching: false,
      hasFetchError: false,
      lastFetchedAt: Date.now(),
    });
  });

  it('mostra a quantidade de alertas no sino', () => {
    renderButton();

    expect(
      screen.getByRole('button', { name: 'Notificações: 2 alertas' }),
    ).toBeInTheDocument();
  });

  it('lista os alertas com itens e quantos ficaram de fora', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));

    const painel = screen.getByRole('dialog', { name: 'Notificações' });
    expect(
      within(painel).getByText('1 produto com estoque negativo'),
    ).toBeInTheDocument();
    expect(
      within(painel).getByText('7 orçamentos pendentes'),
    ).toBeInTheDocument();
    expect(within(painel).getByText('Maria')).toBeInTheDocument();
    expect(within(painel).getByText('e mais 5')).toBeInTheDocument();
    // Lista recente: abrir o painel não busca de novo.
    expect(listAlertsMock).not.toHaveBeenCalled();
  });

  it('navega para a tela do alerta e fecha o painel', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    const [verEstoque] = screen.getAllByRole('button', { name: 'Ver todos' });

    await userEvent.click(verEstoque!);

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/produtos?ordenarPor=nivelEstoque&direcao=asc',
    );
  });

  it('dispensa um alerta e permite mostrar os dispensados', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Dispensar: 7 orçamentos pendentes',
      }),
    );

    expect(
      screen.queryByText('7 orçamentos pendentes'),
    ).not.toBeInTheDocument();
    // Com o painel aberto o restante da tela fica aria-hidden (modal).
    expect(
      screen.getByRole('button', {
        name: 'Notificações: 1 alerta',
        hidden: true,
      }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar dispensados (1)' }),
    );
    expect(screen.getByText('7 orçamentos pendentes')).toBeInTheDocument();
  });

  it('mostra estado vazio e busca de novo se a lista estiver antiga', async () => {
    listAlertsMock.mockResolvedValue({ total: 0, alertas: [] });
    useNotificationsStore.setState({ alertas: [], lastFetchedAt: null });
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: 'Notificações' }));

    expect(listAlertsMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('Tudo em dia. Nenhum alerta no momento.'),
    ).toBeInTheDocument();
  });

  it('avisa quando não consegue atualizar', async () => {
    useNotificationsStore.setState({ hasFetchError: true });
    renderButton();

    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível atualizar as notificações. Exibindo a última lista carregada.',
    );
  });
});
