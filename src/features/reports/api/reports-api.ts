import { httpClient } from '@/shared/lib/api/http-client';
import type { TipoVenda } from '@/shared/lib/types/domain';

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

export interface BestSellingProductsFilter {
  dataInicio: string;
  dataFim?: string;
  tipoVenda?: TipoVenda;
  idFeira?: number;
  idsCategorias?: number[];
  pagina?: number;
  tamanhoPagina?: number;
}

export interface BestSellingProductItem {
  idProduto?: number | null;
  nomeProduto: string;
  categoria?: {
    id: number;
    nome: string;
  } | null;
  quantidadeVendida: number;
}

export interface BestSellingProductsResponse {
  dataInicio: string;
  dataFim: string;
  itens: BestSellingProductItem[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
}

export function getSalesSummary(
  filtro: SalesSummaryPeriodFilter,
): Promise<SalesSummary> {
  return httpClient.get<SalesSummary>('/relatorio/vendas/resumo', filtro);
}

export function getBestSellingProducts(
  filtro: BestSellingProductsFilter,
): Promise<BestSellingProductsResponse> {
  return httpClient.get<BestSellingProductsResponse>(
    '/relatorio/vendas/produtos-mais-vendidos',
    filtro,
  );
}
