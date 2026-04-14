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
  listStock,
  listStockMovements,
  updateCategory,
  type CategoriaInput,
} from '@/features/products/api/products-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Categoria,
  EstoqueProduto,
  MovimentacaoEstoque,
  PesquisaPaginada,
  Produto,
  ProdutoInput,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

const paginacaoInicial: PesquisaPaginada = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
  ordenarPor: 'codigo',
  direcao: 'desc',
};

const paginacaoCategoriasInicial: PesquisaPaginada = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
};

const paginacaoEstoqueInicial: PesquisaPaginada = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
  ordenarPor: 'nivelEstoque',
  direcao: 'asc',
};

const paginacaoMovimentacoesInicial: PesquisaPaginada = {
  pagina: 1,
  tamanhoPagina: 10,
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
  estoqueProdutos: EstoqueProduto[];
  movimentacoesEstoque: MovimentacaoEstoque[];
  paginacao: PesquisaPaginada;
  paginacaoCategorias: PesquisaPaginada;
  paginacaoEstoque: PesquisaPaginada;
  paginacaoMovimentacoesEstoque: PesquisaPaginada;
  totalItens: number;
  totalPaginas: number;
  totalCategorias: number;
  totalPaginasCategorias: number;
  totalItensEstoque: number;
  totalPaginasEstoque: number;
  totalMovimentacoesEstoque: number;
  totalPaginasMovimentacoesEstoque: number;
  isFetchingProducts: boolean;
  isFetchingCategories: boolean;
  isFetchingCategoriesPage: boolean;
  isFetchingStock: boolean;
  isFetchingStockMovements: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  stockMovementsErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchProdutos: (
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<Produto> | void>;
  fetchCategorias: () => Promise<void>;
  fetchCategoriasPaginadas: (
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<Categoria> | void>;
  fetchEstoque: (
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<EstoqueProduto> | void>;
  fetchMovimentacoesEstoque: (
    idProduto: number,
    query?: Partial<PesquisaPaginada>,
  ) => Promise<ResultadoPaginado<MovimentacaoEstoque> | void>;
  atualizarQuantidadeEstoqueLocal: (idProduto: number, delta: number) => void;
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
  estoqueProdutos: [],
  movimentacoesEstoque: [],
  paginacao: paginacaoInicial,
  paginacaoCategorias: paginacaoCategoriasInicial,
  paginacaoEstoque: paginacaoEstoqueInicial,
  paginacaoMovimentacoesEstoque: paginacaoMovimentacoesInicial,
  totalItens: 0,
  totalPaginas: 1,
  totalCategorias: 0,
  totalPaginasCategorias: 1,
  totalItensEstoque: 0,
  totalPaginasEstoque: 1,
  totalMovimentacoesEstoque: 0,
  totalPaginasMovimentacoesEstoque: 1,
  isFetchingProducts: false,
  isFetchingCategories: false,
  isFetchingCategoriesPage: false,
  isFetchingStock: false,
  isFetchingStockMovements: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  stockMovementsErrorMessage: null,
  submitErrorMessage: null,
  fetchProdutos: async (query) => {
    const currentPagination = get().paginacao;
    const nextPagination: PesquisaPaginada = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
      ordenarPor: query?.ordenarPor ?? currentPagination.ordenarPor ?? 'codigo',
      direcao: query?.direcao ?? currentPagination.direcao ?? 'desc',
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
  fetchEstoque: async (query) => {
    const currentPagination = get().paginacaoEstoque;
    const nextPagination: PesquisaPaginada = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
      ordenarPor:
        query?.ordenarPor ?? currentPagination.ordenarPor ?? 'nivelEstoque',
      direcao: query?.direcao ?? currentPagination.direcao ?? 'asc',
    };

    set({ isFetchingStock: true, fetchErrorMessage: null });
    try {
      const response = await listStock(nextPagination);
      set({
        estoqueProdutos: response.itens,
        paginacaoEstoque: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo ?? '',
          ordenarPor: nextPagination.ordenarPor,
          direcao: nextPagination.direcao,
        },
        totalItensEstoque: response.totalItens,
        totalPaginasEstoque: response.totalPaginas,
      });
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetchingStock: false });
    }
  },
  fetchMovimentacoesEstoque: async (idProduto, query) => {
    const currentPagination = get().paginacaoMovimentacoesEstoque;
    const nextPagination: PesquisaPaginada = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
    };

    set({
      isFetchingStockMovements: true,
      stockMovementsErrorMessage: null,
    });
    try {
      const response = await listStockMovements(idProduto, nextPagination);
      set({
        movimentacoesEstoque: response.itens,
        paginacaoMovimentacoesEstoque: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
        },
        totalMovimentacoesEstoque: response.totalItens,
        totalPaginasMovimentacoesEstoque: response.totalPaginas,
      });
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ stockMovementsErrorMessage: problem.detail });
    } finally {
      set({ isFetchingStockMovements: false });
    }
  },
  atualizarQuantidadeEstoqueLocal: (idProduto, delta) => {
    set((state) => ({
      estoqueProdutos: state.estoqueProdutos.map((produto) =>
        produto.id === idProduto
          ? {
              ...produto,
              quantidadeEstoque: produto.quantidadeEstoque + delta,
            }
          : produto,
      ),
    }));
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

export const productStoreSelectors = {
  produtos: (state: ProductStoreState) => state.produtos,
  categorias: (state: ProductStoreState) => state.categorias,
  categoriasPaginadas: (state: ProductStoreState) => state.categoriasPaginadas,
  estoqueProdutos: (state: ProductStoreState) => state.estoqueProdutos,
  movimentacoesEstoque: (state: ProductStoreState) =>
    state.movimentacoesEstoque,
  paginacao: (state: ProductStoreState) => state.paginacao,
  paginacaoCategorias: (state: ProductStoreState) => state.paginacaoCategorias,
  paginacaoEstoque: (state: ProductStoreState) => state.paginacaoEstoque,
  paginacaoMovimentacoesEstoque: (state: ProductStoreState) =>
    state.paginacaoMovimentacoesEstoque,
  totalItens: (state: ProductStoreState) => state.totalItens,
  totalPaginas: (state: ProductStoreState) => state.totalPaginas,
  totalCategorias: (state: ProductStoreState) => state.totalCategorias,
  totalPaginasCategorias: (state: ProductStoreState) =>
    state.totalPaginasCategorias,
  totalItensEstoque: (state: ProductStoreState) => state.totalItensEstoque,
  totalPaginasEstoque: (state: ProductStoreState) =>
    state.totalPaginasEstoque,
  totalMovimentacoesEstoque: (state: ProductStoreState) =>
    state.totalMovimentacoesEstoque,
  totalPaginasMovimentacoesEstoque: (state: ProductStoreState) =>
    state.totalPaginasMovimentacoesEstoque,
  isFetchingProducts: (state: ProductStoreState) => state.isFetchingProducts,
  isFetchingCategories: (state: ProductStoreState) =>
    state.isFetchingCategories,
  isFetchingCategoriesPage: (state: ProductStoreState) =>
    state.isFetchingCategoriesPage,
  isFetchingStock: (state: ProductStoreState) => state.isFetchingStock,
  isFetchingStockMovements: (state: ProductStoreState) =>
    state.isFetchingStockMovements,
  isSubmitting: (state: ProductStoreState) => state.isSubmitting,
  fetchErrorMessage: (state: ProductStoreState) => state.fetchErrorMessage,
  stockMovementsErrorMessage: (state: ProductStoreState) =>
    state.stockMovementsErrorMessage,
  submitErrorMessage: (state: ProductStoreState) => state.submitErrorMessage,
  fetchProdutos: (state: ProductStoreState) => state.fetchProdutos,
  fetchCategorias: (state: ProductStoreState) => state.fetchCategorias,
  fetchCategoriasPaginadas: (state: ProductStoreState) =>
    state.fetchCategoriasPaginadas,
  fetchEstoque: (state: ProductStoreState) => state.fetchEstoque,
  fetchMovimentacoesEstoque: (state: ProductStoreState) =>
    state.fetchMovimentacoesEstoque,
  atualizarQuantidadeEstoqueLocal: (state: ProductStoreState) =>
    state.atualizarQuantidadeEstoqueLocal,
  criarProduto: (state: ProductStoreState) => state.criarProduto,
  criarCategoria: (state: ProductStoreState) => state.criarCategoria,
  obterCategoriaPorId: (state: ProductStoreState) => state.obterCategoriaPorId,
  atualizarCategoria: (state: ProductStoreState) => state.atualizarCategoria,
  clearSubmitError: (state: ProductStoreState) => state.clearSubmitError,
};
