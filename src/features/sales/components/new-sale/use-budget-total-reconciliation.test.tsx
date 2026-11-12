import { renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import type { Produto } from '@/shared';
import { useBudgetTotalReconciliation } from './use-budget-total-reconciliation';

const catalog = [
  { id: 1, valor: 1000 },
  { id: 2, valor: 2500 },
] as Produto[];

function budgetForm(overrides: Partial<SaleFormState> = {}): SaleFormState {
  return {
    ...initialSaleFormState,
    tipo: 'LOJA',
    idFeira: '',
    idOrcamento: 7,
    itens: [
      { ...emptySaleItem, idProduto: 1, quantidade: 2 },
      { ...emptySaleItem, idProduto: 2, quantidade: 1 },
    ],
    pagamentos: [{ idCarteira: 1, meioPagamento: 'PIX', valor: 0 }],
    ...overrides,
  };
}

interface Props {
  open?: boolean;
  catalogProducts?: Produto[];
  loadedFairId?: number | '';
  initial?: SaleFormState;
  start?: SaleFormState;
  targetCents?: number;
}

function setup(props: Props = {}) {
  const initial = props.initial ?? budgetForm();

  return renderHook(
    (current: Props) => {
      const [form, setForm] = useState(current.start ?? initial);
      const notice = useBudgetTotalReconciliation({
        open: current.open ?? true,
        targetCents: current.targetCents ?? 4000,
        initialForm: initial,
        form,
        setForm,
        catalogProducts: current.catalogProducts ?? catalog,
        fairProductPrices: [],
        loadedFairId: current.loadedFairId ?? '',
      });

      return { form, notice };
    },
    { initialProps: props },
  );
}

describe('useBudgetTotalReconciliation', () => {
  it('aplica o desconto quando a soma passa do valor combinado', () => {
    const { result } = setup();

    expect(result.current.form.desconto).toBe(5);
    expect(result.current.notice?.severity).toBe('info');
    expect(result.current.notice?.text).toContain('Desconto de');
  });

  it('adiciona o complemento quando a soma fica abaixo', () => {
    const { result } = setup({ targetCents: 5000 });

    expect(result.current.form.itens).toHaveLength(3);
    expect(result.current.form.itens[2].nomeProduto).toBe(
      'Complemento do orçamento #7',
    );
    expect(result.current.notice?.text).toContain('Item de complemento');
  });

  it('espera o catálogo carregar antes de aplicar', () => {
    const { result, rerender } = setup({ catalogProducts: [] });

    expect(result.current.form.desconto).toBe(0);
    expect(result.current.notice).toBeNull();

    rerender({ catalogProducts: catalog });

    expect(result.current.form.desconto).toBe(5);
  });

  it('em vendas de feira, espera os preços da feira', () => {
    const feiraForm = budgetForm({ tipo: 'FEIRA', idFeira: 3 });
    const { result, rerender } = setup({
      initial: feiraForm,
      loadedFairId: '',
    });

    expect(result.current.form.desconto).toBe(0);

    rerender({ initial: feiraForm, loadedFairId: 3 });

    expect(result.current.form.desconto).toBe(5);
  });

  it('não reaplica depois de aplicado', () => {
    const { result, rerender } = setup();
    expect(result.current.form.itens).toHaveLength(2);

    rerender({});
    rerender({});

    expect(result.current.form.desconto).toBe(5);
    expect(result.current.form.itens).toHaveLength(2);
  });

  it('não mexe se o usuário já alterou os itens', () => {
    const touched = budgetForm({
      itens: [{ ...emptySaleItem, idProduto: 1, quantidade: 5 }],
    });
    const { result } = setup({ start: touched });

    expect(result.current.form.desconto).toBe(0);
    expect(result.current.notice).toBeNull();
  });

  it('não faz nada sem valor combinado ou com a janela fechada', () => {
    expect(setup({ targetCents: 0 }).result.current.form.desconto).toBe(0);
    expect(setup({ open: false }).result.current.form.desconto).toBe(0);
  });

  it('avisa quando a diferença não pode ser aplicada automaticamente', () => {
    const { result } = setup({ targetCents: 500000 });

    expect(result.current.notice?.severity).toBe('warning');
    expect(result.current.form.itens).toHaveLength(2);
  });
});
