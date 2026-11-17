import {
  emptySaleItem,
  initialSaleFormState,
  type DiscountMode,
  type SaleFormItem,
  type SaleFormPayment,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import {
  formatLocalDate,
  type PrecoProdutoFeira,
  type TipoVenda,
  type Venda,
} from '@/shared';

export function getCatalogProductValue(
  item: SaleFormItem,
  produtos: Array<{ id: number; valor: number }>,
  fairProductPrices: PrecoProdutoFeira[],
) {
  const fairProductPrice = fairProductPrices.find(
    (current) => current.idProduto === item.idProduto,
  );
  if (fairProductPrice) {
    return fairProductPrice.valor;
  }

  const product = produtos.find((current) => current.id === item.idProduto);
  return product?.valor ?? Math.round(item.valorUnitario * 100);
}

export function calculateSaleDiscount(
  subtotal: number,
  discountValue: number,
  discountMode: DiscountMode,
) {
  if (discountMode === 'PERCENTUAL') {
    const normalizedDiscount = Math.min(Math.max(discountValue, 0), 99);
    return Math.round((subtotal * normalizedDiscount) / 100);
  }

  return Math.round(Math.min(Math.max(discountValue, 0), 999.99) * 100);
}

export const saleTypeLabels: Record<TipoVenda, string> = {
  FEIRA: 'Feira',
  LOJA: 'Loja',
  ONLINE: 'Online',
  CONSIGNACAO: 'Consignação',
};

export type PersistedSaleConfig = Pick<SaleFormState, 'tipo' | 'idFeira'>;

export function getResetFormState(config: PersistedSaleConfig): SaleFormState {
  return {
    ...initialSaleFormState,
    dataVenda: formatLocalDate(),
    tipo: config.tipo,
    idFeira: config.tipo === 'FEIRA' ? config.idFeira : '',
  };
}

export function cloneSaleFormState(form: SaleFormState): SaleFormState {
  return {
    ...form,
    itens: form.itens.map((item) => ({ ...item })),
    pagamentos: form.pagamentos.map((pagamento) => ({ ...pagamento })),
  };
}

export function mapSaleToForm(sale: Venda): SaleFormState {
  const pagamentos: SaleFormPayment[] = sale.pagamentos.map((pagamento) => ({
    idCarteira: pagamento.idCarteira,
    meioPagamento: pagamento.meioPagamento,
    valor: pagamento.valor / 100,
  }));

  return {
    dataVenda: getSaleLocalDate(sale.dataVenda ?? sale.dataInclusao),
    tipo: sale.tipo,
    idFeira: sale.idFeira ?? '',
    idOrcamento: sale.idOrcamento,
    desconto: sale.desconto / 100,
    descontoModo: 'VALOR',
    pagamentos,
    itens: sale.itens.map((item) => ({
      tipoItem: item.idProduto ? 'CATALOGO' : 'AVULSO',
      idProduto: item.idProduto ?? null,
      nomeProduto: item.nomeProduto,
      valorUnitario: item.valorUnitario / 100,
      quantidade: item.quantidade,
      brinde: item.brinde,
    })),
  };
}

/**
 * Converte o instante da venda para a data local (como a lista exibe).
 * Ler apenas o prefixo do ISO usaria a data em UTC e adiantaria um dia nas
 * vendas feitas à noite.
 */
export function getSaleLocalDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? formatLocalDate(value)
    : formatLocalDate(new Date(value));
}

export function getSaleDateForApi(
  formDate: string,
  sale?: Venda | null,
): string {
  if (sale && formDate === getSaleLocalDate(sale.dataVenda)) {
    return sale.dataVenda;
  }

  return sale
    ? formatLocalDate(formDate, 'api-date-time')
    : formatLocalDate(formDate, 'api-current-date-time');
}

export function calculateSaleTotals(
  form: SaleFormState,
  produtos: Array<{ id: number; valor: number }>,
  fairProductPrices: PrecoProdutoFeira[],
) {
  let subtotal = 0;
  let totalQuantidadeItens = 0;
  form.itens.forEach((item) => {
    const unitValue = item.brinde
      ? 0
      : item.tipoItem === 'CATALOGO'
        ? getCatalogProductValue(item, produtos, fairProductPrices)
        : Math.round(item.valorUnitario * 100);

    subtotal += unitValue * item.quantidade;
    totalQuantidadeItens += item.quantidade;
  });

  const saleDiscount = calculateSaleDiscount(
    subtotal,
    form.desconto ?? 0,
    form.descontoModo,
  );

  return {
    subtotal,
    saleDiscount,
    total: Math.max(0, subtotal - saleDiscount),
    totalQuantidadeItens,
  };
}

/**
 * Coloca 1 unidade do produto na primeira linha de catálogo ainda vazia ou, se
 * não houver, em uma linha nova. Não soma em linha existente do mesmo produto:
 * cada linha pode virar brinde separadamente (ex.: 5× A + 1× A brinde).
 */
export function addCatalogProductToItems(
  itens: SaleFormItem[],
  product: { id: number; nome: string; valor: number },
): SaleFormItem[] {
  const filled: SaleFormItem = {
    ...emptySaleItem,
    idProduto: product.id,
    nomeProduto: product.nome,
    valorUnitario: product.valor / 100,
  };
  const emptyIndex = itens.findIndex(
    (item) => item.tipoItem === 'CATALOGO' && item.idProduto === null,
  );

  if (emptyIndex < 0) {
    return [...itens, filled];
  }

  return itens.map((item, index) =>
    index === emptyIndex
      ? {
          ...item,
          idProduto: filled.idProduto,
          nomeProduto: filled.nomeProduto,
          valorUnitario: filled.valorUnitario,
        }
      : item,
  );
}

/**
 * Junta as linhas de catálogo com o mesmo produto e a mesma marcação de brinde,
 * somando as quantidades (a API aceita um item por produto/brinde na venda).
 * Assim "5× A" + "1× A brinde" seguem como dois itens, e "2× A" + "3× A" como
 * um item de 5. Itens avulsos não são agrupados. A ordem da primeira
 * ocorrência é mantida.
 */
export function mergeRepeatedCatalogItems(
  itens: SaleFormItem[],
): SaleFormItem[] {
  const merged: SaleFormItem[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of itens) {
    if (item.tipoItem !== 'CATALOGO' || item.idProduto === null) {
      merged.push(item);
      continue;
    }

    const key = `${item.idProduto}:${item.brinde}`;
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(item);
      continue;
    }

    const existing = merged[existingIndex]!;
    merged[existingIndex] = {
      ...existing,
      quantidade: existing.quantidade + item.quantidade,
    };
  }

  return merged;
}

export function buildSalePayload({
  caixaId,
  catalogProducts,
  fairProductPrices,
  form,
  sale,
  totals,
}: {
  caixaId?: number;
  catalogProducts: Array<{ id: number; valor: number }>;
  fairProductPrices: PrecoProdutoFeira[];
  form: SaleFormState;
  sale: Venda | null;
  totals: { saleDiscount: number; total: number };
}) {
  return {
    dataVenda: getSaleDateForApi(form.dataVenda, sale),
    tipo: form.tipo,
    idFeira: form.idFeira === '' ? undefined : form.idFeira,
    idCaixa: form.tipo === 'FEIRA' ? caixaId : undefined,
    idOrcamento: form.idOrcamento,
    desconto: totals.saleDiscount,
    pagamentos: form.pagamentos.map((pagamento) => ({
      idCarteira: pagamento.idCarteira === '' ? 0 : pagamento.idCarteira,
      meioPagamento: pagamento.meioPagamento,
      valor:
        form.pagamentos.length === 1
          ? totals.total
          : Math.round(pagamento.valor * 100),
    })),
    itens: mergeRepeatedCatalogItems(form.itens).map((item) => {
      if (item.tipoItem === 'CATALOGO') {
        return {
          idProduto: item.idProduto ?? undefined,
          quantidade: item.quantidade,
          brinde: item.brinde,
          valorUnitario: getCatalogProductValue(
            item,
            catalogProducts,
            fairProductPrices,
          ),
        };
      }

      return {
        nomeProduto: item.nomeProduto.trim(),
        valorUnitario: Math.round(item.valorUnitario * 100),
        quantidade: item.quantidade,
        brinde: item.brinde,
      };
    }),
  };
}
