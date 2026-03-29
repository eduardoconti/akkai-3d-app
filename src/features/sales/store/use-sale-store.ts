import { create } from 'zustand';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  createSale,
  listFairs,
  listSales,
} from '@/features/sales/api/sales-api';
import type { ActionResult } from '@/shared/lib/types/action-result';
import type {
  Feira,
  InserirVendaInput,
  Venda,
} from '@/shared/lib/types/domain';

interface SaleStoreState {
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

export const useSaleStore = create<SaleStoreState>((set) => ({
  vendas: [],
  feiras: [],
  isFetching: false,
  isSubmitting: false,
  fetchErrorMessage: null,
  submitErrorMessage: null,
  fetchVendas: async () => {
    set({ isFetching: true, fetchErrorMessage: null });
    try {
      const vendas = await listSales();
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
      const feiras = await listFairs();
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
      const venda = await createSale(dados);
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

export type {
  InserirVendaInput,
  MeioPagamento,
  TipoVenda,
  Venda,
} from '@/shared/lib/types/domain';
