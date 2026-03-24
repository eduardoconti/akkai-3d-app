import { create } from 'zustand';

export interface Produto {
  id: number;
  nome: string;
  codigo: string;
  descricao: string;
  valor: number;
}
export interface ProdutoInput {
  nome: string;
  codigo: string;
  descricao?: string;
  idCategoria: number;
  valor: number; // Enviando em centavos conforme seu DTO
}

interface Categoria {
  id: number;
  nome: string;
  idAscendente: number | null;
}
interface ProductState {
  produtos: Produto[];
  isLoading: boolean;
  categorias: Categoria[];
  fetchProdutos: () => Promise<void>;
  criarProduto: (novoProduto: ProdutoInput) => Promise<boolean>;
  fetchCategorias: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  produtos: [],
  isLoading: false,
  categorias: [],
  fetchProdutos: async () => {
    set({ isLoading: true });
    try {
      // Substitua pela sua URL real do backend
      const response = await fetch('http://localhost:3000/produto');
      const data = await response.json();
      set({ produtos: data, isLoading: false });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      set({ isLoading: false });
    }
  },
  criarProduto: async (novoProduto: ProdutoInput) => {
    set({ isLoading: true });
    try {
      const response = await fetch('http://localhost:3000/produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoProduto),
      });

      if (response.ok) {
        // Opcional: Você pode dar um fetchProdutos() aqui dentro
        // ou deixar para o componente decidir quando atualizar.
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  fetchCategorias: async () => {
    try {
      const response = await fetch('http://localhost:3000/produto/categorias');
      const dados = await response.json();
      set({ categorias: dados });
    } catch (error) {
      console.error('Erro ao buscar categorias', error);
    }
  },
}));
