import { describe, expect, it } from 'vitest';
import {
  buildBudgetItemsInput,
  getBudgetItemsTotal,
  hasBudgetItemsErrors,
  setBudgetItemProduct,
  suggestBudgetValue,
  validateBudgetItems,
} from './budget-items';

const produtos = [
  { id: 1, valor: 1000 },
  { id: 2, valor: 1550 },
];

describe('getBudgetItemsTotal', () => {
  it('soma quantidade x preço do catálogo em reais', () => {
    expect(
      getBudgetItemsTotal(
        [
          { idProduto: 1, quantidade: 2 },
          { idProduto: 2, quantidade: 1 },
        ],
        produtos,
      ),
    ).toBe(35.5);
  });

  it('ignora linhas sem produto ou com produto fora do catálogo', () => {
    expect(
      getBudgetItemsTotal(
        [
          { idProduto: null, quantidade: 3 },
          { idProduto: 99, quantidade: 1 },
        ],
        produtos,
      ),
    ).toBe(0);
  });

  it('não acumula erro de ponto flutuante', () => {
    expect(
      getBudgetItemsTotal(
        [{ idProduto: 1, quantidade: 3 }],
        [{ id: 1, valor: 1010 }],
      ),
    ).toBe(30.3);
  });
});

describe('suggestBudgetValue', () => {
  it('acompanha a soma quando o valor está vazio', () => {
    expect(suggestBudgetValue(0, 0, 20)).toBe(20);
  });

  it('acompanha a soma quando o valor ainda é igual à soma anterior', () => {
    expect(suggestBudgetValue(20, 20, 35.5)).toBe(35.5);
  });

  it('mantém o valor combinado à mão', () => {
    expect(suggestBudgetValue(50, 20, 35.5)).toBe(50);
  });

  it('volta a zero quando todos os produtos saem e o valor era a soma', () => {
    expect(suggestBudgetValue(20, 20, 0)).toBe(0);
  });
});

describe('setBudgetItemProduct', () => {
  it('troca o produto de uma linha', () => {
    expect(
      setBudgetItemProduct([{ idProduto: null, quantidade: 1 }], 0, 2),
    ).toEqual([{ idProduto: 2, quantidade: 1 }]);
  });

  it('soma as quantidades quando o produto já está em outra linha', () => {
    expect(
      setBudgetItemProduct(
        [
          { idProduto: 1, quantidade: 2 },
          { idProduto: null, quantidade: 3 },
        ],
        1,
        1,
      ),
    ).toEqual([{ idProduto: 1, quantidade: 5 }]);
  });

  it('respeita o limite de quantidade ao somar', () => {
    expect(
      setBudgetItemProduct(
        [
          { idProduto: 1, quantidade: 400 },
          { idProduto: null, quantidade: 300 },
        ],
        1,
        1,
      ),
    ).toEqual([{ idProduto: 1, quantidade: 500 }]);
  });

  it('limpar o produto não mescla linhas', () => {
    expect(
      setBudgetItemProduct([{ idProduto: 1, quantidade: 2 }], 0, null),
    ).toEqual([{ idProduto: null, quantidade: 2 }]);
  });
});

describe('buildBudgetItemsInput', () => {
  it('envia só as linhas com produto', () => {
    expect(
      buildBudgetItemsInput([
        { idProduto: 1, quantidade: 2 },
        { idProduto: null, quantidade: 1 },
      ]),
    ).toEqual([{ idProduto: 1, quantidade: 2 }]);
  });
});

describe('validateBudgetItems', () => {
  it('aceita linhas válidas', () => {
    expect(
      hasBudgetItemsErrors(
        validateBudgetItems([{ idProduto: 1, quantidade: 2 }]),
      ),
    ).toBe(false);
  });

  it('exige produto e quantidade de 1 a 500 inteira', () => {
    const { rows } = validateBudgetItems([
      { idProduto: null, quantidade: 1 },
      { idProduto: 1, quantidade: 0 },
      { idProduto: 1, quantidade: 501 },
      { idProduto: 1, quantidade: 1.5 },
    ]);

    expect(rows[0].idProduto).toBe('Selecione o produto.');
    expect(rows[1].quantidade).toBeDefined();
    expect(rows[2].quantidade).toBeDefined();
    expect(rows[3].quantidade).toBeDefined();
  });

  it('recusa mais de 12 produtos', () => {
    const itens = Array.from({ length: 13 }, (_, index) => ({
      idProduto: index + 1,
      quantidade: 1,
    }));

    expect(validateBudgetItems(itens).general).toContain('no máximo 12');
  });
});
