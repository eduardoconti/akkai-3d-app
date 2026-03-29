import { httpClient } from '@/shared/lib/api/http-client';
import type { Categoria, Produto, ProdutoInput } from '@/shared/lib/types/domain';

export function listProducts(): Promise<Produto[]> {
  return httpClient.get<Produto[]>('/produto');
}

export function listCategories(): Promise<Categoria[]> {
  return httpClient.get<Categoria[]>('/produto/categorias');
}

export function createProduct(input: ProdutoInput): Promise<Produto> {
  return httpClient.post<Produto>('/produto', input);
}
