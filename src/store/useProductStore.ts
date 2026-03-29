import { create } from 'zustand';
import { apiClient, getProblemDetailsFromError } from '../shared/api/http-client';
import type { ActionResult } from '../shared/types/action-result';
import type { Categoria, Produto, ProdutoInput } from '../shared/types/domain';

interface ProductState {
  produtos: Produto[];
  categorias: Categoria[];
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchProdutos: () => Promise<void>;
  fetchCategorias: () => Promise<void>;
  criarProduto: (novoProduto: ProdutoInput) => Promise<ActionResult<Produto>>;
  clearSubmitError: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  produtos: [],
  categorias: [],
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchProdutos: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const produtos = await apiClient.get<Produto[]>('/produto');
      set({ produtos });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  fetchCategorias: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const categorias = await apiClient.get<Categoria[]>('/produto/categorias');
      set({ categorias });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  criarProduto: async (novoProduto) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const produto = await apiClient.post<Produto>('/produto', novoProduto);
      return { success: true, data: produto };
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
