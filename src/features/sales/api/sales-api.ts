import { httpClient } from '@/shared/lib/api/http-client';
import type {
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

export function createSale(input: InserirVendaInput): Promise<Venda> {
  return httpClient.post<Venda>('/venda', input);
}
