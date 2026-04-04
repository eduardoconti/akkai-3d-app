import { create } from 'zustand';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  addPendingSale,
  getCachedFairs,
  getCachedSales,
  getCachedWallets,
  listPendingSales,
  removePendingSale,
  saveCachedFairs,
  saveCachedSales,
  saveCachedWallets,
} from '@/shared/lib/offline/indexed-db';
import {
  createSale,
  deleteSale,
  listFairs,
  listSales,
  listWallets,
  updateSale,
} from '@/features/sales/api/sales-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Carteira,
  Feira,
  InserirVendaInput,
  PesquisaPaginadaVendas,
  Produto,
  ResultadoPaginado,
  Venda,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaVendas = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
};

function getCatalogProductValue(
  item: InserirVendaInput['itens'][number],
  produtos: Produto[],
) {
  const product = produtos.find((current) => current.id === item.idProduto);
  return product?.valor ?? 0;
}

function buildOfflineSale(
  dados: InserirVendaInput,
  produtos: Produto[],
  feiras: Feira[],
  carteiras: Carteira[],
): Venda {
  const saleId = -Date.now();
  const createdAt = new Date().toISOString();
  const feira = feiras.find((current) => current.id === dados.idFeira) ?? null;
  const carteira =
    carteiras.find((current) => current.id === dados.idCarteira) ?? null;

  const itens = dados.itens.map((item, index) => {
    const produto = produtos.find((current) => current.id === item.idProduto) ?? null;
    const valorUnitario = item.brinde
      ? 0
      : item.idProduto
        ? getCatalogProductValue(item, produtos)
        : item.valorUnitario ?? 0;

    return {
      id: saleId - index - 1,
      idProduto: item.idProduto,
      nomeProduto: item.nomeProduto?.trim() || produto?.nome || 'Item avulso',
      quantidade: item.quantidade,
      valorUnitario,
      brinde: item.brinde ?? false,
      valorTotal: Math.max(0, valorUnitario * item.quantidade),
      produto,
    };
  });

  const totalItens = itens.reduce((accumulator, item) => accumulator + item.valorTotal, 0);

  return {
    id: saleId,
    dataInclusao: createdAt,
    valorTotal: Math.max(0, totalItens - (dados.desconto ?? 0)),
    tipo: dados.tipo,
    meioPagamento: dados.meioPagamento,
    desconto: dados.desconto ?? 0,
    idFeira: dados.idFeira,
    idCarteira: dados.idCarteira,
    feira,
    carteira,
    itens,
  };
}

interface SaleStoreState {
  vendas: Venda[];
  feiras: Feira[];
  carteiras: Carteira[];
  paginacao: PesquisaPaginadaVendas;
  totalItens: number;
  totalPaginas: number;
  pendingSalesCount: number;
  isFetching: boolean;
  isSubmitting: boolean;
  isSyncingPendingSales: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchVendas: (
    query?: Partial<PesquisaPaginadaVendas>,
  ) => Promise<ResultadoPaginado<Venda> | void>;
  fetchFeiras: () => Promise<void>;
  fetchCarteiras: () => Promise<void>;
  criarVenda: (dados: InserirVendaInput) => Promise<ActionResult<Venda>>;
  alterarVenda: (
    id: number,
    dados: InserirVendaInput,
  ) => Promise<ActionResult<Venda>>;
  excluirVenda: (id: number) => Promise<ActionResult<void>>;
  hydrateOfflineState: () => Promise<void>;
  sincronizarVendasPendentes: () => Promise<number>;
  clearSubmitError: () => void;
}

export const useSaleStore = create<SaleStoreState>((set, get) => ({
  vendas: [],
  feiras: [],
  carteiras: [],
  paginacao: paginacaoInicial,
  totalItens: 0,
  totalPaginas: 1,
  pendingSalesCount: 0,
  isFetching: false,
  isSubmitting: false,
  isSyncingPendingSales: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchVendas: async (query) => {
    const currentPagination = get().paginacao;
    const nextPagination: PesquisaPaginadaVendas = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
      tipo: query?.tipo ?? currentPagination.tipo,
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listSales(nextPagination);
      set({
        vendas: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo ?? '',
          tipo: nextPagination.tipo,
        },
        totalItens: response.totalItens,
        totalPaginas: response.totalPaginas,
      });
      await saveCachedSales(response);
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const cachedResponse = await getCachedSales();

        if (cachedResponse) {
          set({
            vendas: cachedResponse.itens,
            paginacao: {
              pagina: cachedResponse.pagina,
              tamanhoPagina: cachedResponse.tamanhoPagina,
              termo: nextPagination.termo ?? '',
              tipo: nextPagination.tipo,
            },
            totalItens: cachedResponse.totalItens,
            totalPaginas: cachedResponse.totalPaginas,
            fetchErrorMessage: null,
          });
          return cachedResponse;
        }
      }

      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  fetchFeiras: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const feiras = await listFairs();
      set({ feiras });
      await saveCachedFairs(feiras);
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const feiras = await getCachedFairs();

        if (feiras) {
          set({ feiras, fetchErrorMessage: null });
          return;
        }
      }

      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  fetchCarteiras: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const carteiras = await listWallets();
      set({ carteiras });
      await saveCachedWallets(carteiras);
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const carteiras = await getCachedWallets();

        if (carteiras) {
          set({ carteiras, fetchErrorMessage: null });
          return;
        }
      }

      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  criarVenda: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const venda = await createSale(dados);
      return { success: true, data: venda };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const localSale = buildOfflineSale(
          dados,
          (window as typeof window & { __AKKAI_PRODUCTS__?: Produto[] }).__AKKAI_PRODUCTS__ ?? [],
          get().feiras,
          get().carteiras,
        );

        await addPendingSale({
          id: window.crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          payload: dados,
        });

        set((current) => ({
          pendingSalesCount: current.pendingSalesCount + 1,
          submitErrorMessage: null,
        }));

        return { success: true, data: localSale };
      }

      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  alterarVenda: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const venda = await updateSale(id, dados);
      return { success: true, data: venda };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirVenda: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteSale(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  hydrateOfflineState: async () => {
    const pendingSales = await listPendingSales();
    set({ pendingSalesCount: pendingSales.length });
  },
  sincronizarVendasPendentes: async () => {
    set({ isSyncingPendingSales: true, fetchErrorMessage: null });

    try {
      const pendingSales = await listPendingSales();

      const results = await Promise.allSettled(
        pendingSales.map(async (pendingSale) => {
          await createSale(pendingSale.payload);
          await removePendingSale(pendingSale.id);
        }),
      );

      const syncedCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length;

      const remainingSales = await listPendingSales();
      set({
        pendingSalesCount: remainingSales.length,
        fetchErrorMessage:
          failedCount > 0
            ? `${failedCount} ${failedCount === 1 ? 'venda não pôde ser sincronizada' : 'vendas não puderam ser sincronizadas'}.`
            : null,
      });

      if (syncedCount > 0) {
        await get().fetchVendas({ pagina: 1 });
      }

      return syncedCount;
    } finally {
      set({ isSyncingPendingSales: false });
    }
  },
  clearSubmitError: () => {
    set({ submitErrorMessage: null });
  },
}));

export type {
  InserirVendaInput,
  MeioPagamento,
  TipoVenda,
  Venda,
} from '@/shared/lib/types/domain';
