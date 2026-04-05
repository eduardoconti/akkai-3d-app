import { httpClient } from '@/shared/lib/api/http-client';
import type {
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
