import { useEffect, useState } from 'react';
import { listAllProducts } from '@/features/products/api/products-api';
import {
  getCachedProductCatalog,
  saveCachedProductCatalog,
} from '@/shared/lib/offline/indexed-db';
import type { Produto } from '@/shared';

/** Reaberturas do modal dentro desse intervalo não consultam a API de novo. */
export const IDADE_MAXIMA_CATALOGO_MS = 5 * 60 * 1000;

const CATALOG_ERROR_MESSAGE =
  'Nao foi possivel carregar o catalogo de produtos.';

let catalogoEmMemoria: { produtos: Produto[]; atualizadoEm: number } | null =
  null;

/**
 * Força a próxima abertura a revalidar o catálogo (ex.: estoque mudou após uma
 * venda), sem deixar de mostrar o que já está em memória.
 */
export function invalidarCatalogoVenda(): void {
  if (catalogoEmMemoria) {
    catalogoEmMemoria = { ...catalogoEmMemoria, atualizadoEm: 0 };
  }
}

/** Apenas para testes: esquece o catálogo guardado em memória. */
export function limparCatalogoVendaEmMemoria(): void {
  catalogoEmMemoria = null;
}

/**
 * Catálogo do modal de venda. Mostra na hora o que já está em memória ou no
 * aparelho e atualiza pela API em segundo plano; só fica "carregando" quando
 * não há nada para mostrar (primeiro acesso no aparelho).
 */
export function useSaleCatalog(open: boolean) {
  const [catalogProducts, setCatalogProducts] = useState<Produto[]>(
    () => catalogoEmMemoria?.produtos ?? [],
  );
  const [isLoadingCatalogProducts, setIsLoadingCatalogProducts] =
    useState(false);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    const loadCatalog = async () => {
      setCatalogErrorMessage(null);
      const emMemoria = catalogoEmMemoria;
      let possuiDados = Boolean(emMemoria?.produtos.length);

      if (emMemoria) {
        setCatalogProducts(emMemoria.produtos);

        if (Date.now() - emMemoria.atualizadoEm < IDADE_MAXIMA_CATALOGO_MS) {
          return;
        }
      }

      if (!possuiDados) {
        const cachedProducts = await getCachedProductCatalog().catch(
          () => null,
        );

        if (cachedProducts?.length && active) {
          setCatalogProducts(cachedProducts);
          possuiDados = true;
        }
      }

      if (!possuiDados && active) {
        setIsLoadingCatalogProducts(true);
      }

      try {
        const produtos = await listAllProducts();
        catalogoEmMemoria = { produtos, atualizadoEm: Date.now() };

        if (active) {
          setCatalogProducts(produtos);
        }
        void saveCachedProductCatalog(produtos).catch(() => undefined);
      } catch {
        if (active && !possuiDados) {
          setCatalogErrorMessage(CATALOG_ERROR_MESSAGE);
        }
      } finally {
        if (active) {
          setIsLoadingCatalogProducts(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [open]);

  return { catalogProducts, catalogErrorMessage, isLoadingCatalogProducts };
}
