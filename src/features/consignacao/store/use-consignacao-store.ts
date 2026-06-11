import { create } from 'zustand';
import {
  atualizarRevendedor,
  criarConsignacao,
  criarRevendedor,
  listarConsignacoes,
  listarRevendedores,
  obterConsignacaoPorId,
  obterRevendedorPorId,
  registrarDevolucaoConsignada,
  registrarVendasRevendedorConsignado,
} from '@/features/consignacao/api/consignacao-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Consignacao,
  InserirConsignacaoInput,
  PesquisaPaginadaConsignacoes,
  PesquisaPaginadaRevendedores,
  RegistrarDevolucaoConsignadaInput,
  RegistrarVendasConsignadasInput,
  ResultadoPaginado,
  Revendedor,
  RevendedorInput,
} from '@/shared/lib/types/domain';

const paginacaoRevendedoresInicial: PesquisaPaginadaRevendedores = {
  pagina: 1,
  tamanhoPagina: 50,
  termo: '',
  status: undefined,
  ordenarPor: 'nome',
};

const paginacaoConsignacoesInicial: PesquisaPaginadaConsignacoes = {
  pagina: 1,
  tamanhoPagina: 50,
  termo: '',
  idRevendedor: undefined,
  status: undefined,
  ordenarPor: 'dataInclusao',
};

function resolverPaginacaoRevendedores(
  atual: PesquisaPaginadaRevendedores,
  query?: Partial<PesquisaPaginadaRevendedores>,
): PesquisaPaginadaRevendedores {
  return {
    pagina: query?.pagina ?? atual.pagina,
    tamanhoPagina: query?.tamanhoPagina ?? atual.tamanhoPagina,
    termo:
      query && Object.prototype.hasOwnProperty.call(query, 'termo')
        ? (query.termo ?? '')
        : (atual.termo ?? ''),
    status:
      query && Object.prototype.hasOwnProperty.call(query, 'status')
        ? query.status
        : atual.status,
    ordenarPor: query?.ordenarPor ?? atual.ordenarPor,
  };
}

function resolverPaginacaoConsignacoes(
  atual: PesquisaPaginadaConsignacoes,
  query?: Partial<PesquisaPaginadaConsignacoes>,
): PesquisaPaginadaConsignacoes {
  return {
    pagina: query?.pagina ?? atual.pagina,
    tamanhoPagina: query?.tamanhoPagina ?? atual.tamanhoPagina,
    termo:
      query && Object.prototype.hasOwnProperty.call(query, 'termo')
        ? (query.termo ?? '')
        : (atual.termo ?? ''),
    idRevendedor:
      query && Object.prototype.hasOwnProperty.call(query, 'idRevendedor')
        ? query.idRevendedor
        : atual.idRevendedor,
    status:
      query && Object.prototype.hasOwnProperty.call(query, 'status')
        ? query.status
        : atual.status,
    ordenarPor: query?.ordenarPor ?? atual.ordenarPor,
  };
}

interface ConsignacaoStoreState {
  revendedores: Revendedor[];
  consignacoes: Consignacao[];
  detalheConsignacao: Consignacao | null;
  paginacaoRevendedores: PesquisaPaginadaRevendedores;
  paginacaoConsignacoes: PesquisaPaginadaConsignacoes;
  totalRevendedores: number;
  totalPaginasRevendedores: number;
  totalConsignacoes: number;
  totalPaginasConsignacoes: number;
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchRevendedores: (
    query?: Partial<PesquisaPaginadaRevendedores>,
  ) => Promise<ResultadoPaginado<Revendedor> | void>;
  obterRevendedorPorId: (id: number) => Promise<Revendedor>;
  criarRevendedor: (
    dados: RevendedorInput,
  ) => Promise<ActionResult<Revendedor>>;
  atualizarRevendedor: (
    id: number,
    dados: RevendedorInput,
  ) => Promise<ActionResult<Revendedor>>;
  fetchConsignacoes: (
    query?: Partial<PesquisaPaginadaConsignacoes>,
  ) => Promise<ResultadoPaginado<Consignacao> | void>;
  obterConsignacaoPorId: (id: number) => Promise<Consignacao>;
  criarConsignacao: (
    dados: InserirConsignacaoInput,
  ) => Promise<ActionResult<Consignacao>>;
  registrarVendasRevendedor: (
    idRevendedor: number,
    dados: RegistrarVendasConsignadasInput,
  ) => Promise<ActionResult<Consignacao[]>>;
  registrarDevolucao: (
    idConsignacao: number,
    idItem: number,
    dados: RegistrarDevolucaoConsignadaInput,
  ) => Promise<ActionResult<Consignacao>>;
  clearSubmitError: () => void;
}

export const useConsignacaoStore = create<ConsignacaoStoreState>(
  (set, get) => ({
    revendedores: [],
    consignacoes: [],
    detalheConsignacao: null,
    paginacaoRevendedores: paginacaoRevendedoresInicial,
    paginacaoConsignacoes: paginacaoConsignacoesInicial,
    totalRevendedores: 0,
    totalPaginasRevendedores: 1,
    totalConsignacoes: 0,
    totalPaginasConsignacoes: 1,
    isFetching: false,
    isSubmitting: false,
    fetchErrorMessage: null,
    submitErrorMessage: null,
    fetchRevendedores: async (query) => {
      const proximaPaginacao = resolverPaginacaoRevendedores(
        get().paginacaoRevendedores,
        query,
      );

      set({ isFetching: true, fetchErrorMessage: null });
      try {
        const resposta = await listarRevendedores(proximaPaginacao);
        set({
          revendedores: resposta.itens,
          paginacaoRevendedores: {
            ...proximaPaginacao,
            pagina: resposta.pagina,
            tamanhoPagina: resposta.tamanhoPagina,
          },
          totalRevendedores: resposta.totalItens,
          totalPaginasRevendedores: resposta.totalPaginas,
        });
        return resposta;
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ fetchErrorMessage: problem.detail });
      } finally {
        set({ isFetching: false });
      }
    },
    obterRevendedorPorId: async (id) => obterRevendedorPorId(id),
    criarRevendedor: async (dados) => {
      set({ isSubmitting: true, submitErrorMessage: null });
      try {
        const revendedor = await criarRevendedor(dados);
        return { success: true, data: revendedor };
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ submitErrorMessage: problem.detail });
        return { success: false, problem };
      } finally {
        set({ isSubmitting: false });
      }
    },
    atualizarRevendedor: async (id, dados) => {
      set({ isSubmitting: true, submitErrorMessage: null });
      try {
        const revendedor = await atualizarRevendedor(id, dados);
        return { success: true, data: revendedor };
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ submitErrorMessage: problem.detail });
        return { success: false, problem };
      } finally {
        set({ isSubmitting: false });
      }
    },
    fetchConsignacoes: async (query) => {
      const proximaPaginacao = resolverPaginacaoConsignacoes(
        get().paginacaoConsignacoes,
        query,
      );

      set({ isFetching: true, fetchErrorMessage: null });
      try {
        const resposta = await listarConsignacoes(proximaPaginacao);
        set({
          consignacoes: resposta.itens,
          paginacaoConsignacoes: {
            ...proximaPaginacao,
            pagina: resposta.pagina,
            tamanhoPagina: resposta.tamanhoPagina,
          },
          totalConsignacoes: resposta.totalItens,
          totalPaginasConsignacoes: resposta.totalPaginas,
        });
        return resposta;
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ fetchErrorMessage: problem.detail });
      } finally {
        set({ isFetching: false });
      }
    },
    obterConsignacaoPorId: async (id) => {
      const consignacao = await obterConsignacaoPorId(id);
      set({ detalheConsignacao: consignacao });
      return consignacao;
    },
    criarConsignacao: async (dados) => {
      set({ isSubmitting: true, submitErrorMessage: null });
      try {
        const consignacao = await criarConsignacao(dados);
        return { success: true, data: consignacao };
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ submitErrorMessage: problem.detail });
        return { success: false, problem };
      } finally {
        set({ isSubmitting: false });
      }
    },
    registrarVendasRevendedor: async (idRevendedor, dados) => {
      set({ isSubmitting: true, submitErrorMessage: null });
      try {
        const consignacoes = await registrarVendasRevendedorConsignado(
          idRevendedor,
          dados,
        );
        set({ detalheConsignacao: consignacoes[0] ?? null });
        return { success: true, data: consignacoes };
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ submitErrorMessage: problem.detail });
        return { success: false, problem };
      } finally {
        set({ isSubmitting: false });
      }
    },
    registrarDevolucao: async (idConsignacao, idItem, dados) => {
      set({ isSubmitting: true, submitErrorMessage: null });
      try {
        const consignacao = await registrarDevolucaoConsignada(
          idConsignacao,
          idItem,
          dados,
        );
        set({ detalheConsignacao: consignacao });
        return { success: true, data: consignacao };
      } catch (error) {
        const problem = getProblemDetailsFromError(error);
        set({ submitErrorMessage: problem.detail });
        return { success: false, problem };
      } finally {
        set({ isSubmitting: false });
      }
    },
    clearSubmitError: () => set({ submitErrorMessage: null }),
  }),
);

export const consignacaoStoreSelectors = {
  revendedores: (state: ConsignacaoStoreState) => state.revendedores,
  consignacoes: (state: ConsignacaoStoreState) => state.consignacoes,
  detalheConsignacao: (state: ConsignacaoStoreState) =>
    state.detalheConsignacao,
  paginacaoRevendedores: (state: ConsignacaoStoreState) =>
    state.paginacaoRevendedores,
  paginacaoConsignacoes: (state: ConsignacaoStoreState) =>
    state.paginacaoConsignacoes,
  totalRevendedores: (state: ConsignacaoStoreState) => state.totalRevendedores,
  totalConsignacoes: (state: ConsignacaoStoreState) => state.totalConsignacoes,
  isFetching: (state: ConsignacaoStoreState) => state.isFetching,
  isSubmitting: (state: ConsignacaoStoreState) => state.isSubmitting,
  fetchErrorMessage: (state: ConsignacaoStoreState) => state.fetchErrorMessage,
  submitErrorMessage: (state: ConsignacaoStoreState) =>
    state.submitErrorMessage,
  fetchRevendedores: (state: ConsignacaoStoreState) => state.fetchRevendedores,
  obterRevendedorPorId: (state: ConsignacaoStoreState) =>
    state.obterRevendedorPorId,
  criarRevendedor: (state: ConsignacaoStoreState) => state.criarRevendedor,
  atualizarRevendedor: (state: ConsignacaoStoreState) =>
    state.atualizarRevendedor,
  fetchConsignacoes: (state: ConsignacaoStoreState) => state.fetchConsignacoes,
  obterConsignacaoPorId: (state: ConsignacaoStoreState) =>
    state.obterConsignacaoPorId,
  criarConsignacao: (state: ConsignacaoStoreState) => state.criarConsignacao,
  registrarVendasRevendedor: (state: ConsignacaoStoreState) =>
    state.registrarVendasRevendedor,
  registrarDevolucao: (state: ConsignacaoStoreState) =>
    state.registrarDevolucao,
  clearSubmitError: (state: ConsignacaoStoreState) => state.clearSubmitError,
};
