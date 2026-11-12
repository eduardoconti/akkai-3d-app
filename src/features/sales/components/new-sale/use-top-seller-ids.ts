import { useEffect, useState } from 'react';
import { getBestSellingProducts } from '@/features/reports/api/reports-api';
import { formatLocalDate } from '@/shared';

/** Ids dos produtos mais vendidos nos últimos 90 dias (atalhos opcionais). */
export function useTopSellerIds(enabled: boolean) {
  const [topSellerIds, setTopSellerIds] = useState<number[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - 90);

    getBestSellingProducts({
      dataInicio: formatLocalDate(since),
      // A API só aceita 25, 50 ou 100 por página; exibimos apenas os 8 primeiros.
      tamanhoPagina: 25,
      pagina: 1,
    })
      .then((response) => {
        if (!cancelled) {
          setTopSellerIds(
            response.itens
              .map((item) => item.idProduto)
              .filter((id): id is number => typeof id === 'number')
              .slice(0, 8),
          );
        }
      })
      .catch(() => {
        // Atalho opcional: sem a lista, a venda segue pelo campo de produto.
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return topSellerIds;
}
