import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveCachedFairProductPrices } from '@/shared/lib/offline/indexed-db';

vi.mock('@/features/sales/api/sales-api', () => ({
  listFairProductPrices: vi.fn(),
}));

const { listFairProductPrices } =
  await import('@/features/sales/api/sales-api');
const { limparPrecosFeiraEmMemoria, useFairProductPrices } =
  await import('./use-fair-product-prices');

const listFairProductPricesMock = vi.mocked(listFairProductPrices);

beforeEach(() => {
  limparPrecosFeiraEmMemoria();
  listFairProductPricesMock.mockReset();
});

describe('useFairProductPrices', () => {
  it('usa os preços do aparelho sem bloquear e marca a feira ao fim da API', async () => {
    await saveCachedFairProductPrices(10, [{ id: 1 }] as never);
    listFairProductPricesMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useFairProductPrices(10));

    await waitFor(() => expect(result.current.loadedFairId).toBe(10));
    expect(result.current.fairProductPrices).toEqual([{ id: 1 }]);
    expect(result.current.isLoadingFairProductPrices).toBe(false);
    expect(result.current.fairProductPricesErrorMessage).toBeNull();
  });

  it('reaproveita os preços recentes ao reabrir o modal', async () => {
    listFairProductPricesMock.mockResolvedValue([{ id: 2 }] as never);
    const primeiro = renderHook(() => useFairProductPrices(11));
    await waitFor(() => expect(primeiro.result.current.loadedFairId).toBe(11));
    primeiro.unmount();

    const segundo = renderHook(() => useFairProductPrices(11));

    await waitFor(() => expect(segundo.result.current.loadedFairId).toBe(11));
    expect(segundo.result.current.fairProductPrices).toEqual([{ id: 2 }]);
    expect(listFairProductPricesMock).toHaveBeenCalledTimes(1);
  });

  it('informa o erro quando não há preços guardados nem API', async () => {
    listFairProductPricesMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useFairProductPrices(12));

    await waitFor(() =>
      expect(result.current.fairProductPricesErrorMessage).not.toBeNull(),
    );
    expect(result.current.fairProductPrices).toEqual([]);
  });

  it('fica desativado sem feira', () => {
    const { result } = renderHook(() => useFairProductPrices(''));

    expect(result.current.isLoadingFairProductPrices).toBe(false);
    expect(listFairProductPricesMock).not.toHaveBeenCalled();
  });
});
