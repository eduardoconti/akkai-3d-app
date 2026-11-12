import {
  emptySaleItem,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import type { PrecoProdutoFeira } from '@/shared';
import { calculateSaleTotals } from './sale-form-helpers';

/** Limites do backend para o desconto da venda e para o valor de item avulso. */
const MAX_DISCOUNT_CENTS = 50_000;
const MAX_AD_HOC_ITEM_CENTS = 100_000;
const MAX_SALE_ITEMS = 12;

export type BudgetReconciliation =
  | { kind: 'none' }
  | { kind: 'discount'; form: SaleFormState; differenceCents: number }
  | { kind: 'complement'; form: SaleFormState; differenceCents: number }
  | {
      kind: 'manual';
      reason: 'above-limit' | 'items-full';
      subtotalCents: number;
      differenceCents: number;
    };

/**
 * Faz o total da venda fechar no valor combinado do orçamento. A soma dos
 * produtos usa os preços reais da venda (catálogo ou feira): se passar do
 * valor combinado, a diferença vira desconto; se ficar abaixo, entra um item
 * avulso de complemento. Quando o backend não aceitaria a diferença (limites
 * de desconto, de item avulso ou de 12 itens), devolve `manual`.
 */
export function reconcileSaleWithBudgetValue({
  budgetId,
  fairProductPrices,
  form,
  produtos,
  targetCents,
}: {
  budgetId: number;
  fairProductPrices: PrecoProdutoFeira[];
  form: SaleFormState;
  produtos: Array<{ id: number; valor: number }>;
  targetCents: number;
}): BudgetReconciliation {
  const { subtotal } = calculateSaleTotals(
    { ...form, desconto: 0, descontoModo: 'VALOR' },
    produtos,
    fairProductPrices,
  );
  const difference = subtotal - targetCents;

  if (difference === 0) {
    return { kind: 'none' };
  }

  const payToTarget = (next: SaleFormState): SaleFormState => ({
    ...next,
    pagamentos: next.pagamentos.map((pagamento, index) =>
      index === 0 ? { ...pagamento, valor: targetCents / 100 } : pagamento,
    ),
  });

  if (difference > 0) {
    if (difference > MAX_DISCOUNT_CENTS) {
      return {
        kind: 'manual',
        reason: 'above-limit',
        subtotalCents: subtotal,
        differenceCents: difference,
      };
    }

    return {
      kind: 'discount',
      differenceCents: difference,
      form: payToTarget({
        ...form,
        desconto: difference / 100,
        descontoModo: 'VALOR',
      }),
    };
  }

  const missing = -difference;

  if (missing > MAX_AD_HOC_ITEM_CENTS) {
    return {
      kind: 'manual',
      reason: 'above-limit',
      subtotalCents: subtotal,
      differenceCents: difference,
    };
  }

  if (form.itens.length >= MAX_SALE_ITEMS) {
    return {
      kind: 'manual',
      reason: 'items-full',
      subtotalCents: subtotal,
      differenceCents: difference,
    };
  }

  return {
    kind: 'complement',
    differenceCents: missing,
    form: payToTarget({
      ...form,
      desconto: 0,
      descontoModo: 'VALOR',
      itens: [
        ...form.itens,
        {
          ...emptySaleItem,
          tipoItem: 'AVULSO',
          nomeProduto: `Complemento do orçamento #${budgetId}`,
          valorUnitario: missing / 100,
          quantidade: 1,
        },
      ],
    }),
  };
}
