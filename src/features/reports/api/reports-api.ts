import { httpClient } from '@/shared/lib/api/http-client';
import type { TipoVenda } from '@/shared/lib/types/domain';

export interface SalesSummaryPeriodFilter {
  dataInicio: string;
  dataFim?: string;
  tipoVenda?: TipoVenda;
  idFeira?: number;
}

export interface DashboardMonthlySummaryItem {
  mes: number;
  valorVendas: number;
  valorDespesas: number;
  saldo: number;
}

export interface DashboardMonthlySummaryResponse {
  ano: number;
  totalVendas: number;
  totalDespesas: number;
  saldo: number;
  itens: DashboardMonthlySummaryItem[];
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
  codigo?: string | null;
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

export interface StockValueReportFilter {
  pagina?: number;
  tamanhoPagina?: number;
  ordenarPor?: 'codigo' | 'nome' | 'quantidade' | 'valor' | 'valorTotal';
  direcao?: 'asc' | 'desc';
}

export interface StockValueProductItem {
  codigo: string;
  nome: string;
  quantidade: number;
  valor: number;
  valorTotal: number;
}

export interface StockValueReportResponse {
  itens: StockValueProductItem[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
  totalQuantidade: number;
  totalValor: number;
  totalValorTotal: number;
}

export function getSalesSummary(
  filtro: SalesSummaryPeriodFilter,
): Promise<SalesSummary> {
  return httpClient.get<SalesSummary>('/relatorio/vendas/resumo', filtro);
}

export function getDashboardMonthlySummary(
  filtro?: { ano?: number },
): Promise<DashboardMonthlySummaryResponse> {
  return httpClient.get<DashboardMonthlySummaryResponse>(
    '/relatorio/dashboard/resumo-mensal',
    filtro,
  );
}

export function getBestSellingProducts(
  filtro: BestSellingProductsFilter,
): Promise<BestSellingProductsResponse> {
  return httpClient.get<BestSellingProductsResponse>(
    '/relatorio/vendas/produtos-mais-vendidos',
    filtro,
  );
}

export function getStockValueReport(
  filtro: StockValueReportFilter,
): Promise<StockValueReportResponse> {
  return httpClient.get<StockValueReportResponse>(
    '/relatorio/estoque/valor-produtos',
    filtro,
  );
}
