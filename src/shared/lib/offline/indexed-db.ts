import type {
  Carteira,
  Categoria,
  InserirVendaInput,
  ResultadoPaginado,
  Produto,
  Venda,
} from '@/shared/lib/types/domain';
import type { Feira } from '@/shared';

const DATABASE_NAME = 'akkai-3d-offline';
const DATABASE_VERSION = 1;
const CACHE_STORE = 'cache';
const PENDING_SALES_STORE = 'pending-sales';

type CacheKey =
  | 'products'
  | 'products-catalog'
  | 'categories'
  | 'fairs'
  | 'wallets'
  | 'sales';

interface CacheRecord<TValue> {
  key: CacheKey;
  updatedAt: string;
  value: TValue;
}

export interface PendingSaleRecord {
  id: string;
  createdAt: string;
  payload: InserirVendaInput;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }

      if (!database.objectStoreNames.contains(PENDING_SALES_STORE)) {
        database.createObjectStore(PENDING_SALES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCachedValue<TValue>(
  key: CacheKey,
  value: TValue,
): Promise<void> {
  await withStore(CACHE_STORE, 'readwrite', (store) =>
    store.put({
      key,
      updatedAt: new Date().toISOString(),
      value,
    } satisfies CacheRecord<TValue>),
  );
}

export async function getCachedValue<TValue>(
  key: CacheKey,
): Promise<TValue | null> {
  const record = await withStore<CacheRecord<TValue> | undefined>(
    CACHE_STORE,
    'readonly',
    (store) => store.get(key),
  );

  return record?.value ?? null;
}

export async function saveCachedProducts(
  response: ResultadoPaginado<Produto>,
): Promise<void> {
  await saveCachedValue('products', response);
}

export async function getCachedProducts(): Promise<ResultadoPaginado<Produto> | null> {
  return getCachedValue<ResultadoPaginado<Produto>>('products');
}

export async function saveCachedProductCatalog(
  produtos: Produto[],
): Promise<void> {
  await saveCachedValue('products-catalog', produtos);
}

export async function getCachedProductCatalog(): Promise<Produto[] | null> {
  return getCachedValue<Produto[]>('products-catalog');
}

export async function saveCachedCategories(
  categorias: Categoria[],
): Promise<void> {
  await saveCachedValue('categories', categorias);
}

export async function getCachedCategories(): Promise<Categoria[] | null> {
  return getCachedValue<Categoria[]>('categories');
}

export async function saveCachedFairs(feiras: Feira[]): Promise<void> {
  await saveCachedValue('fairs', feiras);
}

export async function getCachedFairs(): Promise<Feira[] | null> {
  return getCachedValue<Feira[]>('fairs');
}

export async function saveCachedWallets(carteiras: Carteira[]): Promise<void> {
  await saveCachedValue('wallets', carteiras);
}

export async function getCachedWallets(): Promise<Carteira[] | null> {
  return getCachedValue<Carteira[]>('wallets');
}

export async function saveCachedSales(
  response: ResultadoPaginado<Venda>,
): Promise<void> {
  await saveCachedValue('sales', response);
}

export async function getCachedSales(): Promise<ResultadoPaginado<Venda> | null> {
  return getCachedValue<ResultadoPaginado<Venda>>('sales');
}

export async function addPendingSale(record: PendingSaleRecord): Promise<void> {
  await withStore(PENDING_SALES_STORE, 'readwrite', (store) =>
    store.put(record),
  );
}

export async function listPendingSales(): Promise<PendingSaleRecord[]> {
  const records = await withStore<PendingSaleRecord[]>(
    PENDING_SALES_STORE,
    'readonly',
    (store) => store.getAll(),
  );

  return records.sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export async function removePendingSale(id: string): Promise<void> {
  await withStore(PENDING_SALES_STORE, 'readwrite', (store) =>
    store.delete(id),
  );
}
