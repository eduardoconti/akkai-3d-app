import { create } from 'zustand';
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from '@/features/budgets/api/budgets-api';
import { ALL_STATUSES_ORCAMENTO } from '@/features/budgets/types/budget-form';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  AtualizarOrcamentoInput,
  Orcamento,
  OrcamentoInput,
  PesquisaPaginadaOrcamentos,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaOrcamentos = {
  pagina: 1,
  tamanhoPagina: 10,
  status: ALL_STATUSES_ORCAMENTO.filter((status) => status !== 'FINALIZADO'),
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
  atualizarOrcamento: (
    id: number,
    dados: AtualizarOrcamentoInput,
  ) => Promise<ActionResult<Orcamento>>;
  excluirOrcamento: (id: number) => Promise<ActionResult<void>>;
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
      status: query?.status ?? currentPagination.status,
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listBudgets(nextPagination);
      set({
        orcamentos: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          status: nextPagination.status,
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
  atualizarOrcamento: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const orcamento = await updateBudget(id, dados);
      set((state) => ({
        orcamentos: state.orcamentos.map((o) => (o.id === id ? orcamento : o)),
      }));
      return { success: true, data: orcamento };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirOrcamento: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteBudget(id);
      set((state) => ({
        orcamentos: state.orcamentos.filter((o) => o.id !== id),
        totalItens: Math.max(0, state.totalItens - 1),
      }));
      return { success: true, data: undefined };
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
  atualizarOrcamento: (state: BudgetStoreState) => state.atualizarOrcamento,
  excluirOrcamento: (state: BudgetStoreState) => state.excluirOrcamento,
  clearSubmitError: (state: BudgetStoreState) => state.clearSubmitError,
};
