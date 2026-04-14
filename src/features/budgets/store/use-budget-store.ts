import { create } from 'zustand';
import { createBudget, listBudgets } from '@/features/budgets/api/budgets-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Orcamento,
  OrcamentoInput,
  PesquisaPaginadaOrcamentos,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaOrcamentos = {
  pagina: 1,
  tamanhoPagina: 10,
};

interface BudgetStoreState {
  orcamentos: Orcamento[];
  paginacao: PesquisaPaginadaOrcamentos;
  totalItens: number;
  totalPaginas: number;
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchOrcamentos: (
    query?: Partial<PesquisaPaginadaOrcamentos>,
  ) => Promise<ResultadoPaginado<Orcamento> | void>;
  criarOrcamento: (dados: OrcamentoInput) => Promise<ActionResult<Orcamento>>;
  clearSubmitError: () => void;
}

export const useBudgetStore = create<BudgetStoreState>((set, get) => ({
  orcamentos: [],
  paginacao: paginacaoInicial,
  totalItens: 0,
  totalPaginas: 1,
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchOrcamentos: async (query) => {
    const currentPagination = get().paginacao;
    const nextPagination: PesquisaPaginadaOrcamentos = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listBudgets(nextPagination);
      set({
        orcamentos: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
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
  criarOrcamento: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const orcamento = await createBudget(dados);
      return { success: true, data: orcamento };
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

export const budgetStoreSelectors = {
  orcamentos: (state: BudgetStoreState) => state.orcamentos,
  paginacao: (state: BudgetStoreState) => state.paginacao,
  totalItens: (state: BudgetStoreState) => state.totalItens,
  totalPaginas: (state: BudgetStoreState) => state.totalPaginas,
  isFetching: (state: BudgetStoreState) => state.isFetching,
  isSubmitting: (state: BudgetStoreState) => state.isSubmitting,
  fetchErrorMessage: (state: BudgetStoreState) => state.fetchErrorMessage,
  submitErrorMessage: (state: BudgetStoreState) => state.submitErrorMessage,
  fetchOrcamentos: (state: BudgetStoreState) => state.fetchOrcamentos,
  criarOrcamento: (state: BudgetStoreState) => state.criarOrcamento,
  clearSubmitError: (state: BudgetStoreState) => state.clearSubmitError,
};
