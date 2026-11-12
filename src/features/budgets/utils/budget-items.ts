import type { Produto, OrcamentoItemInput } from '@/shared';
import {
  MAX_BUDGET_ITEM_QUANTITY,
  MAX_BUDGET_ITEMS,
  type BudgetFormItem,
} from '@/features/budgets/types/budget-form';

const toCents = (value: number) => Math.round(value * 100);

/** Soma (em reais) dos produtos do orçamento pelo preço atual do catálogo. */
export function getBudgetItemsTotal(
  itens: BudgetFormItem[],
  produtos: Array<Pick<Produto, 'id' | 'valor'>>,
): number {
  const totalCents = itens.reduce((total, item) => {
    const produto = produtos.find((current) => current.id === item.idProduto);

    return total + (produto ? produto.valor * item.quantidade : 0);
  }, 0);

  return totalCents / 100;
}

/**
 * Valor do orçamento depois de os produtos mudarem: acompanha a soma enquanto
 * estiver vazio ou igual à soma anterior; se foi combinado à mão, é mantido.
 */
export function suggestBudgetValue(
  currentValue: number,
  previousTotal: number,
  nextTotal: number,
): number {
  const current = toCents(currentValue);

  return current === 0 || current === toCents(previousTotal)
    ? nextTotal
    : currentValue;
}

/**
 * Define o produto de uma linha. Se o produto já está em outra linha, as
 * quantidades são somadas e a linha atual deixa de existir.
 */
export function setBudgetItemProduct(
  itens: BudgetFormItem[],
  index: number,
  idProduto: number | null,
): BudgetFormItem[] {
  const duplicateIndex =
    idProduto === null
      ? -1
      : itens.findIndex(
          (item, itemIndex) =>
            itemIndex !== index && item.idProduto === idProduto,
        );

  if (duplicateIndex === -1) {
    return itens.map((item, itemIndex) =>
      itemIndex === index ? { ...item, idProduto } : item,
    );
  }

  return itens
    .map((item, itemIndex) =>
      itemIndex === duplicateIndex
        ? {
            ...item,
            quantidade: Math.min(
              item.quantidade + itens[index].quantidade,
              MAX_BUDGET_ITEM_QUANTITY,
            ),
          }
        : item,
    )
    .filter((_item, itemIndex) => itemIndex !== index);
}

/** Linhas sem produto escolhido não são enviadas. */
export function buildBudgetItemsInput(
  itens: BudgetFormItem[],
): OrcamentoItemInput[] {
  return itens.flatMap((item) =>
    item.idProduto === null
      ? []
      : [{ idProduto: item.idProduto, quantidade: item.quantidade }],
  );
}

export interface BudgetItemsErrors {
  general?: string;
  rows: Array<{ idProduto?: string; quantidade?: string }>;
}

export function validateBudgetItems(
  itens: BudgetFormItem[],
): BudgetItemsErrors {
  const rows = itens.map((item) => {
    const errors: { idProduto?: string; quantidade?: string } = {};

    if (item.idProduto === null) {
      errors.idProduto = 'Selecione o produto.';
    }

    if (
      !Number.isInteger(item.quantidade) ||
      item.quantidade < 1 ||
      item.quantidade > MAX_BUDGET_ITEM_QUANTITY
    ) {
      errors.quantidade = `Informe de 1 a ${MAX_BUDGET_ITEM_QUANTITY} unidades.`;
    }

    return errors;
  });

  return {
    general:
      itens.length > MAX_BUDGET_ITEMS
        ? `O orçamento aceita no máximo ${MAX_BUDGET_ITEMS} produtos.`
        : undefined,
    rows,
  };
}

export function hasBudgetItemsErrors(errors: BudgetItemsErrors): boolean {
  return (
    Boolean(errors.general) ||
    errors.rows.some((row) => Object.keys(row).length > 0)
  );
}
