import { describe, expect, it } from 'vitest';
import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormItem,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import {
  buildSalePayload,
  mergeRepeatedCatalogItems,
} from './sale-form-helpers';

const catalogo = (
  idProduto: number,
  quantidade: number,
  brinde = false,
): SaleFormItem => ({
  ...emptySaleItem,
  idProduto,
  nomeProduto: `Produto ${idProduto}`,
  valorUnitario: 10,
  quantidade,
  brinde,
});

const avulso = (nomeProduto: string, quantidade: number): SaleFormItem => ({
  ...emptySaleItem,
  tipoItem: 'AVULSO',
  nomeProduto,
  valorUnitario: 5,
  quantidade,
});

describe('mergeRepeatedCatalogItems', () => {
  it('mantém separados o item pago e o brinde do mesmo produto', () => {
    const result = mergeRepeatedCatalogItems([
      catalogo(1, 5),
      catalogo(1, 1, true),
    ]);

    expect(
      result.map(({ idProduto, quantidade, brinde }) => ({
        idProduto,
        quantidade,
        brinde,
      })),
    ).toEqual([
      { idProduto: 1, quantidade: 5, brinde: false },
      { idProduto: 1, quantidade: 1, brinde: true },
    ]);
  });

  it('soma linhas do mesmo produto com a mesma marcação de brinde', () => {
    const result = mergeRepeatedCatalogItems([
      catalogo(1, 2),
      catalogo(2, 1),
      catalogo(1, 3),
      catalogo(2, 1, true),
      catalogo(2, 2, true),
    ]);

    expect(
      result.map(({ idProduto, quantidade, brinde }) => [
        idProduto,
        quantidade,
        brinde,
      ]),
    ).toEqual([
      [1, 5, false],
      [2, 1, false],
      [2, 3, true],
    ]);
  });

  it('não agrupa itens avulsos nem linhas sem produto', () => {
    const vazio = { ...emptySaleItem };
    const result = mergeRepeatedCatalogItems([
      avulso('Chaveiro', 1),
      avulso('Chaveiro', 2),
      vazio,
      vazio,
    ]);

    expect(result).toHaveLength(4);
  });
});

describe('buildSalePayload', () => {
  it('envia 5× pago + 1× brinde do mesmo produto como dois itens', () => {
    const form: SaleFormState = {
      ...initialSaleFormState,
      tipo: 'LOJA',
      itens: [catalogo(1, 5), catalogo(1, 1, true)],
      pagamentos: [{ idCarteira: 1, meioPagamento: 'PIX', valor: 0 }],
    };

    const payload = buildSalePayload({
      catalogProducts: [{ id: 1, valor: 1000 }],
      fairProductPrices: [],
      form,
      sale: null,
      totals: { saleDiscount: 0, total: 5000 },
    });

    expect(payload.itens).toEqual([
      { idProduto: 1, quantidade: 5, brinde: false, valorUnitario: 1000 },
      { idProduto: 1, quantidade: 1, brinde: true, valorUnitario: 1000 },
    ]);
  });
});
