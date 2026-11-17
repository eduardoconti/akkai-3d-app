import { useEffect, useState } from 'react';
import { listFairProductPrices } from '@/features/sales/api/sales-api';
import {
  getCachedFairProductPrices,
  saveCachedFairProductPrices,
} from '@/shared/lib/offline/indexed-db';
import type { PrecoProdutoFeira } from '@/shared';

/** Reaberturas do modal dentro desse intervalo não consultam a API de novo. */
export const IDADE_MAXIMA_PRECOS_FEIRA_MS = 5 * 60 * 1000;

const precosEmMemoria = new Map<
  number,
  { precos: PrecoProdutoFeira[]; atualizadoEm: number }
>();

/** Apenas para testes: esquece os preços guardados em memória. */
export function limparPrecosFeiraEmMemoria(): void {
  precosEmMemoria.clear();
}

/**
 * Carrega os preços de produtos da feira; '' desativa. Mostra na hora o que já
 * está em memória ou no aparelho e atualiza pela API em segundo plano.
 */
export function useFairProductPrices(fairId: number | '') {
  const [fairProductPrices, setFairProductPrices] = useState<
    PrecoProdutoFeira[]
  >([]);
  const [fairProductPricesErrorMessage, setFairProductPricesErrorMessage] =
    useState<string | null>(null);
  const [isLoadingFairProductPrices, setIsLoadingFairProductPrices] =
    useState(false);
  // Feira cujos preços já terminaram de carregar pela API (com sucesso ou
  // não); quem depende dos preços atualizados espera por ela.
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
      setFairProductPricesErrorMessage(null);
      const emMemoria = precosEmMemoria.get(fairId);
      let possuiDados = Boolean(emMemoria);

      if (emMemoria) {
        setFairProductPrices(emMemoria.precos);

        if (
          Date.now() - emMemoria.atualizadoEm <
          IDADE_MAXIMA_PRECOS_FEIRA_MS
        ) {
          setLoadedFairId(fairId);
          setIsLoadingFairProductPrices(false);
          return;
        }
      } else {
        const cachedPrices = await getCachedFairProductPrices(fairId).catch(
          () => null,
        );

        if (!active) {
          return;
        }

        if (cachedPrices) {
          setFairProductPrices(cachedPrices);
          possuiDados = true;
        } else {
          setFairProductPrices([]);
        }
      }

      setIsLoadingFairProductPrices(!possuiDados);

      try {
        const nextPrices = await listFairProductPrices(fairId);
        precosEmMemoria.set(fairId, {
          precos: nextPrices,
          atualizadoEm: Date.now(),
        });

        if (active) {
          setFairProductPrices(nextPrices);
        }
        void saveCachedFairProductPrices(fairId, nextPrices).catch(
          () => undefined,
        );
      } catch {
        if (active && !possuiDados) {
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
