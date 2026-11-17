import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCachedProductCatalog,
  saveCachedProductCatalog,
} from '@/shared/lib/offline/indexed-db';

vi.mock('@/features/products/api/products-api', () => ({
  listAllProducts: vi.fn(),
}));

const { listAllProducts } =
  await import('@/features/products/api/products-api');
const { invalidarCatalogoVenda, limparCatalogoVendaEmMemoria, useSaleCatalog } =
  await import('./use-sale-catalog');

const listAllProductsMock = vi.mocked(listAllProducts);

beforeEach(async () => {
  limparCatalogoVendaEmMemoria();
  listAllProductsMock.mockReset();
  await saveCachedProductCatalog([]);
});

describe('useSaleCatalog', () => {
  it('mostra o catálogo do aparelho sem bloquear enquanto a API responde', async () => {
    await saveCachedProductCatalog([{ id: 1, nome: 'Cache' }] as never);
    let responder: (value: never) => void = () => undefined;
    listAllProductsMock.mockReturnValue(
      new Promise((resolve) => {
        responder = resolve;
      }),
    );

    const { result } = renderHook(() => useSaleCatalog(true));

    await waitFor(() =>
      expect(result.current.catalogProducts).toEqual([
        { id: 1, nome: 'Cache' },
      ]),
    );
    expect(result.current.isLoadingCatalogProducts).toBe(false);

    responder([{ id: 2, nome: 'API' }] as never);
    await waitFor(() =>
      expect(result.current.catalogProducts).toEqual([{ id: 2, nome: 'API' }]),
    );
    expect(await getCachedProductCatalog()).toEqual([{ id: 2, nome: 'API' }]);
  });

  it('só carrega com bloqueio quando não há nada guardado', async () => {
    listAllProductsMock.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useSaleCatalog(true));

    await waitFor(() =>
      expect(result.current.isLoadingCatalogProducts).toBe(true),
    );
  });

  it('reaproveita o catálogo recente ao reabrir o modal', async () => {
    listAllProductsMock.mockResolvedValue([{ id: 1 }] as never);
    const primeiro = renderHook(() => useSaleCatalog(true));
    await waitFor(() =>
      expect(primeiro.result.current.catalogProducts).toHaveLength(1),
    );
    primeiro.unmount();

    const segundo = renderHook(() => useSaleCatalog(true));

    expect(segundo.result.current.catalogProducts).toEqual([{ id: 1 }]);
    expect(listAllProductsMock).toHaveBeenCalledTimes(1);
  });

  it('revalida em segundo plano depois de uma venda', async () => {
    listAllProductsMock.mockResolvedValue([{ id: 1 }] as never);
    const primeiro = renderHook(() => useSaleCatalog(true));
    await waitFor(() =>
      expect(primeiro.result.current.catalogProducts).toHaveLength(1),
    );
    primeiro.unmount();
    invalidarCatalogoVenda();

    renderHook(() => useSaleCatalog(true));

    await waitFor(() => expect(listAllProductsMock).toHaveBeenCalledTimes(2));
  });

  it('informa o erro apenas quando não há catálogo para mostrar', async () => {
    listAllProductsMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useSaleCatalog(true));

    await waitFor(() =>
      expect(result.current.catalogErrorMessage).not.toBeNull(),
    );
    expect(result.current.isLoadingCatalogProducts).toBe(false);
  });

  it('não carrega nada com o modal fechado', () => {
    renderHook(() => useSaleCatalog(false));

    expect(listAllProductsMock).not.toHaveBeenCalled();
  });
});
