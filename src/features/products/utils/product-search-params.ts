import type {
  DirecaoOrdenacao,
  OrdenacaoProduto,
} from '@/shared/lib/types/domain';

export interface ProductListParams {
  termo: string;
  ordenarPor: OrdenacaoProduto;
  direcao: DirecaoOrdenacao;
}

const ORDENACOES: OrdenacaoProduto[] = ['nome', 'codigo', 'nivelEstoque'];
const DIRECOES: DirecaoOrdenacao[] = ['asc', 'desc'];

/**
 * Lê `?ordenarPor=nivelEstoque&direcao=asc&termo=...` (links das
 * notificações). Devolve `null` quando a URL não traz uma ordenação válida.
 */
export function parseProductListParams(
  params: URLSearchParams,
): ProductListParams | null {
  const ordenarPor = params.get('ordenarPor') as OrdenacaoProduto | null;

  if (!ordenarPor || !ORDENACOES.includes(ordenarPor)) {
    return null;
  }

  const direcao = params.get('direcao') as DirecaoOrdenacao | null;

  return {
    termo: params.get('termo')?.trim() ?? '',
    ordenarPor,
    direcao: direcao && DIRECOES.includes(direcao) ? direcao : 'asc',
  };
}
