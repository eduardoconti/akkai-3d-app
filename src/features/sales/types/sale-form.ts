import type { MeioPagamento, TipoVenda } from '@/shared/lib/types/domain';

export type SaleItemType = 'CATALOGO' | 'AVULSO';

export type SaleFormItem = {
  tipoItem: SaleItemType;
  idProduto: number | null;
  nomeProduto: string;
  valorUnitario: number;
  quantidade: number;
  desconto: number;
};

export type SaleFormState = {
  meioPagamento: MeioPagamento;
  tipo: TipoVenda;
  idFeira: number | '';
  desconto: number;
  itens: SaleFormItem[];
};

export type SaleFormErrors = {
  idFeira?: string;
  itens?: string;
};

export type SaleItemErrors = Array<{
  idProduto?: string;
  nomeProduto?: string;
  valorUnitario?: string;
  quantidade?: string;
  desconto?: string;
}>;

export const emptySaleItem: SaleFormItem = {
  tipoItem: 'CATALOGO',
  idProduto: null,
  nomeProduto: '',
  valorUnitario: 0,
  quantidade: 1,
  desconto: 0,
};

export const initialSaleFormState: SaleFormState = {
  meioPagamento: 'PIX',
  tipo: 'FEIRA',
  idFeira: '',
  desconto: 0,
  itens: [{ ...emptySaleItem }],
};
