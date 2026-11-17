import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Alerta } from '@/shared/lib/types/domain';
import { useNotificationsStore } from './use-notifications-store';

const { listAlertsMock } = vi.hoisted(() => ({ listAlertsMock: vi.fn() }));

vi.mock('@/features/notifications/api/notifications-api', () => ({
  listAlerts: () => listAlertsMock(),
}));

const alerta: Alerta = {
  tipo: 'ESTOQUE_NEGATIVO',
  severidade: 'CRITICO',
  titulo: '1 produto com estoque negativo',
  descricao: '',
  quantidade: 1,
  chave: 'ESTOQUE_NEGATIVO:1:5',
  itens: [],
};

describe('useNotificationsStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    listAlertsMock.mockReset();
    useNotificationsStore.setState({
      alertas: [],
      dismissed: {},
      userId: null,
      isFetching: false,
      hasFetchError: false,
      lastFetchedAt: null,
    });
  });

  it('carrega os alertas da API', async () => {
    listAlertsMock.mockResolvedValueOnce({ total: 1, alertas: [alerta] });

    await useNotificationsStore.getState().fetchAlertas();

    const state = useNotificationsStore.getState();
    expect(state.alertas).toEqual([alerta]);
    expect(state.hasFetchError).toBe(false);
    expect(state.lastFetchedAt).not.toBeNull();
    expect(state.isFetching).toBe(false);
  });

  it('mantém a última lista quando a busca falha', async () => {
    useNotificationsStore.setState({ alertas: [alerta] });
    listAlertsMock.mockRejectedValueOnce(new Error('offline'));

    await useNotificationsStore.getState().fetchAlertas();

    expect(useNotificationsStore.getState()).toMatchObject({
      alertas: [alerta],
      hasFetchError: true,
      isFetching: false,
    });
  });

  it('não dispara outra busca enquanto uma está em andamento', async () => {
    useNotificationsStore.setState({ isFetching: true });

    await useNotificationsStore.getState().fetchAlertas();

    expect(listAlertsMock).not.toHaveBeenCalled();
  });

  it('dispensa e restaura alertas, guardando por usuário', () => {
    const store = useNotificationsStore.getState();
    store.setUser(7);
    store.dismissAlerta(alerta);

    expect(useNotificationsStore.getState().dismissed).toEqual({
      ESTOQUE_NEGATIVO: alerta.chave,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem('akkai:alertas-dispensados:7') ?? '{}',
      ),
    ).toEqual({ ESTOQUE_NEGATIVO: alerta.chave });

    useNotificationsStore.getState().restoreDismissed();
    expect(useNotificationsStore.getState().dismissed).toEqual({});
  });

  it('ao trocar de usuário limpa a lista e carrega os dispensados dele', () => {
    window.localStorage.setItem(
      'akkai:alertas-dispensados:9',
      JSON.stringify({ ESTOQUE_NEGATIVO: 'x' }),
    );
    useNotificationsStore.setState({ alertas: [alerta], userId: 7 });

    useNotificationsStore.getState().setUser(9);

    expect(useNotificationsStore.getState()).toMatchObject({
      userId: 9,
      alertas: [],
      dismissed: { ESTOQUE_NEGATIVO: 'x' },
    });
  });
});
