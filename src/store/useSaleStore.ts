import { create } from 'zustand';
import { apiClient, getProblemDetailsFromError } from '../shared/api/http-client';
import type { ActionResult } from '../shared/types/action-result';
import type {
  Feira,
  InserirVendaInput,
  Venda,
} from '../shared/types/domain';

interface SaleState {
  vendas: Venda[];
  feiras: Feira[];
  isFetching: boolean;
  isSubmitting: boolean;
  fetchErrorMessage: string | null;
  submitErrorMessage: string | null;
  fetchVendas: () => Promise<void>;
  fetchFeiras: () => Promise<void>;
  criarVenda: (dados: InserirVendaInput) => Promise<ActionResult<Venda>>;
  clearSubmitError: () => void;
}

export const useSaleStore = create<SaleState>((set) => ({
  vendas: [],
  feiras: [],
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchVendas: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const vendas = await apiClient.get<Venda[]>('/venda');
      set({ vendas });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  fetchFeiras: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const feiras = await apiClient.get<Feira[]>('/venda/feiras');
      set({ feiras });
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      set({ fetchErrorMessage: problem.detail });
    } finally {
      set({ isFetching: false });
    }
  },
  criarVenda: async (dados) => {
    set({ isSubmitting: true, submitErrorMessage: null });
    try {
      const venda = await apiClient.post<Venda>('/venda', dados);
      return { success: true, data: venda };
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

export type { InserirVendaInput, MeioPagamento, TipoVenda, Venda } from '../shared/types/domain';
