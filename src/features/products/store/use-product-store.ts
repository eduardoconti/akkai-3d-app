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
  listAllCategories,
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

const paginacaoCategoriasInicial: PesquisaPaginada = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
};

function paginarCategoriasEmMemoria(
  categorias: Categoria[],
  paginacao: PesquisaPaginada,
): ResultadoPaginado<Categoria> {
  const termo = paginacao.termo?.trim().toLowerCase();
  const categoriasFiltradas = termo
    ? categorias.filter((categoria) =>
        categoria.nome.toLowerCase().includes(termo),
      )
    : categorias;

  const categoriasOrdenadas = [...categoriasFiltradas].sort((a, b) =>
    a.nome.localeCompare(b.nome),
  );
  const totalItens = categoriasOrdenadas.length;
  const offset = (paginacao.pagina - 1) * paginacao.tamanhoPagina;

  return {
    itens: categoriasOrdenadas.slice(offset, offset + paginacao.tamanhoPagina),
    pagina: paginacao.pagina,
    tamanhoPagina: paginacao.tamanhoPagina,
    totalItens,
    totalPaginas: Math.max(1, Math.ceil(totalItens / paginacao.tamanhoPagina)),
  };
}

interface ProductStoreState {
  produtos: Produto[];
  categorias: Categoria[];
  categoriasPaginadas: Categoria[];
  paginacao: PesquisaPaginada;
  paginacaoCategorias: PesquisaPaginada;
  totalItens: number;
  totalPaginas: number;
  totalCategorias: number;
  totalPaginasCategorias: number;
  isFetchingProducts: boolean;
  isFetchingCategories: boolean;
  isFetchingCategoriesPage: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchProdutos: (
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<Produto> | void>;
  fetchCategorias: () => Promise<void>;
  fetchCategoriasPaginadas: (
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<Categoria> | void>;
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
  categoriasPaginadas: [],
  paginacao: paginacaoInicial,
  paginacaoCategorias: paginacaoCategoriasInicial,
  totalItens: 0,
  totalPaginas: 1,
  totalCategorias: 0,
  totalPaginasCategorias: 1,
  isFetchingProducts: false,
  isFetchingCategories: false,
  isFetchingCategoriesPage: false,
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
      const categorias = await listAllCategories();
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
  fetchCategoriasPaginadas: async (query) => {
    const currentPagination = get().paginacaoCategorias;
    const nextPagination: PesquisaPaginada = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
    };

    set({ isFetchingCategoriesPage: true, fetchErrorMessage: null });
    try {
      const response = await listCategories(nextPagination);
      set({
        categoriasPaginadas: response.itens,
        paginacaoCategorias: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo ?? '',
        },
        totalCategorias: response.totalItens,
        totalPaginasCategorias: response.totalPaginas,
      });
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const categorias = get().categorias.length
          ? get().categorias
          : ((await getCachedCategories()) ?? []);

        if (categorias.length > 0) {
          const response = paginarCategoriasEmMemoria(categorias, nextPagination);
          set({
            categorias,
            categoriasPaginadas: response.itens,
            paginacaoCategorias: {
              pagina: response.pagina,
              tamanhoPagina: response.tamanhoPagina,
              termo: nextPagination.termo ?? '',
            },
            totalCategorias: response.totalItens,
            totalPaginasCategorias: response.totalPaginas,
            fetchErrorMessage: null,
          });
          return response;
        }
      }

      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetchingCategoriesPage: false });
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
