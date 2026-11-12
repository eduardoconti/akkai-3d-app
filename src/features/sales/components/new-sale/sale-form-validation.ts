import type {
  SaleFormErrors,
  SaleFormState,
  SaleItemErrors,
  SalePaymentErrors,
} from '@/features/sales/types/sale-form';
import type { MeioPagamento } from '@/shared';

export function validateSaleForm(
  form: SaleFormState,
  saleTotal: number,
  getAvailableMethods: (idCarteira: number | '') => MeioPagamento[],
) {
  const nextLocalErrors: SaleFormErrors = {};
  const nextItemErrors: SaleItemErrors = form.itens.map((item) => {
    const errors: SaleItemErrors[number] = {};

    if (item.tipoItem === 'CATALOGO' && !item.idProduto) {
      errors.idProduto = 'Selecione um produto do catálogo.';
    }

    if (item.tipoItem === 'AVULSO' && !item.nomeProduto.trim()) {
      errors.nomeProduto = 'Informe o nome do item avulso.';
    }

    if (item.tipoItem === 'AVULSO' && !item.brinde && item.valorUnitario <= 0) {
      errors.valorUnitario = 'Informe um valor unitário maior que zero.';
    }

    if (item.quantidade < 1) {
      errors.quantidade = 'Informe uma quantidade de pelo menos 1 unidade.';
    }

    return errors;
  });

  if (form.tipo === 'FEIRA' && form.idFeira === '') {
    nextLocalErrors.idFeira = 'Selecione a feira em que a venda aconteceu.';
  }

  if (!form.dataVenda) {
    nextLocalErrors.dataVenda = 'Informe a data da venda.';
  }

  if (form.desconto < 0) {
    nextLocalErrors.desconto = 'Informe um desconto válido.';
  }

  if (form.descontoModo === 'PERCENTUAL' && form.desconto > 99) {
    nextLocalErrors.desconto = 'O desconto em % deve ser de no máximo 99.';
  }

  if (form.descontoModo === 'VALOR' && form.desconto > 999.99) {
    nextLocalErrors.desconto = 'O desconto em R$ deve ser de no máximo 999,99.';
  }

  if (form.itens.length === 0) {
    nextLocalErrors.itens = 'Adicione ao menos um item na venda.';
  }

  const nextPaymentErrors: SalePaymentErrors = form.pagamentos.map(
    (pagamento, index) => {
      const errors: SalePaymentErrors[number] = {};
      const availableMethods = getAvailableMethods(pagamento.idCarteira);

      if (pagamento.idCarteira === '') {
        errors.idCarteira = 'Selecione a carteira do pagamento.';
      }

      if (!availableMethods.includes(pagamento.meioPagamento)) {
        errors.meioPagamento =
          'Selecione um meio aceito pela carteira informada.';
      }

      if (form.pagamentos.length > 1 && pagamento.valor <= 0) {
        errors.valor = 'Informe um valor maior que zero.';
      }

      if (form.pagamentos.length === 1 && saleTotal === 0 && index === 0) {
        errors.valor = undefined;
      }

      return errors;
    },
  );

  const totalPagamentos = form.pagamentos.reduce(
    (total, pagamento) =>
      total +
      (form.pagamentos.length === 1
        ? saleTotal
        : Math.round(pagamento.valor * 100)),
    0,
  );

  if (form.pagamentos.length === 0) {
    nextLocalErrors.pagamentos = 'Adicione ao menos um pagamento.';
  }

  if (form.pagamentos.length > 2) {
    nextLocalErrors.pagamentos = 'Informe no máximo 2 pagamentos.';
  }

  if (totalPagamentos !== saleTotal) {
    nextLocalErrors.pagamentos =
      'A soma dos pagamentos deve ser igual ao total da venda.';
  }

  return { nextLocalErrors, nextItemErrors, nextPaymentErrors };
}

export function scrollToFirstSaleFormError() {
  // Aguarda a renderização dos erros antes de procurar o primeiro campo inválido.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document
        .querySelector(
          '.MuiDialog-paper .Mui-error, .MuiDialog-paper [aria-invalid="true"], .MuiDialog-paper [data-form-error]',
        )
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });
}
