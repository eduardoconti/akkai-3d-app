import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Carteira,
  Feira,
  FeiraInput,
  InserirVendaInput,
  PesquisaPaginadaFeiras,
  PesquisaPaginadaPrecosProdutosFeira,
  PesquisaPaginadaVendas,
  PrecoProdutoFeira,
  PrecoProdutoFeiraInput,
  ResultadoPaginado,
  ResultadoPaginadoVendas,
  Venda,
} from '@/shared/lib/types/domain';

export function listSales(
  query: PesquisaPaginadaVendas,
): Promise<ResultadoPaginadoVendas> {
  return httpClient.get<ResultadoPaginadoVendas>('/venda', query);
}

export function listFairs(): Promise<Feira[]> {
  return httpClient.get<Feira[]>('/venda/feiras');
}

export function listPagedFairs(
  query: PesquisaPaginadaFeiras,
): Promise<ResultadoPaginado<Feira>> {
  return httpClient.get<ResultadoPaginado<Feira>>(
    '/venda/feiras/paginado',
    query,
  );
}

export function getFairById(id: number): Promise<Feira> {
  return httpClient.get<Feira>(`/venda/feiras/${id}`);
}

export function createFair(input: FeiraInput): Promise<Feira> {
  return httpClient.post<Feira>('/venda/feiras', input);
}

export function updateFair(id: number, input: FeiraInput): Promise<Feira> {
  return httpClient.put<Feira>(`/venda/feiras/${id}`, input);
}

export function deleteFair(id: number): Promise<void> {
  return httpClient.delete<void>(`/venda/feiras/${id}`);
}

export function listFairProductPrices(
  idFeira: number,
): Promise<PrecoProdutoFeira[]> {
  return httpClient.get<PrecoProdutoFeira[]>(
    `/venda/feiras/${idFeira}/precos-produtos`,
  );
}

export function searchFairProductPrices(
  query: PesquisaPaginadaPrecosProdutosFeira,
): Promise<ResultadoPaginado<PrecoProdutoFeira>> {
  return httpClient.get<ResultadoPaginado<PrecoProdutoFeira>>(
    '/venda/precos-produtos-feira/paginado',
    query,
  );
}

export function upsertFairProductPrice(
  idFeira: number,
  input: PrecoProdutoFeiraInput,
): Promise<PrecoProdutoFeira> {
  return httpClient.put<PrecoProdutoFeira>(
    `/venda/feiras/${idFeira}/precos-produtos`,
    input,
  );
}

export function deleteFairProductPrice(
  idFeira: number,
  idProduto: number,
): Promise<void> {
  return httpClient.delete<void>(
    `/venda/feiras/${idFeira}/precos-produtos/${idProduto}`,
  );
}

export function listWallets(): Promise<Carteira[]> {
  return httpClient.get<Carteira[]>('/financeiro/carteiras');
}

export function createSale(input: InserirVendaInput): Promise<Venda> {
  return httpClient.post<Venda>('/venda', input);
}

export function updateSale(
  id: number,
  input: InserirVendaInput,
): Promise<Venda> {
  return httpClient.put<Venda>(`/venda/${id}`, input);
}

export function deleteSale(id: number): Promise<void> {
  return httpClient.delete<void>(`/venda/${id}`);
}
