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
import type {
  Categoria,
  PesquisaPaginada,
  Produto,
  ProdutoInput,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginada = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
};

interface ProductStoreState {
  produtos: Produto[];
  categorias: Categoria[];
  paginacao: PesquisaPaginada;
  totalItens: number;
  totalPaginas: number;
  isFetchingProducts: boolean;
  isFetchingCategories: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchProdutos: (
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<Produto> | void>;
  fetchCategorias: () => Promise<void>;
  criarProduto: (novoProduto: ProdutoInput) => Promise<ActionResult<Produto>>;
  criarCategoria: (novaCategoria: CategoriaInput) => Promise<ActionResult<Categoria>>;
  clearSubmitError: () => void;
}

export const useProductStore = create<ProductStoreState>((set, get) => ({
  produtos: [],
  categorias: [],
  paginacao: paginacaoInicial,
  totalItens: 0,
  totalPaginas: 1,
  isFetchingProducts: false,
  isFetchingCategories: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchProdutos: async (query) => {
    const currentPagination = get().paginacao;
    const nextPagination: PesquisaPaginada = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
    };

    set({ isFetchingProducts: true, fetchErrorMessage: null });
    try {
      const response = await listProducts(nextPagination);
      set({
        produtos: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo ?? '',
        },
        totalItens: response.totalItens,
        totalPaginas: response.totalPaginas,
      });
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetchingProducts: false });
    }
  },
  fetchCategorias: async () => {
    set({ isFetchingCategories: true, fetchErrorMessage: null });
    try {
      const categorias = await listCategories();
      set({ categorias });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetchingCategories: false });
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
