import { httpClient } from '@/shared/lib/api/http-client';
import type { Feira, InserirVendaInput, Venda } from '@/shared/lib/types/domain';

export function listSales(): Promise<Venda[]> {
  return httpClient.get<Venda[]>('/venda');
}

export function listFairs(): Promise<Feira[]> {
  return httpClient.get<Feira[]>('/venda/feiras');
}

export function createSale(input: InserirVendaInput): Promise<Venda> {
  return httpClient.post<Venda>('/venda', input);
}
