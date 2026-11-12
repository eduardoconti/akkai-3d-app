import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import type { Orcamento } from '@/shared/lib/types/domain';
import { formatLocalDate } from '@/shared/utils/date';

/**
 * Formulário de venda para finalizar um orçamento. Com produtos do catálogo,
 * eles já vêm selecionados (o ajuste do total ao valor combinado é feito pelo
 * diálogo de venda, que conhece os preços reais). Sem produtos, mantém um item
 * avulso com o valor do orçamento.
 */
export function buildSaleFormFromBudget(orcamento: Orcamento): SaleFormState {
  const budgetValue = orcamento.valor ?? 0;
  const baseForm: SaleFormState = {
    ...initialSaleFormState,
    dataVenda: formatLocalDate(),
    tipo: orcamento.tipo,
    idFeira: orcamento.tipo === 'FEIRA' ? (orcamento.idFeira ?? '') : '',
    idOrcamento: orcamento.id,
    desconto: 0,
    descontoModo: 'VALOR',
    pagamentos: [
      {
        ...initialSaleFormState.pagamentos[0],
        valor: budgetValue / 100,
      },
    ],
  };

  if (orcamento.itens?.length) {
    return {
      ...baseForm,
      itens: orcamento.itens.map((item) => ({
        ...emptySaleItem,
        tipoItem: 'CATALOGO',
        idProduto: item.idProduto,
        nomeProduto: item.nomeProduto,
        quantidade: item.quantidade,
      })),
    };
  }

  const itemName =
    orcamento.descricao?.trim() ||
    `Orçamento #${orcamento.id} - ${orcamento.nomeCliente}`;

  return {
    ...baseForm,
    itens: [
      {
        ...emptySaleItem,
        tipoItem: 'AVULSO',
        nomeProduto: itemName,
        valorUnitario: budgetValue / 100,
        quantidade: 1,
      },
    ],
  };
}
