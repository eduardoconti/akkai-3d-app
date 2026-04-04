import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Carteira,
  Feira,
  InserirVendaInput,
  PesquisaPaginadaVendas,
  ResultadoPaginado,
  Venda,
} from '@/shared/lib/types/domain';

export function listSales(
  query: PesquisaPaginadaVendas,
): Promise<ResultadoPaginado<Venda>> {
  return httpClient.get<ResultadoPaginado<Venda>>('/venda', query);
}

export function listFairs(): Promise<Feira[]> {
  return httpClient.get<Feira[]>('/venda/feiras');
}

export function listWallets(): Promise<Carteira[]> {
  return httpClient.get<Carteira[]>('/financeiro/carteiras');
}

export function createSale(input: InserirVendaInput): Promise<Venda> {
  return httpClient.post<Venda>('/venda', input);
}

export function updateSale(id: number, input: InserirVendaInput): Promise<Venda> {
  return httpClient.put<Venda>(`/venda/${id}`, input);
}

export function deleteSale(id: number): Promise<void> {
  return httpClient.delete<void>(`/venda/${id}`);
}
