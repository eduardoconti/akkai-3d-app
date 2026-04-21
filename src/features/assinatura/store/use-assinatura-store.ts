import { create } from 'zustand';
import {
  createAssinante,
  createCiclo,
  createKit,
  createPlano,
  deleteAssinante,
  deleteCiclo,
  deleteKit,
  deletePlano,
  gerarCiclosMensais,
  getAssinanteById,
  getCicloById,
  getKitById,
  getPlanoById,
  listAssinantes,
  listCiclos,
  listKits,
  listPlanos,
  updateAssinante,
  updateCiclo,
  updateKit,
  updatePlano,
} from '@/features/assinatura/api/assinatura-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  AlterarCicloAssinaturaInput,
  AlterarKitMensalInput,
  Assinante,
  CicloAssinatura,
  CicloAssinaturaInput,
  GerarCiclosResult,
  KitMensal,
  KitMensalInput,
  PesquisarAssinantesInput,
  PesquisarCiclosInput,
  PesquisarKitsInput,
  PlanoAssinatura,
  PlanoAssinaturaInput,
  ResultadoPaginado,
  StatusAssinante,
} from '@/shared';

const paginacaoAssinantesInicial: PesquisarAssinantesInput = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
  status: undefined,
  idPlano: undefined,
};

const paginacaoCiclosInicial: PesquisarCiclosInput = {
  pagina: 1,
  tamanhoPagina: 10,
  idAssinante: undefined,
  status: undefined,
  mes: undefined,
  ano: undefined,
};

const paginacaoKitsInicial: PesquisarKitsInput = {
  pagina: 1,
  tamanhoPagina: 10,
  idPlano: undefined,
  mes: undefined,
  ano: undefined,
};

interface AssinaturaStoreState {
  planos: PlanoAssinatura[];
  assinantes: Assinante[];
  ciclos: CicloAssinatura[];
  kits: KitMensal[];
  paginacaoAssinantes: PesquisarAssinantesInput;
  paginacaoCiclos: PesquisarCiclosInput;
  paginacaoKits: PesquisarKitsInput;
  totalAssinantes: number;
  totalCiclos: number;
  totalKits: number;
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;

  fetchPlanos: () => Promise<void>;
  obterPlanoPorId: (id: number) => Promise<PlanoAssinatura>;
  criarPlano: (dados: PlanoAssinaturaInput) => Promise<ActionResult<PlanoAssinatura>>;
  atualizarPlano: (
    id: number,
    dados: PlanoAssinaturaInput,
  ) => Promise<ActionResult<PlanoAssinatura>>;
  excluirPlano: (id: number) => Promise<ActionResult<void>>;

  fetchAssinantes: (query?: Partial<PesquisarAssinantesInput>) => Promise<void>;
  obterAssinantePorId: (id: number) => Promise<Assinante>;
  criarAssinante: (dados: {
    nome: string;
    email?: string;
    telefone?: string;
    enderecoEntrega?: string;
    idPlano: number;
    status?: StatusAssinante;
  }) => Promise<ActionResult<Assinante>>;
  atualizarAssinante: (
    id: number,
    dados: {
      nome: string;
      email?: string;
      telefone?: string;
      enderecoEntrega?: string;
      idPlano: number;
      status: StatusAssinante;
    },
  ) => Promise<ActionResult<Assinante>>;
  excluirAssinante: (id: number) => Promise<ActionResult<void>>;

  fetchCiclos: (query?: Partial<PesquisarCiclosInput>) => Promise<void>;
  obterCicloPorId: (id: number) => Promise<CicloAssinatura>;
  criarCiclo: (dados: CicloAssinaturaInput) => Promise<ActionResult<CicloAssinatura>>;
  atualizarCiclo: (
    id: number,
    dados: AlterarCicloAssinaturaInput,
  ) => Promise<ActionResult<CicloAssinatura>>;
  excluirCiclo: (id: number) => Promise<ActionResult<void>>;

  fetchKits: (query?: Partial<PesquisarKitsInput>) => Promise<void>;
  obterKitPorId: (id: number) => Promise<KitMensal>;
  criarKit: (dados: KitMensalInput) => Promise<ActionResult<KitMensal>>;
  atualizarKit: (
    id: number,
    dados: AlterarKitMensalInput,
  ) => Promise<ActionResult<KitMensal>>;
  excluirKit: (id: number) => Promise<ActionResult<void>>;
  gerarCiclosMensais: (id: number) => Promise<ActionResult<GerarCiclosResult>>;

  clearSubmitError: () => void;
}

function mergeQuery<T extends object>(current: T, next?: Partial<T>): T {
  if (!next) return current;
  return { ...current, ...next };
}

export const useAssinaturaStore = create<AssinaturaStoreState>((set, get) => ({
  planos: [],
  assinantes: [],
  ciclos: [],
  kits: [],
  paginacaoAssinantes: paginacaoAssinantesInicial,
  paginacaoCiclos: paginacaoCiclosInicial,
  paginacaoKits: paginacaoKitsInicial,
  totalAssinantes: 0,
  totalCiclos: 0,
  totalKits: 0,
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,

  fetchPlanos: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const planos = await listPlanos();
      set({ planos });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },

  obterPlanoPorId: async (id) => getPlanoById(id),

  criarPlano: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const plano = await createPlano(dados);
      return { success: true, data: plano };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  atualizarPlano: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const plano = await updatePlano(id, dados);
      return { success: true, data: plano };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  excluirPlano: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deletePlano(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchAssinantes: async (query) => {
    const next = mergeQuery(get().paginacaoAssinantes, query);
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response: ResultadoPaginado<Assinante> = await listAssinantes(next);
      set({
        assinantes: response.itens,
        paginacaoAssinantes: { ...next, pagina: response.pagina },
        totalAssinantes: response.totalItens,
      });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },

  obterAssinantePorId: async (id) => getAssinanteById(id),

  criarAssinante: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const assinante = await createAssinante(dados);
      return { success: true, data: assinante };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  atualizarAssinante: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const assinante = await updateAssinante(id, dados);
      return { success: true, data: assinante };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  excluirAssinante: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteAssinante(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchCiclos: async (query) => {
    const next = mergeQuery(get().paginacaoCiclos, query);
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response: ResultadoPaginado<CicloAssinatura> = await listCiclos(next);
      set({
        ciclos: response.itens,
        paginacaoCiclos: { ...next, pagina: response.pagina },
        totalCiclos: response.totalItens,
      });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },

  obterCicloPorId: async (id) => getCicloById(id),

  criarCiclo: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const ciclo = await createCiclo(dados);
      return { success: true, data: ciclo };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  atualizarCiclo: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const ciclo = await updateCiclo(id, dados);
      return { success: true, data: ciclo };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  excluirCiclo: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteCiclo(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchKits: async (query) => {
    const next = mergeQuery(get().paginacaoKits, query);
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const response: ResultadoPaginado<KitMensal> = await listKits(next);
      set({
        kits: response.itens,
        paginacaoKits: { ...next, pagina: response.pagina },
        totalKits: response.totalItens,
      });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },

  obterKitPorId: async (id) => getKitById(id),

  criarKit: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const kit = await createKit(dados);
      return { success: true, data: kit };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  atualizarKit: async (id, dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const kit = await updateKit(id, dados);
      return { success: true, data: kit };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  excluirKit: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      await deleteKit(id);
      return { success: true, data: undefined };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  gerarCiclosMensais: async (id) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const result = await gerarCiclosMensais(id);
      return { success: true, data: result };
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ submitErrorMessage: problem.detail });
      return { success: false, problem };
    } finally {
      set({ isSubmitting: false });
    }
  },

  clearSubmitError: () => set({ submitErrorMessage: null }),
}));

export const assinaturaStoreSelectors = {
  planos: (s: AssinaturaStoreState) => s.planos,
  assinantes: (s: AssinaturaStoreState) => s.assinantes,
  ciclos: (s: AssinaturaStoreState) => s.ciclos,
  kits: (s: AssinaturaStoreState) => s.kits,
  paginacaoAssinantes: (s: AssinaturaStoreState) => s.paginacaoAssinantes,
  paginacaoCiclos: (s: AssinaturaStoreState) => s.paginacaoCiclos,
  paginacaoKits: (s: AssinaturaStoreState) => s.paginacaoKits,
  totalAssinantes: (s: AssinaturaStoreState) => s.totalAssinantes,
  totalCiclos: (s: AssinaturaStoreState) => s.totalCiclos,
  totalKits: (s: AssinaturaStoreState) => s.totalKits,
  isFetching: (s: AssinaturaStoreState) => s.isFetching,
  isSubmitting: (s: AssinaturaStoreState) => s.isSubmitting,
  fetchErrorMessage: (s: AssinaturaStoreState) => s.fetchErrorMessage,
  submitErrorMessage: (s: AssinaturaStoreState) => s.submitErrorMessage,
  fetchPlanos: (s: AssinaturaStoreState) => s.fetchPlanos,
  obterPlanoPorId: (s: AssinaturaStoreState) => s.obterPlanoPorId,
  criarPlano: (s: AssinaturaStoreState) => s.criarPlano,
  atualizarPlano: (s: AssinaturaStoreState) => s.atualizarPlano,
  excluirPlano: (s: AssinaturaStoreState) => s.excluirPlano,
  fetchAssinantes: (s: AssinaturaStoreState) => s.fetchAssinantes,
  obterAssinantePorId: (s: AssinaturaStoreState) => s.obterAssinantePorId,
  criarAssinante: (s: AssinaturaStoreState) => s.criarAssinante,
  atualizarAssinante: (s: AssinaturaStoreState) => s.atualizarAssinante,
  excluirAssinante: (s: AssinaturaStoreState) => s.excluirAssinante,
  fetchCiclos: (s: AssinaturaStoreState) => s.fetchCiclos,
  obterCicloPorId: (s: AssinaturaStoreState) => s.obterCicloPorId,
  criarCiclo: (s: AssinaturaStoreState) => s.criarCiclo,
  atualizarCiclo: (s: AssinaturaStoreState) => s.atualizarCiclo,
  excluirCiclo: (s: AssinaturaStoreState) => s.excluirCiclo,
  fetchKits: (s: AssinaturaStoreState) => s.fetchKits,
  obterKitPorId: (s: AssinaturaStoreState) => s.obterKitPorId,
  criarKit: (s: AssinaturaStoreState) => s.criarKit,
  atualizarKit: (s: AssinaturaStoreState) => s.atualizarKit,
  excluirKit: (s: AssinaturaStoreState) => s.excluirKit,
  gerarCiclosMensais: (s: AssinaturaStoreState) => s.gerarCiclosMensais,
  clearSubmitError: (s: AssinaturaStoreState) => s.clearSubmitError,
};
