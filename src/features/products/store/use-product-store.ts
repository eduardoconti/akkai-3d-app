import { create } from 'zustand';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  createCategory,
  createProduct,
  listCategories,
  listProducts,
  type CategoriaInput,
} from '@/features/products/api/products-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type { Categoria, Produto, ProdutoInput } from '@/shared/lib/types/domain';

interface ProductStoreState {
  produtos: Produto[];
  categorias: Categoria[];
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchProdutos: () => Promise<void>;
  fetchCategorias: () => Promise<void>;
  criarProduto: (novoProduto: ProdutoInput) => Promise<ActionResult<Produto>>;
  criarCategoria: (novaCategoria: CategoriaInput) => Promise<ActionResult<Categoria>>;
  clearSubmitError: () => void;
}

export const useProductStore = create<ProductStoreState>((set) => ({
  produtos: [],
  categorias: [],
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchProdutos: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const produtos = await listProducts();
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
      const categorias = await listCategories();
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
      const produto = await createProduct(novoProduto);
      return { success: true, data: produto };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  criarCategoria: async (novaCategoria) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const categoria = await createCategory(novaCategoria);
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
