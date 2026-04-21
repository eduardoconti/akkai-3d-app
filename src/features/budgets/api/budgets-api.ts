import { httpClient } from '@/shared/lib/api/http-client';
import type {
  AtualizarOrcamentoInput,
  Orcamento,
  OrcamentoInput,
  PesquisaPaginadaOrcamentos,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

export function listBudgets(
  query: PesquisaPaginadaOrcamentos,
): Promise<ResultadoPaginado<Orcamento>> {
  return httpClient.get<ResultadoPaginado<Orcamento>>('/orcamento', query);
}

export function createBudget(input: OrcamentoInput): Promise<Orcamento> {
  return httpClient.post<Orcamento>('/orcamento', input);
}

export function updateBudget(
  id: number,
  input: AtualizarOrcamentoInput,
): Promise<Orcamento> {
  return httpClient.put<Orcamento>(`/orcamento/${id}`, input);
}

export function deleteBudget(id: number): Promise<void> {
  return httpClient.delete<void>(`/orcamento/${id}`);
}
