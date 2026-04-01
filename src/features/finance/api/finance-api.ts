import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Carteira,
  CarteiraInput,
  Despesa,
  DespesaInput,
  PesquisaPaginadaDespesas,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

export function listWallets(): Promise<Carteira[]> {
  return httpClient.get<Carteira[]>('/financeiro/carteiras');
}

export function createWallet(input: CarteiraInput): Promise<Carteira> {
  return httpClient.post<Carteira>('/financeiro/carteiras', input);
}

export function listExpenses(
  query: PesquisaPaginadaDespesas,
): Promise<ResultadoPaginado<Despesa>> {
  return httpClient.get<ResultadoPaginado<Despesa>>('/financeiro/despesas', query);
}

export function createExpense(input: DespesaInput): Promise<Despesa> {
  return httpClient.post<Despesa>('/financeiro/despesas', input);
}
