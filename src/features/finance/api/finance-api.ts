import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Carteira,
  CarteiraInput,
  CategoriaDespesa,
  CategoriaDespesaInput,
  Despesa,
  DespesaInput,
  PesquisaPaginadaDespesas,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

export function listWallets(): Promise<Carteira[]> {
  return httpClient.get<Carteira[]>('/financeiro/carteiras');
}

export function getWalletById(id: number): Promise<Carteira> {
  return httpClient.get<Carteira>(`/financeiro/carteiras/${id}`);
}

export function createWallet(input: CarteiraInput): Promise<Carteira> {
  return httpClient.post<Carteira>('/financeiro/carteiras', input);
}

export function updateWallet(
  id: number,
  input: CarteiraInput,
): Promise<Carteira> {
  return httpClient.put<Carteira>(`/financeiro/carteiras/${id}`, input);
}

export function listExpenseCategories(): Promise<CategoriaDespesa[]> {
  return httpClient.get<CategoriaDespesa[]>('/financeiro/categorias-despesa');
}

export function createExpenseCategory(
  input: CategoriaDespesaInput,
): Promise<CategoriaDespesa> {
  return httpClient.post<CategoriaDespesa>(
    '/financeiro/categorias-despesa',
    input,
  );
}

export function updateExpenseCategory(
  id: number,
  input: CategoriaDespesaInput,
): Promise<CategoriaDespesa> {
  return httpClient.put<CategoriaDespesa>(
    `/financeiro/categorias-despesa/${id}`,
    input,
  );
}

export function listExpenses(
  query: PesquisaPaginadaDespesas,
): Promise<ResultadoPaginado<Despesa>> {
  return httpClient.get<ResultadoPaginado<Despesa>>('/financeiro/despesas', query);
}

export function createExpense(input: DespesaInput): Promise<Despesa> {
  return httpClient.post<Despesa>('/financeiro/despesas', input);
}

export function updateExpense(id: number, input: DespesaInput): Promise<Despesa> {
  return httpClient.put<Despesa>(`/financeiro/despesas/${id}`, input);
}

export function deleteExpense(id: number): Promise<void> {
  return httpClient.delete<void>(`/financeiro/despesas/${id}`);
}
