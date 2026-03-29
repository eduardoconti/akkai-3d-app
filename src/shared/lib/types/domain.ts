export interface Categoria {
  id: number;
  nome: string;
  idAscendente: number | null;
}

export interface Produto {
  id: number;
  nome: string;
  codigo: string;
  descricao?: string;
  valor: number;
  categoria?: Categoria;
}

export interface Feira {
  id: number;
  nome: string;
  local?: string;
  descricao?: string;
  ativa: boolean;
}

export type MeioPagamento = 'DIN' | 'DEB' | 'CRE' | 'PIX';
export type TipoVenda = 'FEIRA' | 'LOJA' | 'ONLINE';

export interface VendaItem {
  id: number;
  idProduto: number;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  desconto: number;
  produto: Produto;
}

export interface Venda {
  id: number;
  dataInclusao: string;
  valorTotal: number;
  tipo: TipoVenda;
  meioPagamento: MeioPagamento;
  desconto: number;
  idFeira?: number;
  feira?: Feira | null;
  itens: VendaItem[];
}

export interface ProdutoInput {
  nome: string;
  codigo: string;
  descricao?: string;
  idCategoria: number;
  valor: number;
}

export interface InserirVendaItemInput {
  quantidade: number;
  desconto?: number;
  idProduto: number;
}

export interface InserirVendaInput {
  meioPagamento: MeioPagamento;
  tipo: TipoVenda;
  idFeira?: number;
  desconto?: number;
  itens: InserirVendaItemInput[];
}
