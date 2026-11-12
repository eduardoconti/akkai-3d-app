import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { SaleFormState } from '@/features/sales/types/sale-form';
import { formatCurrency, type PrecoProdutoFeira, type Produto } from '@/shared';
import { reconcileSaleWithBudgetValue } from './budget-total-reconciliation';

export interface BudgetNotice {
  severity: 'info' | 'warning';
  text: string;
}

interface UseBudgetTotalReconciliationParams {
  open: boolean;
  /** Valor combinado do orçamento, em centavos; sem ele nada é ajustado. */
  targetCents?: number;
  initialForm?: SaleFormState;
  form: SaleFormState;
  setForm: Dispatch<SaleFormState>;
  catalogProducts: Produto[];
  fairProductPrices: PrecoProdutoFeira[];
  /** Feira com preços já carregados (necessária em vendas de feira). */
  loadedFairId: number | '';
}

/**
 * Ao finalizar um orçamento com produtos, faz o total da venda fechar no valor
 * combinado (desconto ou item de complemento). Roda uma única vez por abertura
 * e só se o usuário ainda não mexeu nos itens ou no desconto.
 */
export function useBudgetTotalReconciliation({
  open,
  targetCents,
  initialForm,
  form,
  setForm,
  catalogProducts,
  fairProductPrices,
  loadedFairId,
}: UseBudgetTotalReconciliationParams): BudgetNotice | null {
  const [notice, setNotice] = useState<BudgetNotice | null>(null);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      appliedRef.current = false;
      setNotice(null);
    }
  }, [open]);

  useEffect(() => {
    const budgetId = initialForm?.idOrcamento;

    if (
      !open ||
      appliedRef.current ||
      targetCents === undefined ||
      targetCents <= 0 ||
      budgetId === undefined ||
      form.idOrcamento !== budgetId
    ) {
      return;
    }

    // Só vale para o formulário ainda como veio do orçamento.
    const isUntouched =
      form.desconto === 0 &&
      JSON.stringify(form.itens) === JSON.stringify(initialForm?.itens);
    const hasCatalogItems = form.itens.some(
      (item) => item.tipoItem === 'CATALOGO',
    );

    if (!isUntouched || !hasCatalogItems) {
      return;
    }

    const catalogReady = form.itens.every(
      (item) =>
        item.tipoItem !== 'CATALOGO' ||
        catalogProducts.some((produto) => produto.id === item.idProduto),
    );
    const fairReady = form.tipo !== 'FEIRA' || loadedFairId === form.idFeira;

    if (!catalogReady || !fairReady) {
      return;
    }

    appliedRef.current = true;
    const result = reconcileSaleWithBudgetValue({
      budgetId,
      fairProductPrices: form.tipo === 'FEIRA' ? fairProductPrices : [],
      form,
      produtos: catalogProducts,
      targetCents,
    });

    if (result.kind === 'none') {
      return;
    }

    if (result.kind === 'manual') {
      setNotice({
        severity: 'warning',
        text:
          result.reason === 'items-full'
            ? `A soma dos produtos (${formatCurrency(result.subtotalCents)}) é menor que o valor combinado do orçamento (${formatCurrency(targetCents)}) e a venda já tem o máximo de itens. Ajuste os itens para fechar no valor combinado.`
            : `A soma dos produtos (${formatCurrency(result.subtotalCents)}) difere do valor combinado do orçamento (${formatCurrency(targetCents)}) além do que pode ser ajustado automaticamente. Revise os itens e o desconto.`,
      });
      return;
    }

    setForm(result.form);
    setNotice({
      severity: 'info',
      text:
        result.kind === 'discount'
          ? `Desconto de ${formatCurrency(result.differenceCents)} aplicado para a venda fechar no valor combinado do orçamento (${formatCurrency(targetCents)}).`
          : `Item de complemento de ${formatCurrency(result.differenceCents)} adicionado para a venda fechar no valor combinado do orçamento (${formatCurrency(targetCents)}).`,
    });
  }, [
    open,
    targetCents,
    initialForm,
    form,
    setForm,
    catalogProducts,
    fairProductPrices,
    loadedFairId,
  ]);

  return notice;
}
