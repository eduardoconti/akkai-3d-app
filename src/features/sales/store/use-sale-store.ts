import { create } from 'zustand';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  createSale,
  listFairs,
  listSales,
  listWallets,
} from '@/features/sales/api/sales-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Carteira,
  Feira,
  InserirVendaInput,
  PesquisaPaginadaVendas,
  ResultadoPaginado,
  Venda,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaVendas = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
};

interface SaleStoreState {
  vendas: Venda[];
  feiras: Feira[];
  carteiras: Carteira[];
  paginacao: PesquisaPaginadaVendas;
  totalItens: number;
  totalPaginas: number;
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchVendas: (
    query?: Partial<PesquisaPaginadaVendas>,
  ) => Promise<ResultadoPaginado<Venda> | void>;
  fetchFeiras: () => Promise<void>;
  fetchCarteiras: () => Promise<void>;
  criarVenda: (dados: InserirVendaInput) => Promise<ActionResult<Venda>>;
  clearSubmitError: () => void;
}

export const useSaleStore = create<SaleStoreState>((set, get) => ({
  vendas: [],
  feiras: [],
  carteiras: [],
  paginacao: paginacaoInicial,
  totalItens: 0,
  totalPaginas: 1,
  isFetching: false,
  isSubmitting: false,
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
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
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
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
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
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
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
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
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
