import { describe, expect, it } from 'vitest';
import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import { reconcileSaleWithBudgetValue } from './budget-total-reconciliation';

const produtos = [
  { id: 1, valor: 1000 },
  { id: 2, valor: 2500 },
];

function formWith(items: Array<[number, number]>): SaleFormState {
  return {
    ...initialSaleFormState,
    tipo: 'LOJA',
    idOrcamento: 7,
    itens: items.map(([idProduto, quantidade]) => ({
      ...emptySaleItem,
      idProduto,
      quantidade,
    })),
    pagamentos: [{ idCarteira: 1, meioPagamento: 'PIX', valor: 0 }],
  };
}

const run = (
  form: SaleFormState,
  targetCents: number,
  fairProductPrices: Parameters<
    typeof reconcileSaleWithBudgetValue
  >[0]['fairProductPrices'] = [],
) =>
  reconcileSaleWithBudgetValue({
    budgetId: 7,
    form,
    produtos,
    fairProductPrices,
    targetCents,
  });

describe('reconcileSaleWithBudgetValue', () => {
  it('não altera nada quando a soma já é o valor do orçamento', () => {
    expect(run(formWith([[1, 2]]), 2000)).toEqual({ kind: 'none' });
  });

  it('vira desconto quando a soma passa do valor combinado', () => {
    const result = run(
      formWith([
        [1, 2],
        [2, 1],
      ]),
      4000,
    );

    expect(result.kind).toBe('discount');
    if (result.kind === 'discount') {
      expect(result.differenceCents).toBe(500);
      expect(result.form.desconto).toBe(5);
      expect(result.form.descontoModo).toBe('VALOR');
      expect(result.form.pagamentos[0].valor).toBe(40);
      expect(result.form.itens).toHaveLength(2);
    }
  });

  it('vira item avulso de complemento quando a soma fica abaixo', () => {
    const result = run(formWith([[1, 2]]), 2550);

    expect(result.kind).toBe('complement');
    if (result.kind === 'complement') {
      expect(result.form.desconto).toBe(0);
      expect(result.form.itens).toHaveLength(2);
      expect(result.form.itens[1]).toMatchObject({
        tipoItem: 'AVULSO',
        nomeProduto: 'Complemento do orçamento #7',
        valorUnitario: 5.5,
        quantidade: 1,
        brinde: false,
      });
      expect(result.form.pagamentos[0].valor).toBe(25.5);
    }
  });

  it('usa o preço da feira no cálculo da soma', () => {
    const result = run(formWith([[1, 2]]), 1800, [
      { id: 1, idFeira: 3, idProduto: 1, valor: 900 } as never,
    ]);

    expect(result).toEqual({ kind: 'none' });
  });

  it('pede ajuste manual quando o desconto passa do limite do backend', () => {
    const result = run(formWith([[2, 40]]), 10000);

    expect(result).toMatchObject({
      kind: 'manual',
      reason: 'above-limit',
      differenceCents: 90000,
    });
  });

  it('pede ajuste manual quando o complemento passa do limite de item avulso', () => {
    const result = run(formWith([[1, 1]]), 200000);

    expect(result).toMatchObject({ kind: 'manual', reason: 'above-limit' });
  });

  it('pede ajuste manual quando a venda já tem 12 itens', () => {
    const items = Array.from({ length: 12 }, (_, i): [number, number] => [
      i % 2 === 0 ? 1 : 2,
      1,
    ]);

    const result = run(formWith(items), 26000);

    expect(result).toMatchObject({ kind: 'manual', reason: 'items-full' });
  });

  it('desconsidera brindes e descontos já presentes na soma', () => {
    const form = formWith([[1, 2]]);
    form.itens[0].brinde = true;
    form.desconto = 3;

    const result = run(form, 0);

    expect(result).toEqual({ kind: 'none' });
  });
});
