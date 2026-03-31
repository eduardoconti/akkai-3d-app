import { httpClient } from '@/shared/lib/api/http-client';

export interface SalesSummaryPeriodFilter {
  dataInicio: string;
  dataFim?: string;
}

export interface SalesSummary {
  dataInicio: string;
  dataFim: string;
  quantidadeItens: number;
  descontoTotal: number;
  valorTotal: number;
}

export function getSalesSummary(
  filtro: SalesSummaryPeriodFilter,
): Promise<SalesSummary> {
  return httpClient.get<SalesSummary>('/relatorio/vendas/resumo', filtro);
}
