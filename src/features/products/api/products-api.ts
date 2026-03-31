import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Categoria,
  DetalheProduto,
  EstoqueInput,
  OrigemEntradaEstoque,
  OrigemSaidaEstoque,
  PesquisaPaginada,
  Produto,
  ProdutoInput,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

export interface CategoriaInput {
  nome: string;
  idAscendente?: number;
}

export function listProducts(
  query: PesquisaPaginada,
): Promise<ResultadoPaginado<Produto>> {
  return httpClient.get<ResultadoPaginado<Produto>>('/produto', query);
}

export function listCategories(): Promise<Categoria[]> {
  return httpClient.get<Categoria[]>('/produto/categorias');
}

export function getProductById(id: number): Promise<DetalheProduto> {
  return httpClient.get<DetalheProduto>(`/produto/${id}`);
}

export function createProduct(input: ProdutoInput): Promise<Produto> {
  return httpClient.post<Produto>('/produto', input);
}

export function updateProduct(id: number, input: ProdutoInput): Promise<Produto> {
  return httpClient.put<Produto>(`/produto/${id}`, input);
}

export function addProductStockEntry(
  id: number,
  input: EstoqueInput<OrigemEntradaEstoque>,
): Promise<void> {
  return httpClient.post<void>(`/produto/${id}/estoque/entrada`, input);
}

export function addProductStockExit(
  id: number,
  input: EstoqueInput<OrigemSaidaEstoque>,
): Promise<void> {
  return httpClient.post<void>(`/produto/${id}/estoque/saida`, input);
}

export function createCategory(input: CategoriaInput): Promise<Categoria> {
  return httpClient.post<Categoria>('/produto/categorias', input);
}
