import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCachedFairProductPrices,
  getCachedFairs,
  getCachedOpenCashRegister,
  getCachedProductCatalog,
  getCachedWallets,
} from '@/shared/lib/offline/indexed-db';

vi.mock('@/features/finance/api/finance-api', () => ({
  getOpenCashRegister: vi.fn(),
}));
vi.mock('@/features/products/api/products-api', () => ({
  listAllProducts: vi.fn(),
}));
vi.mock('@/features/sales/api/sales-api', () => ({
  listFairProductPrices: vi.fn(),
  listFairs: vi.fn(),
  listWallets: vi.fn(),
}));

const { getOpenCashRegister } =
  await import('@/features/finance/api/finance-api');
const { listAllProducts } =
  await import('@/features/products/api/products-api');
const { listFairProductPrices, listFairs, listWallets } =
  await import('@/features/sales/api/sales-api');
const { warmUpSaleOfflineData } = await import('./use-sale-offline-warmup');

const caixa = { id: 9, idFeira: 1, status: 'ABERTO', conferencias: [] };

beforeEach(() => {
  vi.mocked(listAllProducts).mockResolvedValue([{ id: 1 }] as never);
  vi.mocked(listWallets).mockResolvedValue([{ id: 3 }] as never);
  vi.mocked(listFairs).mockResolvedValue([
    { id: 1, ativa: true },
    { id: 2, ativa: false },
  ] as never);
  vi.mocked(getOpenCashRegister).mockResolvedValue(caixa as never);
  vi.mocked(listFairProductPrices).mockResolvedValue([{ id: 5 }] as never);
});

describe('warmUpSaleOfflineData', () => {
  it('guarda catálogo, carteiras, feiras e, por feira ativa, caixa e preços', async () => {
    await warmUpSaleOfflineData();

    expect(await getCachedProductCatalog()).toEqual([{ id: 1 }]);
    expect(await getCachedWallets()).toEqual([{ id: 3 }]);
    expect(await getCachedFairs()).toHaveLength(2);
    expect(await getCachedOpenCashRegister(1)).toEqual(caixa);
    expect(await getCachedFairProductPrices(1)).toEqual([{ id: 5 }]);
    expect(getOpenCashRegister).toHaveBeenCalledTimes(1);
    expect(getOpenCashRegister).not.toHaveBeenCalledWith(2);
  });

  it('limpa o caixa guardado quando a feira não tem mais caixa aberto', async () => {
    await warmUpSaleOfflineData();
    vi.mocked(getOpenCashRegister).mockResolvedValue(null as never);

    await warmUpSaleOfflineData();

    expect(await getCachedOpenCashRegister(1)).toBeNull();
  });

  it('continua guardando o restante quando uma chamada falha', async () => {
    vi.mocked(listAllProducts).mockRejectedValue(new Error('sem permissão'));
    vi.mocked(getOpenCashRegister).mockRejectedValue(new Error('falhou'));

    await expect(warmUpSaleOfflineData()).resolves.toBeUndefined();

    expect(await getCachedWallets()).toEqual([{ id: 3 }]);
    expect(await getCachedFairProductPrices(1)).toEqual([{ id: 5 }]);
  });
});
