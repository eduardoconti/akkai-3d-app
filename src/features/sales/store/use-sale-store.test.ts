import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiProblemError } from '@/shared/lib/api/http-client';
import {
  addPendingSale,
  listPendingSales,
  removePendingSale,
} from '@/shared/lib/offline/indexed-db';
import type { InserirVendaInput } from '@/shared/lib/types/domain';

vi.mock('@/features/sales/api/sales-api', () => ({
  createExchangeReturn: vi.fn(),
  createFair: vi.fn(),
  createSale: vi.fn(),
  deleteFair: vi.fn(),
  deleteSale: vi.fn(),
  getFairById: vi.fn(),
  listFairs: vi.fn(),
  listPagedFairs: vi.fn(),
  listSales: vi.fn(),
  listWallets: vi.fn(),
  updateFair: vi.fn(),
  updateSale: vi.fn(),
}));

const { createSale, listSales } =
  await import('@/features/sales/api/sales-api');
const { useSaleStore } = await import('./use-sale-store');

const createSaleMock = vi.mocked(createSale);

function problem(status: number, detail = 'erro') {
  return new ApiProblemError({
    type: 'about:blank',
    title: 'erro',
    status,
    detail,
    instance: '',
  });
}

function payload(id: number): InserirVendaInput {
  return {
    dataVenda: '2026-11-02T00:00:00-03:00',
    tipo: 'LOJA',
    itens: [{ idProduto: id, quantidade: 1, valorUnitario: 1000 }],
    pagamentos: [{ idCarteira: 1, meioPagamento: 'PIX', valor: 1000 }],
    chaveIdempotencia: `chave-${id}`,
  };
}

async function seed(id: number, extra: { idUsuario?: number } = {}) {
  await addPendingSale({
    id: `venda-${id}`,
    createdAt: `2026-11-02T10:0${id}:00.000Z`,
    payload: payload(id),
    idUsuario: 1,
    ...extra,
  });
}

async function clearQueue() {
  for (const sale of await listPendingSales()) {
    await removePendingSale(sale.id);
  }
}

beforeEach(async () => {
  await clearQueue();
  window.localStorage.setItem('akkai-auth-snapshot', JSON.stringify({ id: 1 }));
  createSaleMock.mockReset();
  vi.mocked(listSales).mockResolvedValue({
    itens: [],
    pagina: 1,
    tamanhoPagina: 25,
    totalItens: 0,
    totalPaginas: 1,
  } as never);
  useSaleStore.setState({
    pendingSales: [],
    pendingSalesCount: 0,
    rejectedSalesCount: 0,
    isSyncingPendingSales: false,
  });
});

describe('sincronizarVendasPendentes', () => {
  it('envia as vendas em ordem de criação e esvazia a fila', async () => {
    await seed(2);
    await seed(1);
    createSaleMock.mockResolvedValue({ id: 99 } as never);

    const synced = await useSaleStore.getState().sincronizarVendasPendentes();

    expect(synced).toBe(2);
    expect(
      createSaleMock.mock.calls.map(([input]) => input.chaveIdempotencia),
    ).toEqual(['chave-1', 'chave-2']);
    expect(await listPendingSales()).toHaveLength(0);
    expect(useSaleStore.getState().pendingSalesCount).toBe(0);
  });

  it('interrompe ao perder a conexão e mantém a fila intacta', async () => {
    await seed(1);
    await seed(2);
    createSaleMock.mockRejectedValue(problem(0));

    const synced = await useSaleStore.getState().sincronizarVendasPendentes();

    expect(synced).toBe(0);
    expect(createSaleMock).toHaveBeenCalledTimes(1);
    const queue = await listPendingSales();
    expect(queue).toHaveLength(2);
    expect(queue.every((sale) => !sale.ultimoErro)).toBe(true);
  });

  it('não marca como recusada uma venda que falhou por erro do servidor', async () => {
    await seed(1);
    await seed(2);
    createSaleMock.mockRejectedValue(problem(503));

    await useSaleStore.getState().sincronizarVendasPendentes();

    expect(createSaleMock).toHaveBeenCalledTimes(1);
    expect((await listPendingSales()).every((sale) => !sale.ultimoErro)).toBe(
      true,
    );
    expect(useSaleStore.getState().rejectedSalesCount).toBe(0);
  });

  it('guarda o motivo da recusa e segue para as demais vendas', async () => {
    await seed(1);
    await seed(2);
    createSaleMock
      .mockRejectedValueOnce(problem(400, 'Caixa fechado.'))
      .mockResolvedValueOnce({ id: 7 } as never);

    const synced = await useSaleStore.getState().sincronizarVendasPendentes();

    expect(synced).toBe(1);
    const queue = await listPendingSales();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      id: 'venda-1',
      ultimoErro: 'Caixa fechado.',
      tentativas: 1,
    });
    expect(useSaleStore.getState().rejectedSalesCount).toBe(1);
  });

  it('não reenvia sozinha uma venda já recusada', async () => {
    await addPendingSale({
      id: 'recusada',
      createdAt: '2026-11-02T10:00:00.000Z',
      payload: payload(1),
      idUsuario: 1,
      ultimoErro: 'Caixa fechado.',
    });

    const synced = await useSaleStore.getState().sincronizarVendasPendentes();

    expect(synced).toBe(0);
    expect(createSaleMock).not.toHaveBeenCalled();
  });

  it('não envia nem conta vendas de outro usuário do aparelho', async () => {
    await seed(1, { idUsuario: 2 });
    await seed(2);
    createSaleMock.mockResolvedValue({ id: 5 } as never);

    await useSaleStore.getState().hydrateOfflineState();
    expect(useSaleStore.getState().pendingSalesCount).toBe(1);

    await useSaleStore.getState().sincronizarVendasPendentes();

    expect(createSaleMock).toHaveBeenCalledTimes(1);
    expect((await listPendingSales()).map((sale) => sale.id)).toEqual([
      'venda-1',
    ]);
  });

  it('ignora uma segunda chamada enquanto a primeira ainda está enviando', async () => {
    await seed(1);
    let release: (value: unknown) => void = () => undefined;
    createSaleMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }) as never,
    );

    const first = useSaleStore.getState().sincronizarVendasPendentes();
    await vi.waitFor(() => expect(createSaleMock).toHaveBeenCalled());
    const second = await useSaleStore.getState().sincronizarVendasPendentes();
    release({ id: 1 });

    expect(second).toBe(0);
    expect(await first).toBe(1);
    expect(createSaleMock).toHaveBeenCalledTimes(1);
  });

  it('gera e grava a chave de idempotência de vendas antigas antes de enviar', async () => {
    await addPendingSale({
      id: 'antiga',
      createdAt: '2026-11-02T10:00:00.000Z',
      payload: { ...payload(1), chaveIdempotencia: undefined },
      idUsuario: 1,
    });
    createSaleMock.mockRejectedValue(problem(0));

    await useSaleStore.getState().sincronizarVendasPendentes();

    const [stored] = await listPendingSales();
    expect(stored.payload.chaveIdempotencia).toEqual(expect.any(String));
    expect(createSaleMock.mock.calls[0][0].chaveIdempotencia).toBe(
      stored.payload.chaveIdempotencia,
    );
  });
});

describe('vendas pendentes recusadas', () => {
  it('reenviar limpa o erro e tenta de novo', async () => {
    await addPendingSale({
      id: 'recusada',
      createdAt: '2026-11-02T10:00:00.000Z',
      payload: payload(1),
      idUsuario: 1,
      ultimoErro: 'Caixa fechado.',
    });
    createSaleMock.mockResolvedValue({ id: 1 } as never);

    await useSaleStore.getState().reenviarVendaPendente('recusada');

    expect(createSaleMock).toHaveBeenCalledTimes(1);
    expect(await listPendingSales()).toHaveLength(0);
  });

  it('descartar remove a venda e atualiza os contadores', async () => {
    await seed(1);
    await useSaleStore.getState().hydrateOfflineState();
    expect(useSaleStore.getState().pendingSalesCount).toBe(1);

    await useSaleStore.getState().descartarVendaPendente('venda-1');

    expect(await listPendingSales()).toHaveLength(0);
    expect(useSaleStore.getState().pendingSalesCount).toBe(0);
  });
});

describe('criarVenda sem conexão', () => {
  it('guarda a venda na fila com o dono e a chave de idempotência', async () => {
    createSaleMock.mockRejectedValue(problem(0));

    const result = await useSaleStore.getState().criarVenda(payload(1));

    expect(result.success).toBe(true);
    expect(result.success && result.data.id).toBeLessThan(0);
    const [stored] = await listPendingSales();
    expect(stored).toMatchObject({
      idUsuario: 1,
      payload: { chaveIdempotencia: 'chave-1' },
    });
    expect(useSaleStore.getState().pendingSalesCount).toBe(1);
  });

  it('exige conexão para finalizar um orçamento', async () => {
    createSaleMock.mockRejectedValue(problem(0));

    const result = await useSaleStore
      .getState()
      .criarVenda({ ...payload(1), idOrcamento: 10 });

    expect(result.success).toBe(false);
    expect(await listPendingSales()).toHaveLength(0);
  });

  it('não enfileira quando o servidor recusa a venda', async () => {
    createSaleMock.mockRejectedValue(problem(400, 'Caixa fechado.'));

    const result = await useSaleStore.getState().criarVenda(payload(1));

    expect(result.success).toBe(false);
    expect(await listPendingSales()).toHaveLength(0);
  });
});
