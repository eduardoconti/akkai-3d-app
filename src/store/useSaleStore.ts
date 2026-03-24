import { create } from 'zustand';
import type { Produto } from './useProductSotre';

export interface VendaItem {
  id: number;
  idProduto: number;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  desconto: number;
  produto: Produto;
}

export interface Venda {
  id: number;
  dataInclusao: string;
  valorTotal: number;
  tipo: string;
  meioPagamento: string;
  desconto: number;
  itens: VendaItem[];
}

interface SaleState {
  vendas: Venda[];
  isLoading: boolean;
  fetchVendas: () => Promise<void>;
  criarVenda: (dados: InserirVendaInput) => Promise<boolean>;
}

export const useSaleStore = create<SaleState>((set) => ({
  vendas: [],
  isLoading: false,
  fetchVendas: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('http://localhost:3000/venda');
      const data = await response.json();
      set({ vendas: data, isLoading: false });
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      set({ isLoading: false });
    }
  },
  criarVenda: async (dados: InserirVendaInput) => {
    try {
      const response = await fetch('http://localhost:3000/venda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      return false;
    }
  },
}));

export type MeioPagamento = 'DIN' | 'DEB' | 'CRE' | 'PIX';

export type TipoVenda = 'FEIRA' | 'LOJA' | 'ONLINE';

export interface InserirVendaInput {
  meioPagamento: MeioPagamento;
  tipo: TipoVenda;
  desconto?: number;
  itens: {
    quantidade: number;
    desconto?: number;
    idProduto: number;
  }[];
}

// Dentro do seu useSaleStore...
