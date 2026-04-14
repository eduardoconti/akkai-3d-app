import { create } from 'zustand';
import {
  createExpense,
  createExpenseCategory,
  createWallet,
  deleteExpense,
  getWalletById,
  listExpenseCategories,
  listExpenses,
  listWallets,
  updateExpense,
  updateExpenseCategory,
  updateWallet,
} from '@/features/finance/api/finance-api';
import { listFairs } from '@/features/sales/api/sales-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Carteira,
  CarteiraInput,
  CategoriaDespesa,
  CategoriaDespesaInput,
  Despesa,
  DespesaInput,
  Feira,
  PesquisaPaginadaDespesas,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginadaDespesas = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
  dataInicio: '',
  dataFim: '',
  idsCategorias: [],
  idFeira: undefined,
};

interface FinanceStoreState {
  carteiras: Carteira[];
  despesas: Despesa[];
  categoriasDespesa: CategoriaDespesa[];
  feiras: Feira[];
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
  fetchCategoriasDespesa: () => Promise<void>;
  fetchFeiras: () => Promise<void>;
  criarCarteira: (dados: CarteiraInput) => Promise<ActionResult<Carteira>>;
  atualizarCarteira: (
    id: number,
    dados: CarteiraInput,
  ) => Promise<ActionResult<Carteira>>;
  criarDespesa: (dados: DespesaInput) => Promise<ActionResult<Despesa>>;
  atualizarDespesa: (id: number, dados: DespesaInput) => Promise<ActionResult<Despesa>>;
  excluirDespesa: (id: number) => Promise<ActionResult<void>>;
  criarCategoriaDespesa: (
    dados: CategoriaDespesaInput,
  ) => Promise<ActionResult<CategoriaDespesa>>;
  atualizarCategoriaDespesa: (
    id: number,
    dados: CategoriaDespesaInput,
  ) => Promise<ActionResult<CategoriaDespesa>>;
  clearSubmitError: () => void;
}

export const useFinanceStore = create<FinanceStoreState>((set, get) => ({
  carteiras: [],
  despesas: [],
  categoriasDespesa: [],
  feiras: [],
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
    const hasQueryValue = <TKey extends keyof PesquisaPaginadaDespesas>(key: TKey) =>
      query ? Object.prototype.hasOwnProperty.call(query, key) : false;

    const nextPagination: PesquisaPaginadaDespesas = {
      pagina: hasQueryValue('pagina')
        ? (query?.pagina ?? paginacaoInicial.pagina)
        : currentPagination.pagina,
      tamanhoPagina: hasQueryValue('tamanhoPagina')
        ? (query?.tamanhoPagina ?? paginacaoInicial.tamanhoPagina)
        : currentPagination.tamanhoPagina,
      termo: hasQueryValue('termo')
        ? (query?.termo ?? paginacaoInicial.termo)
        : (currentPagination.termo ?? paginacaoInicial.termo),
      dataInicio: hasQueryValue('dataInicio')
        ? (query?.dataInicio ?? paginacaoInicial.dataInicio)
        : (currentPagination.dataInicio ?? paginacaoInicial.dataInicio),
      dataFim: hasQueryValue('dataFim')
        ? (query?.dataFim ?? paginacaoInicial.dataFim)
        : (currentPagination.dataFim ?? paginacaoInicial.dataFim),
      idsCategorias: hasQueryValue('idsCategorias')
        ? (query?.idsCategorias ?? paginacaoInicial.idsCategorias)
        : (currentPagination.idsCategorias ?? paginacaoInicial.idsCategorias),
      idFeira: hasQueryValue('idFeira')
        ? query?.idFeira
        : currentPagination.idFeira,
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
          idsCategorias: nextPagination.idsCategorias,
          idFeira: nextPagination.idFeira,
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
  fetchCategoriasDespesa: async () => {
    try {
      const categoriasDespesa = await listExpenseCategories();
      set({ categoriasDespesa });
    } catch {
      // silently ignore — não bloqueia a UI se falhar
    }
  },
  fetchFeiras: async () => {
    try {
      const feiras = await listFairs();
      set({ feiras });
    } catch {
      // silently ignore — não bloqueia a UI se falhar
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
  atualizarDespesa: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const despesa = await updateExpense(id, dados);
      return { success: true, data: despesa };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirDespesa: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteExpense(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  criarCategoriaDespesa: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const categoria = await createExpenseCategory(dados);
      return { success: true, data: categoria };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  atualizarCategoriaDespesa: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const categoria = await updateExpenseCategory(id, dados);
      return { success: true, data: categoria };
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
