import { create } from 'zustand';
import {
  createExpense,
  createExpenseCategory,
  createPaymentMethodWalletFee,
  createWallet,
  deleteExpenseCategory,
  deletePaymentMethodWalletFee,
  deleteWallet,
  deleteExpense,
  getPaymentMethodWalletFeeById,
  getWalletById,
  listExpenseCategories,
  listExpenses,
  listPaymentMethodWalletFees,
  listWallets,
  updatePaymentMethodWalletFee,
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
  TaxaMeioPagamentoCarteira,
  TaxaMeioPagamentoCarteiraInput,
  TotalizadoresDespesas,
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
  taxasMeioPagamentoCarteira: TaxaMeioPagamentoCarteira[];
  despesas: Despesa[];
  categoriasDespesa: CategoriaDespesa[];
  feiras: Feira[];
  paginacao: PesquisaPaginadaDespesas;
  totalItens: number;
  totalPaginas: number;
  totalizadores: TotalizadoresDespesas;
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchCarteiras: () => Promise<void>;
  fetchTaxasMeioPagamentoCarteira: () => Promise<void>;
  obterTaxaMeioPagamentoCarteiraPorId: (
    id: number,
  ) => Promise<TaxaMeioPagamentoCarteira>;
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
  excluirCarteira: (id: number) => Promise<ActionResult<void>>;
  criarTaxaMeioPagamentoCarteira: (
    dados: TaxaMeioPagamentoCarteiraInput,
  ) => Promise<ActionResult<TaxaMeioPagamentoCarteira>>;
  atualizarTaxaMeioPagamentoCarteira: (
    id: number,
    dados: TaxaMeioPagamentoCarteiraInput,
  ) => Promise<ActionResult<TaxaMeioPagamentoCarteira>>;
  excluirTaxaMeioPagamentoCarteira: (id: number) => Promise<ActionResult<void>>;
  criarDespesa: (dados: DespesaInput) => Promise<ActionResult<Despesa>>;
  atualizarDespesa: (
    id: number,
    dados: DespesaInput,
  ) => Promise<ActionResult<Despesa>>;
  excluirDespesa: (id: number) => Promise<ActionResult<void>>;
  criarCategoriaDespesa: (
    dados: CategoriaDespesaInput,
  ) => Promise<ActionResult<CategoriaDespesa>>;
  atualizarCategoriaDespesa: (
    id: number,
    dados: CategoriaDespesaInput,
  ) => Promise<ActionResult<CategoriaDespesa>>;
  excluirCategoriaDespesa: (id: number) => Promise<ActionResult<void>>;
  clearSubmitError: () => void;
}

export const useFinanceStore = create<FinanceStoreState>((set, get) => ({
  carteiras: [],
  taxasMeioPagamentoCarteira: [],
  despesas: [],
  categoriasDespesa: [],
  feiras: [],
  paginacao: paginacaoInicial,
  totalItens: 0,
  totalPaginas: 1,
  totalizadores: {
    valorTotal: 0,
  },
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
  fetchTaxasMeioPagamentoCarteira: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const taxasMeioPagamentoCarteira = await listPaymentMethodWalletFees();
      set({ taxasMeioPagamentoCarteira });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  obterTaxaMeioPagamentoCarteiraPorId: async (id) => {
    return getPaymentMethodWalletFeeById(id);
  },
  obterCarteiraPorId: async (id) => {
    return getWalletById(id);
  },
  fetchDespesas: async (query) => {
    const currentPagination = get().paginacao;
    const hasQueryValue = <TKey extends keyof PesquisaPaginadaDespesas>(
      key: TKey,
    ) => (query ? Object.prototype.hasOwnProperty.call(query, key) : false);

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
        totalizadores: response.totalizadores,
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
  excluirCarteira: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteWallet(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  criarTaxaMeioPagamentoCarteira: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const taxaMeioPagamentoCarteira =
        await createPaymentMethodWalletFee(dados);
      return { success: true, data: taxaMeioPagamentoCarteira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  atualizarTaxaMeioPagamentoCarteira: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const taxaMeioPagamentoCarteira = await updatePaymentMethodWalletFee(
        id,
        dados,
      );
      return { success: true, data: taxaMeioPagamentoCarteira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirTaxaMeioPagamentoCarteira: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deletePaymentMethodWalletFee(id);
      return { success: true, data: undefined };
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
  excluirCategoriaDespesa: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteExpenseCategory(id);
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

export const financeStoreSelectors = {
  carteiras: (state: FinanceStoreState) => state.carteiras,
  taxasMeioPagamentoCarteira: (state: FinanceStoreState) =>
    state.taxasMeioPagamentoCarteira,
  despesas: (state: FinanceStoreState) => state.despesas,
  categoriasDespesa: (state: FinanceStoreState) => state.categoriasDespesa,
  feiras: (state: FinanceStoreState) => state.feiras,
  paginacao: (state: FinanceStoreState) => state.paginacao,
  totalItens: (state: FinanceStoreState) => state.totalItens,
  totalPaginas: (state: FinanceStoreState) => state.totalPaginas,
  totalizadores: (state: FinanceStoreState) => state.totalizadores,
  isFetching: (state: FinanceStoreState) => state.isFetching,
  isSubmitting: (state: FinanceStoreState) => state.isSubmitting,
  fetchErrorMessage: (state: FinanceStoreState) => state.fetchErrorMessage,
  submitErrorMessage: (state: FinanceStoreState) => state.submitErrorMessage,
  fetchCarteiras: (state: FinanceStoreState) => state.fetchCarteiras,
  fetchTaxasMeioPagamentoCarteira: (state: FinanceStoreState) =>
    state.fetchTaxasMeioPagamentoCarteira,
  obterTaxaMeioPagamentoCarteiraPorId: (state: FinanceStoreState) =>
    state.obterTaxaMeioPagamentoCarteiraPorId,
  obterCarteiraPorId: (state: FinanceStoreState) => state.obterCarteiraPorId,
  fetchDespesas: (state: FinanceStoreState) => state.fetchDespesas,
  fetchCategoriasDespesa: (state: FinanceStoreState) =>
    state.fetchCategoriasDespesa,
  fetchFeiras: (state: FinanceStoreState) => state.fetchFeiras,
  criarCarteira: (state: FinanceStoreState) => state.criarCarteira,
  atualizarCarteira: (state: FinanceStoreState) => state.atualizarCarteira,
  excluirCarteira: (state: FinanceStoreState) => state.excluirCarteira,
  criarTaxaMeioPagamentoCarteira: (state: FinanceStoreState) =>
    state.criarTaxaMeioPagamentoCarteira,
  atualizarTaxaMeioPagamentoCarteira: (state: FinanceStoreState) =>
    state.atualizarTaxaMeioPagamentoCarteira,
  excluirTaxaMeioPagamentoCarteira: (state: FinanceStoreState) =>
    state.excluirTaxaMeioPagamentoCarteira,
  criarDespesa: (state: FinanceStoreState) => state.criarDespesa,
  atualizarDespesa: (state: FinanceStoreState) => state.atualizarDespesa,
  excluirDespesa: (state: FinanceStoreState) => state.excluirDespesa,
  criarCategoriaDespesa: (state: FinanceStoreState) =>
    state.criarCategoriaDespesa,
  atualizarCategoriaDespesa: (state: FinanceStoreState) =>
    state.atualizarCategoriaDespesa,
  excluirCategoriaDespesa: (state: FinanceStoreState) =>
    state.excluirCategoriaDespesa,
  clearSubmitError: (state: FinanceStoreState) => state.clearSubmitError,
};
