import { create } from 'zustand';
import {
  getProblemDetailsFromError,
  isServerUnavailableStatus,
} from '@/shared/lib/api/http-client';
import { getStoredUserId } from '@/shared/lib/api/token-storage';
import { getOnlineStatus } from '@/shared/lib/offline/use-online-status';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants/pagination';
import { formatLocalDate } from '@/shared/utils/date';
import { getMonthRangeInput } from '@/shared/utils/date-range';
import {
  addPendingSale,
  getCachedFairs,
  getCachedSales,
  getCachedWallets,
  listPendingSales,
  type PendingSaleRecord,
  removePendingSale,
  saveCachedFairs,
  saveCachedSales,
  saveCachedWallets,
} from '@/shared/lib/offline/indexed-db';
import {
  createFair,
  createExchangeReturn,
  createSale,
  deleteFair,
  deleteSale,
  getFairById,
  listPagedFairs,
  listFairs,
  listSales,
  listWallets,
  updateFair,
  updateSale,
} from '@/features/sales/api/sales-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Carteira,
  Feira,
  FeiraInput,
  InserirTrocaDevolucaoInput,
  InserirVendaInput,
  PesquisaPaginadaFeiras,
  PesquisaPaginadaPrecosProdutosFeira,
  PesquisaPaginadaVendas,
  Produto,
  ResultadoPaginado,
  ResultadoPaginadoVendas,
  TotalizadoresVendas,
  TrocaDevolucao,
  Venda,
} from '@/shared/lib/types/domain';

const paginacaoInicialPeriodo = getMonthRangeInput();

const paginacaoInicial: PesquisaPaginadaVendas = {
  pagina: 1,
  tamanhoPagina: DEFAULT_PAGE_SIZE,
  dataInicio: paginacaoInicialPeriodo.startValue,
  dataFim: paginacaoInicialPeriodo.endValue,
};

const totalizadoresVendasIniciais: TotalizadoresVendas = {
  quantidadeItensVendidos: 0,
  quantidadeItensCatalogo: 0,
  quantidadeBrindes: 0,
  quantidadeItensAvulsos: 0,
  valorTotal: 0,
  descontoTotal: 0,
  valorLiquido: 0,
};

function normalizarTotalizadoresVendas(
  totalizadores?: Partial<TotalizadoresVendas>,
): TotalizadoresVendas {
  return {
    quantidadeItensVendidos: totalizadores?.quantidadeItensVendidos ?? 0,
    quantidadeItensCatalogo: totalizadores?.quantidadeItensCatalogo ?? 0,
    quantidadeBrindes: totalizadores?.quantidadeBrindes ?? 0,
    quantidadeItensAvulsos: totalizadores?.quantidadeItensAvulsos ?? 0,
    valorTotal: totalizadores?.valorTotal ?? 0,
    descontoTotal: totalizadores?.descontoTotal ?? 0,
    valorLiquido: totalizadores?.valorLiquido ?? 0,
  };
}

const paginacaoFeirasInicial: PesquisaPaginadaFeiras = {
  pagina: 1,
  tamanhoPagina: DEFAULT_PAGE_SIZE,
};

const paginacaoPrecosProdutosFeiraInicial: PesquisaPaginadaPrecosProdutosFeira =
  {
    pagina: 1,
    tamanhoPagina: DEFAULT_PAGE_SIZE,
    termo: '',
    ordenarPor: 'codigo',
    direcao: 'asc',
  };

function resolverPaginacaoPrecosProdutosFeira(
  atual: PesquisaPaginadaPrecosProdutosFeira,
  query?: Partial<PesquisaPaginadaPrecosProdutosFeira>,
): PesquisaPaginadaPrecosProdutosFeira {
  const hasQueryValue = <
    TKey extends keyof PesquisaPaginadaPrecosProdutosFeira,
  >(
    key: TKey,
  ) => (query ? Object.prototype.hasOwnProperty.call(query, key) : false);

  return {
    pagina: hasQueryValue('pagina')
      ? (query?.pagina ?? paginacaoPrecosProdutosFeiraInicial.pagina)
      : atual.pagina,
    tamanhoPagina: hasQueryValue('tamanhoPagina')
      ? (query?.tamanhoPagina ??
        paginacaoPrecosProdutosFeiraInicial.tamanhoPagina)
      : atual.tamanhoPagina,
    termo: hasQueryValue('termo')
      ? (query?.termo ?? paginacaoPrecosProdutosFeiraInicial.termo)
      : (atual.termo ?? paginacaoPrecosProdutosFeiraInicial.termo),
    idFeira: hasQueryValue('idFeira') ? query?.idFeira : atual.idFeira,
    ordenarPor: hasQueryValue('ordenarPor')
      ? (query?.ordenarPor ?? paginacaoPrecosProdutosFeiraInicial.ordenarPor)
      : (atual.ordenarPor ?? paginacaoPrecosProdutosFeiraInicial.ordenarPor),
    direcao: hasQueryValue('direcao')
      ? (query?.direcao ?? paginacaoPrecosProdutosFeiraInicial.direcao)
      : (atual.direcao ?? paginacaoPrecosProdutosFeiraInicial.direcao),
  };
}

function getCatalogProductValue(
  item: InserirVendaInput['itens'][number],
  produtos: Produto[],
) {
  if (item.valorUnitario !== undefined) {
    return item.valorUnitario;
  }

  const product = produtos.find((current) => current.id === item.idProduto);
  return product?.valor ?? 0;
}

/**
 * Vendas enfileiradas antes da chave de idempotência existir recebem uma agora
 * e a gravam antes do envio, para que reenvios futuros não dupliquem a venda.
 */
async function ensureIdempotencyKey(
  pendingSale: PendingSaleRecord,
): Promise<PendingSaleRecord> {
  if (pendingSale.payload.chaveIdempotencia) {
    return pendingSale;
  }

  const updated = {
    ...pendingSale,
    payload: {
      ...pendingSale.payload,
      chaveIdempotencia: window.crypto.randomUUID(),
    },
  };
  await addPendingSale(updated);

  return updated;
}

/** Vendas guardadas pertencem a quem as registrou; legadas (sem dono) valem para todos. */
function belongsToCurrentUser(pendingSale: PendingSaleRecord): boolean {
  const currentUserId = getStoredUserId();

  return (
    pendingSale.idUsuario === undefined ||
    currentUserId === null ||
    pendingSale.idUsuario === currentUserId
  );
}

async function listCurrentUserPendingSales(): Promise<PendingSaleRecord[]> {
  return (await listPendingSales()).filter(belongsToCurrentUser);
}

function summarizePendingSales(pendingSales: PendingSaleRecord[]) {
  return {
    pendingSales,
    pendingSalesCount: pendingSales.length,
    rejectedSalesCount: pendingSales.filter((sale) => sale.ultimoErro).length,
  };
}

/** Erros que podem se resolver sozinhos: a venda continua na fila e é reenviada. */
function isTransientSyncStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 401 ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

interface OpcoesCarregamento {
  /**
   * Não consulta a API se os dados em memória têm menos que isso (ms). Evita
   * refazer a mesma requisição a cada abertura do modal de venda.
   */
  idadeMaximaMs?: number;
}

const ultimaAtualizacao = { feiras: 0, carteiras: 0 };

function dadosRecentes(
  chave: keyof typeof ultimaAtualizacao,
  possuiDados: boolean,
  opcoes?: OpcoesCarregamento,
): boolean {
  return (
    possuiDados &&
    opcoes?.idadeMaximaMs !== undefined &&
    Date.now() - ultimaAtualizacao[chave] < opcoes.idadeMaximaMs
  );
}

/**
 * Mostra primeiro o que está guardado no aparelho e atualiza pela API em
 * seguida. Com a API fora do ar (ou acordando) o cache continua valendo.
 */
async function carregarComCacheOffline<T>(etapas: {
  possuiDados: () => boolean;
  lerCache: () => Promise<T | null>;
  buscar: () => Promise<T>;
  salvarCache: (dados: T) => Promise<void>;
  aplicar: (dados: T) => void;
  falhar: (mensagem: string) => void;
}): Promise<boolean> {
  if (!etapas.possuiDados()) {
    const cache = await etapas.lerCache().catch(() => null);

    if (cache && !etapas.possuiDados()) {
      etapas.aplicar(cache);
    }
  }

  try {
    const dados = await etapas.buscar();
    etapas.aplicar(dados);
    await etapas.salvarCache(dados).catch(() => undefined);
    return true;
  } catch (error) {
    const problem = getProblemDetailsFromError(error);

    if (!isServerUnavailableStatus(problem.status) || !etapas.possuiDados()) {
      etapas.falhar(problem.detail);
    }

    return false;
  }
}

function buildOfflineSale(
  dados: InserirVendaInput,
  produtos: Produto[],
  feiras: Feira[],
  carteiras: Carteira[],
): Venda {
  const saleId = -Date.now();
  const createdAt = new Date().toISOString();
  const feira = feiras.find((current) => current.id === dados.idFeira) ?? null;

  const itens = dados.itens.map((item, index) => {
    const produto =
      produtos.find((current) => current.id === item.idProduto) ?? null;
    const valorUnitario = item.brinde
      ? 0
      : item.idProduto
        ? getCatalogProductValue(item, produtos)
        : (item.valorUnitario ?? 0);

    return {
      id: saleId - index - 1,
      idProduto: item.idProduto,
      nomeProduto: item.nomeProduto?.trim() || produto?.nome || 'Item avulso',
      quantidade: item.quantidade,
      valorUnitario,
      brinde: item.brinde ?? false,
      valorTotal: Math.max(0, valorUnitario * item.quantidade),
      produto,
    };
  });

  const totalItens = itens.reduce(
    (accumulator, item) => accumulator + item.valorTotal,
    0,
  );
  const valorTotal = Math.max(0, totalItens - (dados.desconto ?? 0));
  const pagamentos = dados.pagamentos.map((pagamento, index) => ({
    id: saleId - itens.length - index - 1,
    idVenda: saleId,
    idCarteira: pagamento.idCarteira,
    meioPagamento: pagamento.meioPagamento,
    valor: pagamento.valor,
    percentualTaxa: null,
    valorTaxa: null,
    percentualImposto: null,
    valorImposto: null,
    carteira:
      carteiras.find((current) => current.id === pagamento.idCarteira) ?? null,
  }));

  return {
    id: saleId,
    dataVenda: dados.dataVenda,
    dataInclusao: createdAt,
    valorTotal,
    valorLiquido: valorTotal,
    tipo: dados.tipo,
    desconto: dados.desconto ?? 0,
    idFeira: dados.idFeira,
    idOrcamento: dados.idOrcamento,
    feira,
    itens,
    pagamentos,
  };
}

/** Guarda a venda no aparelho; o envio acontece na sincronização. */
async function guardarVendaOffline(
  dados: InserirVendaInput,
  feiras: Feira[],
  carteiras: Carteira[],
) {
  const venda = buildOfflineSale(
    dados,
    (window as typeof window & { __AKKAI_PRODUCTS__?: Produto[] })
      .__AKKAI_PRODUCTS__ ?? [],
    feiras,
    carteiras,
  );

  await addPendingSale({
    id: window.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payload: dados,
    idUsuario: getStoredUserId() ?? undefined,
  });

  return {
    venda,
    resumo: summarizePendingSales(await listCurrentUserPendingSales()),
  };
}

interface SaleStoreState {
  vendas: Venda[];
  feiras: Feira[];
  feirasPaginadas: Feira[];
  carteiras: Carteira[];
  paginacao: PesquisaPaginadaVendas;
  paginacaoFeiras: PesquisaPaginadaFeiras;
  paginacaoPrecosProdutosFeira: PesquisaPaginadaPrecosProdutosFeira;
  totalItens: number;
  totalPaginas: number;
  totalFeiras: number;
  totalizadores: TotalizadoresVendas;
  pendingSales: PendingSaleRecord[];
  pendingSalesCount: number;
  rejectedSalesCount: number;
  isFetching: boolean;
  isFetchingFeiras: boolean;
  isFetchingCarteiras: boolean;
  isSubmitting: boolean;
  isSyncingPendingSales: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchVendas: (
    query?: Partial<PesquisaPaginadaVendas>,
  ) => Promise<ResultadoPaginado<Venda> | void>;
  fetchFeiras: (opcoes?: OpcoesCarregamento) => Promise<void>;
  fetchFeirasPaginadas: (
    query?: Partial<PesquisaPaginadaFeiras>,
  ) => Promise<ResultadoPaginado<Feira> | void>;
  setPaginacaoPrecosProdutosFeira: (
    query?: Partial<PesquisaPaginadaPrecosProdutosFeira>,
  ) => void;
  obterFeiraPorId: (id: number) => Promise<Feira>;
  fetchCarteiras: (opcoes?: OpcoesCarregamento) => Promise<void>;
  criarFeira: (dados: FeiraInput) => Promise<ActionResult<Feira>>;
  atualizarFeira: (
    id: number,
    dados: FeiraInput,
  ) => Promise<ActionResult<Feira>>;
  excluirFeira: (id: number) => Promise<ActionResult<void>>;
  criarVenda: (dados: InserirVendaInput) => Promise<ActionResult<Venda>>;
  criarTrocaDevolucao: (
    dados: InserirTrocaDevolucaoInput,
  ) => Promise<ActionResult<TrocaDevolucao>>;
  alterarVenda: (
    id: number,
    dados: InserirVendaInput,
  ) => Promise<ActionResult<Venda>>;
  excluirVenda: (id: number) => Promise<ActionResult<void>>;
  hydrateOfflineState: () => Promise<void>;
  sincronizarVendasPendentes: () => Promise<number>;
  reenviarVendaPendente: (id: string) => Promise<void>;
  descartarVendaPendente: (id: string) => Promise<void>;
  clearSubmitError: () => void;
}

export const useSaleStore = create<SaleStoreState>((set, get) => ({
  vendas: [],
  feiras: [],
  feirasPaginadas: [],
  carteiras: [],
  paginacao: paginacaoInicial,
  paginacaoFeiras: paginacaoFeirasInicial,
  paginacaoPrecosProdutosFeira: paginacaoPrecosProdutosFeiraInicial,
  totalItens: 0,
  totalPaginas: 1,
  totalFeiras: 0,
  totalizadores: totalizadoresVendasIniciais,
  pendingSales: [],
  pendingSalesCount: 0,
  rejectedSalesCount: 0,
  isFetching: false,
  isFetchingFeiras: false,
  isFetchingCarteiras: false,
  isSubmitting: false,
  isSyncingPendingSales: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchVendas: async (query) => {
    const currentPagination = get().paginacao;
    const hasQueryValue = <TKey extends keyof PesquisaPaginadaVendas>(
      key: TKey,
    ) => (query ? Object.prototype.hasOwnProperty.call(query, key) : false);

    const nextPagination: PesquisaPaginadaVendas = {
      pagina: hasQueryValue('pagina')
        ? (query?.pagina ?? paginacaoInicial.pagina)
        : currentPagination.pagina,
      tamanhoPagina: hasQueryValue('tamanhoPagina')
        ? (query?.tamanhoPagina ?? paginacaoInicial.tamanhoPagina)
        : currentPagination.tamanhoPagina,
      tipo: hasQueryValue('tipo') ? query?.tipo : currentPagination.tipo,
      idFeira: hasQueryValue('idFeira')
        ? query?.idFeira
        : currentPagination.idFeira,
      idProduto: hasQueryValue('idProduto')
        ? query?.idProduto
        : currentPagination.idProduto,
      idCarteira: hasQueryValue('idCarteira')
        ? query?.idCarteira
        : currentPagination.idCarteira,
      meioPagamento: hasQueryValue('meioPagamento')
        ? query?.meioPagamento
        : currentPagination.meioPagamento,
      dataInicio: hasQueryValue('dataInicio')
        ? query?.dataInicio
        : currentPagination.dataInicio,
      dataFim: hasQueryValue('dataFim')
        ? query?.dataFim
        : currentPagination.dataFim,
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listSales(nextPagination);
      set({
        vendas: response.itens,
        paginacao: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          tipo: nextPagination.tipo,
          idFeira: nextPagination.idFeira,
          idProduto: nextPagination.idProduto,
          idCarteira: nextPagination.idCarteira,
          meioPagamento: nextPagination.meioPagamento,
          dataInicio: nextPagination.dataInicio,
          dataFim: nextPagination.dataFim,
        },
        totalItens: response.totalItens,
        totalPaginas: response.totalPaginas,
        totalizadores: normalizarTotalizadoresVendas(response.totalizadores),
      });
      await saveCachedSales(response);
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (isServerUnavailableStatus(problem.status)) {
        const cachedResponse = await getCachedSales();

        if (cachedResponse) {
          set({
            vendas: cachedResponse.itens,
            paginacao: {
              pagina: cachedResponse.pagina,
              tamanhoPagina: cachedResponse.tamanhoPagina,
              tipo: nextPagination.tipo,
              idFeira: nextPagination.idFeira,
              idProduto: nextPagination.idProduto,
              idCarteira: nextPagination.idCarteira,
              meioPagamento: nextPagination.meioPagamento,
              dataInicio: nextPagination.dataInicio,
              dataFim: nextPagination.dataFim,
            },
            totalItens: cachedResponse.totalItens,
            totalPaginas: cachedResponse.totalPaginas,
            totalizadores: normalizarTotalizadoresVendas(
              (cachedResponse as ResultadoPaginadoVendas).totalizadores,
            ),
            fetchErrorMessage: null,
          });
          return cachedResponse;
        }
      }

      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  fetchFeiras: async (opcoes) => {
    if (dadosRecentes('feiras', get().feiras.length > 0, opcoes)) {
      return;
    }

    set({ isFetchingFeiras: true, fetchErrorMessage: null });
    try {
      const atualizou = await carregarComCacheOffline({
        possuiDados: () => get().feiras.length > 0,
        lerCache: getCachedFairs,
        buscar: listFairs,
        salvarCache: saveCachedFairs,
        aplicar: (feiras) => set({ feiras }),
        falhar: (mensagem) => set({ fetchErrorMessage: mensagem }),
      });

      if (atualizou) {
        ultimaAtualizacao.feiras = Date.now();
      }
    } finally {
      set({ isFetchingFeiras: false });
    }
  },
  fetchFeirasPaginadas: async (query) => {
    const currentPagination = get().paginacaoFeiras;
    const nextPagination: PesquisaPaginadaFeiras = {
      pagina: query?.pagina ?? currentPagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? currentPagination.tamanhoPagina,
      termo: query?.termo ?? currentPagination.termo ?? '',
    };

    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response = await listPagedFairs(nextPagination);
      set({
        feirasPaginadas: response.itens,
        paginacaoFeiras: {
          pagina: response.pagina,
          tamanhoPagina: response.tamanhoPagina,
          termo: nextPagination.termo,
        },
        totalFeiras: response.totalItens,
      });
      return response;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  setPaginacaoPrecosProdutosFeira: (query) => {
    set((state) => ({
      paginacaoPrecosProdutosFeira: resolverPaginacaoPrecosProdutosFeira(
        state.paginacaoPrecosProdutosFeira,
        query,
      ),
    }));
  },
  obterFeiraPorId: async (id) => {
    return getFairById(id);
  },
  fetchCarteiras: async (opcoes) => {
    if (dadosRecentes('carteiras', get().carteiras.length > 0, opcoes)) {
      return;
    }

    set({ isFetchingCarteiras: true, fetchErrorMessage: null });
    try {
      const atualizou = await carregarComCacheOffline({
        possuiDados: () => get().carteiras.length > 0,
        lerCache: getCachedWallets,
        buscar: listWallets,
        salvarCache: saveCachedWallets,
        aplicar: (carteiras) => set({ carteiras }),
        falhar: (mensagem) => set({ fetchErrorMessage: mensagem }),
      });

      if (atualizou) {
        ultimaAtualizacao.carteiras = Date.now();
      }
    } finally {
      set({ isFetchingCarteiras: false });
    }
  },
  criarFeira: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const feira = await createFair(dados);
      return { success: true, data: feira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  atualizarFeira: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const feira = await updateFair(id, dados);
      return { success: true, data: feira };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirFeira: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteFair(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  criarVenda: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    const finalizaOrcamento = dados.idOrcamento !== undefined;
    const guardarOffline = async (): Promise<ActionResult<Venda>> => {
      const { venda, resumo } = await guardarVendaOffline(
        dados,
        get().feiras,
        get().carteiras,
      );
      set({ ...resumo, submitErrorMessage: null });
      return { success: true, data: venda };
    };

    try {
      // Com a API sabidamente fora do ar não adianta esperar o tempo limite
      // da requisição: a venda vai direto para a fila do aparelho.
      if (!finalizaOrcamento && !getOnlineStatus()) {
        return await guardarOffline();
      }

      const venda = await createSale(dados);
      return { success: true, data: venda };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (finalizaOrcamento && problem.status === 0) {
        const offlineBudgetProblem = {
          type: 'about:blank',
          title: 'Venda online obrigatória',
          status: 0,
          detail:
            'Não é possível finalizar orçamento offline. Conecte-se à internet e tente novamente.',
          instance: '',
        };

        set({ submitErrorMessage: offlineBudgetProblem.detail });
        return { success: false, problem: offlineBudgetProblem };
      }

      // Sem conexão, tempo esgotado ou servidor acordando (5xx): a venda não
      // se perde. A chave de idempotência evita duplicar se ela chegou a ser
      // gravada.
      if (!finalizaOrcamento && isServerUnavailableStatus(problem.status)) {
        return await guardarOffline();
      }

      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  criarTrocaDevolucao: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const trocaDevolucao = await createExchangeReturn(dados);
      return { success: true, data: trocaDevolucao };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  alterarVenda: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const venda = await updateSale(id, dados);
      return { success: true, data: venda };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  excluirVenda: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteSale(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },
  hydrateOfflineState: async () => {
    set(summarizePendingSales(await listCurrentUserPendingSales()));
  },
  sincronizarVendasPendentes: async () => {
    if (get().isSyncingPendingSales) {
      return 0;
    }

    set({ isSyncingPendingSales: true });

    try {
      // Vendas já recusadas pelo servidor esperam decisão do usuário (reenviar
      // ou descartar) em vez de falhar de novo a cada ciclo.
      const pendingSales = (await listCurrentUserPendingSales()).filter(
        (sale) => !sale.ultimoErro,
      );
      let syncedCount = 0;

      // Envio em sequência: preserva a ordem das vendas e evita disputa pelo
      // bloqueio de estoque, que fazia vendas válidas falharem de forma arbitrária.
      for (const pendingSale of pendingSales) {
        const sale = await ensureIdempotencyKey(pendingSale);

        try {
          await createSale({
            ...sale.payload,
            vendaOffline: true,
            dataVenda:
              sale.payload.dataVenda ??
              formatLocalDate(new Date(sale.createdAt), 'api-date-time'),
          });
          await removePendingSale(sale.id);
          syncedCount += 1;
        } catch (error) {
          const problem = getProblemDetailsFromError(error);

          // Sem conexão ou servidor indisponível, as demais também falhariam:
          // mantém a fila intacta e tenta no próximo ciclo.
          if (isTransientSyncStatus(problem.status)) {
            break;
          }

          await addPendingSale({
            ...sale,
            ultimoErro: problem.detail,
            tentativas: (sale.tentativas ?? 0) + 1,
          });
        }
      }

      set(summarizePendingSales(await listCurrentUserPendingSales()));

      if (syncedCount > 0) {
        await get().fetchVendas({ pagina: 1 });
      }

      return syncedCount;
    } finally {
      set({ isSyncingPendingSales: false });
    }
  },
  reenviarVendaPendente: async (id) => {
    const pendingSale = (await listPendingSales()).find(
      (sale) => sale.id === id,
    );

    if (pendingSale) {
      await addPendingSale({ ...pendingSale, ultimoErro: undefined });
    }

    await get().sincronizarVendasPendentes();
  },
  descartarVendaPendente: async (id) => {
    await removePendingSale(id);
    set(summarizePendingSales(await listCurrentUserPendingSales()));
  },
  clearSubmitError: () => {
    set({ submitErrorMessage: null });
  },
}));

export const saleStoreSelectors = {
  vendas: (state: SaleStoreState) => state.vendas,
  feiras: (state: SaleStoreState) => state.feiras,
  feirasPaginadas: (state: SaleStoreState) => state.feirasPaginadas,
  carteiras: (state: SaleStoreState) => state.carteiras,
  paginacao: (state: SaleStoreState) => state.paginacao,
  paginacaoFeiras: (state: SaleStoreState) => state.paginacaoFeiras,
  paginacaoPrecosProdutosFeira: (state: SaleStoreState) =>
    state.paginacaoPrecosProdutosFeira,
  totalItens: (state: SaleStoreState) => state.totalItens,
  totalPaginas: (state: SaleStoreState) => state.totalPaginas,
  totalFeiras: (state: SaleStoreState) => state.totalFeiras,
  totalizadores: (state: SaleStoreState) => state.totalizadores,
  pendingSales: (state: SaleStoreState) => state.pendingSales,
  pendingSalesCount: (state: SaleStoreState) => state.pendingSalesCount,
  rejectedSalesCount: (state: SaleStoreState) => state.rejectedSalesCount,
  isFetching: (state: SaleStoreState) => state.isFetching,
  isFetchingFeiras: (state: SaleStoreState) => state.isFetchingFeiras,
  isFetchingCarteiras: (state: SaleStoreState) => state.isFetchingCarteiras,
  isSubmitting: (state: SaleStoreState) => state.isSubmitting,
  isSyncingPendingSales: (state: SaleStoreState) => state.isSyncingPendingSales,
  fetchErrorMessage: (state: SaleStoreState) => state.fetchErrorMessage,
  submitErrorMessage: (state: SaleStoreState) => state.submitErrorMessage,
  fetchVendas: (state: SaleStoreState) => state.fetchVendas,
  fetchFeiras: (state: SaleStoreState) => state.fetchFeiras,
  fetchFeirasPaginadas: (state: SaleStoreState) => state.fetchFeirasPaginadas,
  setPaginacaoPrecosProdutosFeira: (state: SaleStoreState) =>
    state.setPaginacaoPrecosProdutosFeira,
  obterFeiraPorId: (state: SaleStoreState) => state.obterFeiraPorId,
  fetchCarteiras: (state: SaleStoreState) => state.fetchCarteiras,
  criarFeira: (state: SaleStoreState) => state.criarFeira,
  atualizarFeira: (state: SaleStoreState) => state.atualizarFeira,
  excluirFeira: (state: SaleStoreState) => state.excluirFeira,
  criarVenda: (state: SaleStoreState) => state.criarVenda,
  criarTrocaDevolucao: (state: SaleStoreState) => state.criarTrocaDevolucao,
  alterarVenda: (state: SaleStoreState) => state.alterarVenda,
  excluirVenda: (state: SaleStoreState) => state.excluirVenda,
  hydrateOfflineState: (state: SaleStoreState) => state.hydrateOfflineState,
  sincronizarVendasPendentes: (state: SaleStoreState) =>
    state.sincronizarVendasPendentes,
  reenviarVendaPendente: (state: SaleStoreState) => state.reenviarVendaPendente,
  descartarVendaPendente: (state: SaleStoreState) =>
    state.descartarVendaPendente,
  clearSubmitError: (state: SaleStoreState) => state.clearSubmitError,
};

export type {
  InserirVendaInput,
  MeioPagamento,
  TipoVenda,
  Venda,
} from '@/shared/lib/types/domain';
