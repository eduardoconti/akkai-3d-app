import { useEffect } from 'react';
import { getOpenCashRegister } from '@/features/finance/api/finance-api';
import { listAllProducts } from '@/features/products/api/products-api';
import {
  listFairProductPrices,
  listFairs,
  listWallets,
} from '@/features/sales/api/sales-api';
import {
  saveCachedFairProductPrices,
  saveCachedFairs,
  saveCachedOpenCashRegister,
  saveCachedProductCatalog,
  saveCachedWallets,
} from '@/shared/lib/offline/indexed-db';

const WARMUP_MIN_INTERVAL_MS = 10 * 60 * 1000;

let lastWarmupAt = 0;

/**
 * Baixa tudo o que a venda precisa para funcionar sem internet: catálogo,
 * feiras, carteiras e, por feira ativa, o caixa aberto e a tabela de preços.
 * Sem isso, quem abre o app em casa e chega à feira sem sinal não teria dados.
 */
export async function warmUpSaleOfflineData(): Promise<void> {
  const [catalogo, feiras, carteiras] = await Promise.allSettled([
    listAllProducts(),
    listFairs(),
    listWallets(),
  ]);

  if (catalogo.status === 'fulfilled') {
    await saveCachedProductCatalog(catalogo.value).catch(() => undefined);
  }

  if (carteiras.status === 'fulfilled') {
    await saveCachedWallets(carteiras.value).catch(() => undefined);
  }

  if (feiras.status !== 'fulfilled') {
    return;
  }

  await saveCachedFairs(feiras.value).catch(() => undefined);

  for (const feira of feiras.value.filter((current) => current.ativa)) {
    const [caixa, precos] = await Promise.allSettled([
      getOpenCashRegister(feira.id),
      listFairProductPrices(feira.id),
    ]);

    if (caixa.status === 'fulfilled') {
      await saveCachedOpenCashRegister(feira.id, caixa.value).catch(
        () => undefined,
      );
    }

    if (precos.status === 'fulfilled') {
      await saveCachedFairProductPrices(feira.id, precos.value).catch(
        () => undefined,
      );
    }
  }
}

/** Mantém os dados de venda offline atualizados enquanto há conexão. */
export function useSaleOfflineWarmup(isOnline: boolean): void {
  useEffect(() => {
    if (!isOnline || Date.now() - lastWarmupAt < WARMUP_MIN_INTERVAL_MS) {
      return;
    }

    lastWarmupAt = Date.now();
    void warmUpSaleOfflineData();
  }, [isOnline]);
}
