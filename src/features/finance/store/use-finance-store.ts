import { create } from 'zustand';
import {
  createExpense,
  createWallet,
  getWalletById,
  listExpenses,
  listWallets,
  updateWallet,
} from '@/features/finance/api/finance-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Carteira,
  CarteiraInput,
  Despesa,
  DespesaInput,
  PesquisaPaginadaDespesas,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaDespesas = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
  dataInicio: '',
  dataFim: '',
};

interface FinanceStoreState {
  carteiras: Carteira[];
  despesas: Despesa[];
  paginacao: PesquisaPaginadaDespesas;
  totalItens: number;
  totalPaginas: number;
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchCarteiras: () => Promise<void>;
  obterCarteiraPorId: (id: number) => Promise<Carteira>;
  fetchDespesas: (
    query?: Partial<PesquisaPaginadaDespesas>,
  ) => Promise<ResultadoPaginado<Despesa> | void>;
  criarCarteira: (dados: CarteiraInput) => Promise<ActionResult<Carteira>>;
  atualizarCarteira: (
    id: number,
    dados: CarteiraInput,
  ) => Promise<ActionResult<Carteira>>;
  criarDespesa: (dados: DespesaInput) => Promise<ActionResult<Despesa>>;
  clearSubmitError: () => void;
}

export const useFinanceStore = create<FinanceStoreState>((set, get) => ({
  carteiras: [],
  despesas: [],
  paginacao: paginacaoInicial,
  totalItens: 0,
  totalPaginas: 1,
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
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
  obterCarteiraPorId: async (id) => {
    return getWalletById(id);
  },
  fetchDespesas: async (query) => {
    const currentPagination = get().paginacao;
    const nextPagination: PesquisaPaginadaDespesas = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
      dataInicio: query?.dataInicio ?? currentPagination.dataInicio ?? '',
      dataFim: query?.dataFim ?? currentPagination.dataFim ?? '',
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listExpenses(nextPagination);
      set({
        despesas: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo,
          dataInicio: nextPagination.dataInicio,
          dataFim: nextPagination.dataFim,
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
  criarCarteira: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const carteira = await createWallet(dados);
      return { success: true, data: carteira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  atualizarCarteira: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const carteira = await updateWallet(id, dados);
      return { success: true, data: carteira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  criarDespesa: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const despesa = await createExpense(dados);
      return { success: true, data: despesa };
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
