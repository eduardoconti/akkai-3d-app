import { create } from 'zustand';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  getCachedCategories,
  getCachedProducts,
  saveCachedCategories,
  saveCachedProducts,
} from '@/shared/lib/offline/indexed-db';
import {
  createCategory,
  createProduct,
  getCategoryById,
  listCategories,
  listProducts,
  updateCategory,
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
  ordenarPor: 'nome',
  direcao: 'asc',
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
  obterCategoriaPorId: (id: number) => Promise<Categoria>;
  atualizarCategoria: (
    id: number,
    categoria: CategoriaInput,
  ) => Promise<ActionResult<Categoria>>;
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
      ordenarPor: query?.ordenarPor ?? currentPagination.ordenarPor ?? 'nome',
      direcao: query?.direcao ?? currentPagination.direcao ?? 'asc',
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
          ordenarPor: nextPagination.ordenarPor,
          direcao: nextPagination.direcao,
        },
        totalItens: response.totalItens,
        totalPaginas: response.totalPaginas,
      });
      await saveCachedProducts(response);
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const cachedResponse = await getCachedProducts();

        if (cachedResponse) {
          set({
            produtos: cachedResponse.itens,
            paginacao: {
              pagina: cachedResponse.pagina,
              tamanhoPagina: cachedResponse.tamanhoPagina,
              termo: nextPagination.termo ?? '',
              ordenarPor: nextPagination.ordenarPor,
              direcao: nextPagination.direcao,
            },
            totalItens: cachedResponse.totalItens,
            totalPaginas: cachedResponse.totalPaginas,
            fetchErrorMessage: null,
          });
          return cachedResponse;
        }
      }

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
      await saveCachedCategories(categorias);
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const categorias = await getCachedCategories();

        if (categorias) {
          set({ categorias, fetchErrorMessage: null });
          return;
        }
      }

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
  obterCategoriaPorId: async (id) => getCategoryById(id),
  atualizarCategoria: async (id, categoria) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const categoriaAtualizada = await updateCategory(id, categoria);
      return { success: true, data: categoriaAtualizada };
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
