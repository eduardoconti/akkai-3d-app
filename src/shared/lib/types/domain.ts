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
  estoqueMinimo?: number;
  idCategoria: number;
  valor: number;
  quantidadeEstoque: number;
  categoria?: Categoria;
}

export interface DetalheProduto {
  id: number;
  nome: string;
  codigo: string;
  descricao?: string;
  estoqueMinimo?: number;
  idCategoria: number;
  valor: number;
  categoria: {
    id: number;
    nome: string;
  };
  quantidadeEstoque: number;
}

export type OrigemEntradaEstoque = 'COMPRA' | 'AJUSTE' | 'PRODUCAO';
export type OrigemSaidaEstoque = 'AJUSTE' | 'PERDA';

export interface Feira {
  id: number;
  nome: string;
  local?: string;
  descricao?: string;
  ativa: boolean;
}

export type MeioPagamento = 'DIN' | 'DEB' | 'CRE' | 'PIX';
export type TipoVenda = 'FEIRA' | 'LOJA' | 'ONLINE';
export type CategoriaDespesa =
  | 'DESPESA_FIXA'
  | 'MATERIA_PRIMA'
  | 'EMBALAGEM'
  | 'EVENTO'
  | 'TRANSPORTE'
  | 'OUTROS';
export type OrdenacaoProduto = 'nome' | 'codigo';
export type DirecaoOrdenacao = 'asc' | 'desc';

export interface Carteira {
  id: number;
  nome: string;
  ativa: boolean;
  saldoAtual: number;
}

export interface Despesa {
  id: number;
  dataLancamento: string;
  descricao: string;
  valor: number;
  categoria: CategoriaDespesa;
  meioPagamento: MeioPagamento;
  idCarteira: number;
  observacao?: string;
  carteira?: Carteira;
}

export interface VendaItem {
  id: number;
  idProduto?: number;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  brinde: boolean;
  produto?: Produto | null;
}

export interface Venda {
  id: number;
  dataInclusao: string;
  valorTotal: number;
  tipo: TipoVenda;
  meioPagamento: MeioPagamento;
  desconto: number;
  idFeira?: number;
  idCarteira: number;
  feira?: Feira | null;
  carteira?: Carteira | null;
  itens: VendaItem[];
}

export interface ProdutoInput {
  nome: string;
  codigo: string;
  descricao?: string;
  estoqueMinimo?: number;
  idCategoria: number;
  valor: number;
}

export interface EstoqueInput<TOrigem extends string> {
  quantidade: number;
  origem: TOrigem;
}

export interface InserirVendaItemInput {
  quantidade: number;
  brinde?: boolean;
  idProduto?: number;
  nomeProduto?: string;
  valorUnitario?: number;
}

export interface InserirVendaInput {
  meioPagamento: MeioPagamento;
  tipo: TipoVenda;
  idFeira?: number;
  idCarteira: number;
  desconto?: number;
  itens: InserirVendaItemInput[];
}

export interface PesquisaPaginada {
  pagina: number;
  tamanhoPagina: number;
  termo?: string;
  ordenarPor?: OrdenacaoProduto;
  direcao?: DirecaoOrdenacao;
}

export interface PesquisaPaginadaVendas extends PesquisaPaginada {
  tipo?: TipoVenda;
  idFeira?: number;
  dataInicio?: string;
  dataFim?: string;
}

export interface PesquisaPaginadaDespesas extends PesquisaPaginada {
  dataInicio?: string;
  dataFim?: string;
}

export interface CarteiraInput {
  nome: string;
  ativa?: boolean;
}

export interface DespesaInput {
  dataLancamento: string;
  descricao: string;
  valor: number;
  categoria: CategoriaDespesa;
  meioPagamento: MeioPagamento;
  idCarteira: number;
  observacao?: string;
}

export interface ResultadoPaginado<T> {
  itens: T[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
}
