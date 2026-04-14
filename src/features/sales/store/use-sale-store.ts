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
  createFair,
  createSale,
  deleteFair,
  deleteSale,
  getFairById,
  listPagedFairs,
  listFairs,
  listSales,
  listWallets,
  updateFair,
  updateSale,
} from '@/features/sales/api/sales-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Carteira,
  Feira,
  FeiraInput,
  InserirVendaInput,
  PesquisaPaginadaFeiras,
  PesquisaPaginadaVendas,
  Produto,
  ResultadoPaginado,
  ResultadoPaginadoVendas,
  TotalizadoresVendas,
  Venda,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaVendas = {
  pagina: 1,
  tamanhoPagina: 10,
};

const paginacaoFeirasInicial: PesquisaPaginadaFeiras = {
  pagina: 1,
  tamanhoPagina: 10,
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
  feirasPaginadas: Feira[];
  carteiras: Carteira[];
  paginacao: PesquisaPaginadaVendas;
  paginacaoFeiras: PesquisaPaginadaFeiras;
  totalItens: number;
  totalPaginas: number;
  totalFeiras: number;
  totalizadores: TotalizadoresVendas;
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
  fetchFeirasPaginadas: (
    query?: Partial<PesquisaPaginadaFeiras>,
  ) => Promise<ResultadoPaginado<Feira> | void>;
  obterFeiraPorId: (id: number) => Promise<Feira>;
  fetchCarteiras: () => Promise<void>;
  criarFeira: (dados: FeiraInput) => Promise<ActionResult<Feira>>;
  atualizarFeira: (id: number, dados: FeiraInput) => Promise<ActionResult<Feira>>;
  excluirFeira: (id: number) => Promise<ActionResult<void>>;
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
  feirasPaginadas: [],
  carteiras: [],
  paginacao: paginacaoInicial,
  paginacaoFeiras: paginacaoFeirasInicial,
  totalItens: 0,
  totalPaginas: 1,
  totalFeiras: 0,
  totalizadores: {
    valorTotal: 0,
    descontoTotal: 0,
  },
  pendingSalesCount: 0,
  isFetching: false,
  isSubmitting: false,
  isSyncingPendingSales: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchVendas: async (query) => {
    const currentPagination = get().paginacao;
    const hasQueryValue = <TKey extends keyof PesquisaPaginadaVendas>(key: TKey) =>
      query ? Object.prototype.hasOwnProperty.call(query, key) : false;

    const nextPagination: PesquisaPaginadaVendas = {
      pagina: hasQueryValue('pagina')
        ? (query?.pagina ?? paginacaoInicial.pagina)
        : currentPagination.pagina,
      tamanhoPagina: hasQueryValue('tamanhoPagina')
        ? (query?.tamanhoPagina ?? paginacaoInicial.tamanhoPagina)
        : currentPagination.tamanhoPagina,
      tipo: hasQueryValue('tipo') ? query?.tipo : currentPagination.tipo,
      idFeira: hasQueryValue('idFeira') ? query?.idFeira : currentPagination.idFeira,
      idCarteira: hasQueryValue('idCarteira')
        ? query?.idCarteira
        : currentPagination.idCarteira,
      meioPagamento: hasQueryValue('meioPagamento')
        ? query?.meioPagamento
        : currentPagination.meioPagamento,
      dataInicio: hasQueryValue('dataInicio')
        ? query?.dataInicio
        : currentPagination.dataInicio,
      dataFim: hasQueryValue('dataFim') ? query?.dataFim : currentPagination.dataFim,
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listSales(nextPagination);
      set({
        vendas: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          tipo: nextPagination.tipo,
          idFeira: nextPagination.idFeira,
          idCarteira: nextPagination.idCarteira,
          meioPagamento: nextPagination.meioPagamento,
          dataInicio: nextPagination.dataInicio,
          dataFim: nextPagination.dataFim,
        },
        totalItens: response.totalItens,
        totalPaginas: response.totalPaginas,
        totalizadores: response.totalizadores,
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
              tipo: nextPagination.tipo,
              idFeira: nextPagination.idFeira,
              idCarteira: nextPagination.idCarteira,
              meioPagamento: nextPagination.meioPagamento,
              dataInicio: nextPagination.dataInicio,
              dataFim: nextPagination.dataFim,
            },
            totalItens: cachedResponse.totalItens,
            totalPaginas: cachedResponse.totalPaginas,
            totalizadores:
              (cachedResponse as ResultadoPaginadoVendas).totalizadores ?? {
                valorTotal: 0,
                descontoTotal: 0,
              },
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
  fetchFeirasPaginadas: async (query) => {
    const currentPagination = get().paginacaoFeiras;
    const nextPagination: PesquisaPaginadaFeiras = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listPagedFairs(nextPagination);
      set({
        feirasPaginadas: response.itens,
        paginacaoFeiras: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo,
        },
        totalFeiras: response.totalItens,
      });
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  obterFeiraPorId: async (id) => {
    return getFairById(id);
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
  criarFeira: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const feira = await createFair(dados);
      return { success: true, data: feira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  atualizarFeira: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const feira = await updateFair(id, dados);
      return { success: true, data: feira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirFeira: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteFair(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
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

export const saleStoreSelectors = {
  vendas: (state: SaleStoreState) => state.vendas,
  feiras: (state: SaleStoreState) => state.feiras,
  feirasPaginadas: (state: SaleStoreState) => state.feirasPaginadas,
  carteiras: (state: SaleStoreState) => state.carteiras,
  paginacao: (state: SaleStoreState) => state.paginacao,
  paginacaoFeiras: (state: SaleStoreState) => state.paginacaoFeiras,
  totalItens: (state: SaleStoreState) => state.totalItens,
  totalPaginas: (state: SaleStoreState) => state.totalPaginas,
  totalFeiras: (state: SaleStoreState) => state.totalFeiras,
  totalizadores: (state: SaleStoreState) => state.totalizadores,
  pendingSalesCount: (state: SaleStoreState) => state.pendingSalesCount,
  isFetching: (state: SaleStoreState) => state.isFetching,
  isSubmitting: (state: SaleStoreState) => state.isSubmitting,
  isSyncingPendingSales: (state: SaleStoreState) =>
    state.isSyncingPendingSales,
  fetchErrorMessage: (state: SaleStoreState) => state.fetchErrorMessage,
  submitErrorMessage: (state: SaleStoreState) => state.submitErrorMessage,
  fetchVendas: (state: SaleStoreState) => state.fetchVendas,
  fetchFeiras: (state: SaleStoreState) => state.fetchFeiras,
  fetchFeirasPaginadas: (state: SaleStoreState) => state.fetchFeirasPaginadas,
  obterFeiraPorId: (state: SaleStoreState) => state.obterFeiraPorId,
  fetchCarteiras: (state: SaleStoreState) => state.fetchCarteiras,
  criarFeira: (state: SaleStoreState) => state.criarFeira,
  atualizarFeira: (state: SaleStoreState) => state.atualizarFeira,
  excluirFeira: (state: SaleStoreState) => state.excluirFeira,
  criarVenda: (state: SaleStoreState) => state.criarVenda,
  alterarVenda: (state: SaleStoreState) => state.alterarVenda,
  excluirVenda: (state: SaleStoreState) => state.excluirVenda,
  hydrateOfflineState: (state: SaleStoreState) => state.hydrateOfflineState,
  sincronizarVendasPendentes: (state: SaleStoreState) =>
    state.sincronizarVendasPendentes,
  clearSubmitError: (state: SaleStoreState) => state.clearSubmitError,
};

export type {
  InserirVendaInput,
  MeioPagamento,
  TipoVenda,
  Venda,
} from '@/shared/lib/types/domain';
