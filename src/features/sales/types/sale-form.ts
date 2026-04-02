import type { MeioPagamento, TipoVenda } from '@/shared/lib/types/domain';

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

export type SaleFormState = {
  meioPagamento: MeioPagamento;
  tipo: TipoVenda;
  idFeira: number | '';
  idCarteira: number | '';
  desconto: number;
  descontoModo: DiscountMode;
  itens: SaleFormItem[];
};

export type SaleFormErrors = {
  idFeira?: string;
  idCarteira?: string;
  desconto?: string;
  itens?: string;
};

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
  meioPagamento: 'PIX',
  tipo: 'FEIRA',
  idFeira: '',
  idCarteira: '',
  desconto: 0,
  descontoModo: 'VALOR',
  itens: [{ ...emptySaleItem }],
};
