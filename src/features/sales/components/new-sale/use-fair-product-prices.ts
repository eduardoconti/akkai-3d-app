import { useEffect, useState } from 'react';
import { listFairProductPrices } from '@/features/sales/api/sales-api';
import {
  getCachedFairProductPrices,
  saveCachedFairProductPrices,
} from '@/shared/lib/offline/indexed-db';
import type { PrecoProdutoFeira } from '@/shared';

/** Carrega os preços de produtos da feira (com cache offline); '' desativa. */
export function useFairProductPrices(fairId: number | '') {
  const [fairProductPrices, setFairProductPrices] = useState<
    PrecoProdutoFeira[]
  >([]);
  const [fairProductPricesErrorMessage, setFairProductPricesErrorMessage] =
    useState<string | null>(null);
  const [isLoadingFairProductPrices, setIsLoadingFairProductPrices] =
    useState(false);
  // Feira cujos preços já terminaram de carregar (com sucesso ou não); quem
  // depende dos preços espera por ela em vez de ler uma lista ainda vazia.
  const [loadedFairId, setLoadedFairId] = useState<number | ''>('');

  useEffect(() => {
    if (fairId === '') {
      setLoadedFairId('');
      setFairProductPrices([]);
      setFairProductPricesErrorMessage(null);
      setIsLoadingFairProductPrices(false);
      return;
    }

    let active = true;

    const loadFairProductPrices = async () => {
      setIsLoadingFairProductPrices(true);
      setFairProductPricesErrorMessage(null);

      try {
        const nextPrices = await listFairProductPrices(fairId);

        if (active) {
          setFairProductPrices(nextPrices);
        }
        void saveCachedFairProductPrices(fairId, nextPrices).catch(
          () => undefined,
        );
      } catch {
        const cachedPrices = await getCachedFairProductPrices(fairId);

        if (cachedPrices) {
          if (active) {
            setFairProductPrices(cachedPrices);
            setFairProductPricesErrorMessage(null);
          }
          return;
        }

        if (active) {
          setFairProductPrices([]);
          setFairProductPricesErrorMessage(
            'Não foi possível carregar os preços da feira.',
          );
        }
      } finally {
        if (active) {
          setLoadedFairId(fairId);
          setIsLoadingFairProductPrices(false);
        }
      }
    };

    void loadFairProductPrices();

    return () => {
      active = false;
    };
  }, [fairId]);

  return {
    fairProductPrices,
    fairProductPricesErrorMessage,
    isLoadingFairProductPrices,
    loadedFairId,
  };
}
