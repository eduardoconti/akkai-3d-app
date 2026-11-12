import { describe, expect, it } from 'vitest';
import type { Orcamento } from '@/shared/lib/types/domain';
import { buildSaleFormFromBudget } from './build-sale-form-from-budget';

function budget(overrides: Partial<Orcamento> = {}): Orcamento {
  return {
    id: 7,
    nomeCliente: 'Maria',
    dataInclusao: '2026-11-01T10:00:00.000Z',
    status: 'APROVADO',
    tipo: 'LOJA',
    valor: 4000,
    ...overrides,
  };
}

describe('buildSaleFormFromBudget', () => {
  it('traz os produtos do orçamento já selecionados', () => {
    const form = buildSaleFormFromBudget(
      budget({
        itens: [
          { id: 1, idProduto: 10, nomeProduto: 'Chaveiro', quantidade: 2 },
          { id: 2, idProduto: 11, nomeProduto: 'Vaso', quantidade: 1 },
        ],
      }),
    );

    expect(form.itens).toEqual([
      expect.objectContaining({
        tipoItem: 'CATALOGO',
        idProduto: 10,
        nomeProduto: 'Chaveiro',
        quantidade: 2,
        brinde: false,
      }),
      expect.objectContaining({
        tipoItem: 'CATALOGO',
        idProduto: 11,
        quantidade: 1,
      }),
    ]);
    expect(form.idOrcamento).toBe(7);
    expect(form.pagamentos[0].valor).toBe(40);
    expect(form.desconto).toBe(0);
  });

  it('mantém um item avulso com o valor quando não há produtos', () => {
    const form = buildSaleFormFromBudget(
      budget({ descricao: ' Peça decorativa ' }),
    );

    expect(form.itens).toEqual([
      expect.objectContaining({
        tipoItem: 'AVULSO',
        nomeProduto: 'Peça decorativa',
        valorUnitario: 40,
        quantidade: 1,
      }),
    ]);
  });

  it('trata lista de produtos vazia como orçamento sem produtos', () => {
    const form = buildSaleFormFromBudget(budget({ itens: [] }));

    expect(form.itens[0].tipoItem).toBe('AVULSO');
    expect(form.itens[0].nomeProduto).toBe('Orçamento #7 - Maria');
  });

  it('leva a feira somente em orçamentos de feira', () => {
    expect(
      buildSaleFormFromBudget(budget({ tipo: 'FEIRA', idFeira: 3 })).idFeira,
    ).toBe(3);
    expect(
      buildSaleFormFromBudget(budget({ tipo: 'LOJA', idFeira: 3 })).idFeira,
    ).toBe('');
  });

  it('não define valor de pagamento sem valor no orçamento', () => {
    const form = buildSaleFormFromBudget(budget({ valor: undefined }));

    expect(form.pagamentos[0].valor).toBe(0);
  });
});
