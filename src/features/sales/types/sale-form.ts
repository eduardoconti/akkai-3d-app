import type { MeioPagamento, TipoVenda } from '@/shared/lib/types/domain';

export type SaleFormItem = {
  idProduto: number | null;
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
  quantidade?: string;
  desconto?: string;
}>;

export const emptySaleItem: SaleFormItem = {
  idProduto: null,
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
