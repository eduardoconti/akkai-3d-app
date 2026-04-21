import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Carteira,
  CarteiraInput,
  CategoriaDespesa,
  CategoriaDespesaInput,
  Despesa,
  DespesaInput,
  PesquisaPaginadaDespesas,
  ResultadoPaginadoDespesas,
  TaxaMeioPagamentoCarteira,
  TaxaMeioPagamentoCarteiraInput,
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

export function deleteWallet(id: number): Promise<void> {
  return httpClient.delete<void>(`/financeiro/carteiras/${id}`);
}

export function listPaymentMethodWalletFees(): Promise<
  TaxaMeioPagamentoCarteira[]
> {
  return httpClient.get<TaxaMeioPagamentoCarteira[]>(
    '/financeiro/taxas-meio-pagamento-carteira',
  );
}

export function getPaymentMethodWalletFeeById(
  id: number,
): Promise<TaxaMeioPagamentoCarteira> {
  return httpClient.get<TaxaMeioPagamentoCarteira>(
    `/financeiro/taxas-meio-pagamento-carteira/${id}`,
  );
}

export function createPaymentMethodWalletFee(
  input: TaxaMeioPagamentoCarteiraInput,
): Promise<TaxaMeioPagamentoCarteira> {
  return httpClient.post<TaxaMeioPagamentoCarteira>(
    '/financeiro/taxas-meio-pagamento-carteira',
    input,
  );
}

export function updatePaymentMethodWalletFee(
  id: number,
  input: TaxaMeioPagamentoCarteiraInput,
): Promise<TaxaMeioPagamentoCarteira> {
  return httpClient.put<TaxaMeioPagamentoCarteira>(
    `/financeiro/taxas-meio-pagamento-carteira/${id}`,
    input,
  );
}

export function deletePaymentMethodWalletFee(id: number): Promise<void> {
  return httpClient.delete<void>(
    `/financeiro/taxas-meio-pagamento-carteira/${id}`,
  );
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

export function deleteExpenseCategory(id: number): Promise<void> {
  return httpClient.delete<void>(`/financeiro/categorias-despesa/${id}`);
}

export function listExpenses(
  query: PesquisaPaginadaDespesas,
): Promise<ResultadoPaginadoDespesas> {
  return httpClient.get<ResultadoPaginadoDespesas>(
    '/financeiro/despesas',
    query,
  );
}

export function createExpense(input: DespesaInput): Promise<Despesa> {
  return httpClient.post<Despesa>('/financeiro/despesas', input);
}

export function updateExpense(
  id: number,
  input: DespesaInput,
): Promise<Despesa> {
  return httpClient.put<Despesa>(`/financeiro/despesas/${id}`, input);
}

export function deleteExpense(id: number): Promise<void> {
  return httpClient.delete<void>(`/financeiro/despesas/${id}`);
}
