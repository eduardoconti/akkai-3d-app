import { httpClient } from '@/shared/lib/api/http-client';
import type {
  AjusteCarteira,
  AjusteCarteiraInput,
  Carteira,
  CarteiraInput,
  CategoriaDespesa,
  CategoriaDespesaInput,
  Despesa,
  DespesaInput,
  PesquisaPaginadaDespesas,
  PesquisaPaginadaTransferenciasCarteira,
  ResultadoPaginadoDespesas,
  ResultadoPaginadoTransferenciasCarteira,
  TaxaMeioPagamentoCarteira,
  TaxaMeioPagamentoCarteiraInput,
  TransferenciaCarteira,
  TransferenciaCarteiraInput,
  Caixa,
  PesquisaPaginadaCaixas,
  ResultadoPaginadoCaixas,
} from '@/shared/lib/types/domain';

export function listCashRegisters(
  query: PesquisaPaginadaCaixas,
): Promise<ResultadoPaginadoCaixas> {
  return httpClient.get<ResultadoPaginadoCaixas>('/financeiro/caixas', query);
}

export function getCashRegisterById(id: number): Promise<Caixa> {
  return httpClient.get<Caixa>(`/financeiro/caixas/${id}`);
}

export function getOpenCashRegister(idFeira: number): Promise<Caixa | null> {
  return httpClient.get<Caixa | null>('/financeiro/caixas/aberto', { idFeira });
}

export function openCashRegister(input: {
  idFeira: number;
  carteiras: Array<{ idCarteira: number; valorAbertura: number }>;
  observacao?: string;
}): Promise<Caixa> {
  return httpClient.post<Caixa>('/financeiro/caixas/abrir', input);
}

export function updateCashRegister(
  id: number,
  input: {
    idFeira: number;
    carteiras: Array<{ idCarteira: number; valorAbertura: number }>;
    observacao?: string;
  },
): Promise<Caixa> {
  return httpClient.put<Caixa>(`/financeiro/caixas/${id}`, input);
}

export function closeCashRegister(
  id: number,
  input: {
    carteiras: Array<{ idCarteira: number; valorInformadoFechamento: number }>;
  },
): Promise<Caixa> {
  return httpClient.post<Caixa>(`/financeiro/caixas/${id}/fechar`, input);
}

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

export function listWalletAdjustments(
  idCarteira: number,
): Promise<AjusteCarteira[]> {
  return httpClient.get<AjusteCarteira[]>(
    `/financeiro/carteiras/${idCarteira}/ajustes`,
  );
}

export function createWalletAdjustment(
  idCarteira: number,
  input: AjusteCarteiraInput,
): Promise<AjusteCarteira> {
  return httpClient.post<AjusteCarteira>(
    `/financeiro/carteiras/${idCarteira}/ajustes`,
    input,
  );
}

export function createWalletTransfer(
  input: TransferenciaCarteiraInput,
): Promise<TransferenciaCarteira> {
  return httpClient.post<TransferenciaCarteira>(
    '/financeiro/transferencias-carteira',
    input,
  );
}

export function updateWalletTransfer(
  id: number,
  input: TransferenciaCarteiraInput,
): Promise<TransferenciaCarteira> {
  return httpClient.put<TransferenciaCarteira>(
    `/financeiro/transferencias-carteira/${id}`,
    input,
  );
}

export function deleteWalletTransfer(id: number): Promise<void> {
  return httpClient.delete<void>(`/financeiro/transferencias-carteira/${id}`);
}

export function listWalletTransfers(
  query: PesquisaPaginadaTransferenciasCarteira,
): Promise<ResultadoPaginadoTransferenciasCarteira> {
  return httpClient.get<ResultadoPaginadoTransferenciasCarteira>(
    '/financeiro/transferencias-carteira',
    query,
  );
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
