import type { MeioPagamento, TipoVenda } from '@/shared/lib/types/domain';
import { formatLocalDate } from '@/shared/utils/date';

export type SaleItemType = 'CATALOGO' | 'AVULSO';
export type DiscountMode = 'VALOR' | 'PERCENTUAL';

export type SaleFormItem = {
  tipoItem: SaleItemType;
  idProduto: number | null;
  nomeProduto: string;
  valorUnitario: number;
  quantidade: number;
  brinde: boolean;
};

export type SaleFormPayment = {
  idCarteira: number | '';
  meioPagamento: MeioPagamento;
  valor: number;
};

export type SaleFormState = {
  dataVenda: string;
  tipo: TipoVenda;
  idFeira: number | '';
  desconto: number;
  descontoModo: DiscountMode;
  itens: SaleFormItem[];
  pagamentos: SaleFormPayment[];
};

export type SaleFormErrors = {
  dataVenda?: string;
  idFeira?: string;
  desconto?: string;
  itens?: string;
  pagamentos?: string;
};

export type SalePaymentErrors = Array<{
  idCarteira?: string;
  meioPagamento?: string;
  valor?: string;
}>;

export type SaleItemErrors = Array<{
  idProduto?: string;
  nomeProduto?: string;
  valorUnitario?: string;
  quantidade?: string;
}>;

export const emptySaleItem: SaleFormItem = {
  tipoItem: 'CATALOGO',
  idProduto: null,
  nomeProduto: '',
  valorUnitario: 0,
  quantidade: 1,
  brinde: false,
};

export const initialSaleFormState: SaleFormState = {
  dataVenda: formatLocalDate(),
  tipo: 'FEIRA',
  idFeira: '',
  desconto: 0,
  descontoModo: 'VALOR',
  itens: [{ ...emptySaleItem }],
  pagamentos: [{ idCarteira: '', meioPagamento: 'CRE', valor: 0 }],
};
