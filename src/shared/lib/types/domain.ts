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
  quantidadeEstoque?: number;
  categoria?: Categoria;
}

export interface EstoqueProduto {
  id: number;
  nome: string;
  codigo: string;
  descricao?: string;
  estoqueMinimo?: number;
  idCategoria: number;
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
export type TipoMovimentacaoEstoque = 'E' | 'S';
export type OrigemMovimentacaoEstoque =
  | OrigemEntradaEstoque
  | OrigemSaidaEstoque
  | 'VENDA';

export interface MovimentacaoEstoque {
  id: number;
  idProduto: number;
  idItemVenda?: number;
  usuario: string;
  quantidade: number;
  tipo: TipoMovimentacaoEstoque;
  origem: OrigemMovimentacaoEstoque;
  dataInclusao: string;
}

export interface Feira {
  id: number;
  nome: string;
  local?: string;
  descricao?: string;
  ativa: boolean;
}

export interface FeiraInput {
  nome: string;
  local?: string;
  descricao?: string;
  ativa?: boolean;
}

export type MeioPagamento = 'DIN' | 'DEB' | 'CRE' | 'PIX';
export type TipoVenda = 'FEIRA' | 'LOJA' | 'ONLINE';
export type StatusOrcamento =
  | 'PENDENTE'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'PRODUZIDO'
  | 'FINALIZADO';
export interface CategoriaDespesa {
  id: number;
  nome: string;
}
export type OrdenacaoProduto =
  | 'nome'
  | 'codigo'
  | 'quantidade'
  | 'nivelEstoque'
  | 'estoqueMinimo';
export type DirecaoOrdenacao = 'asc' | 'desc';

export interface Carteira {
  id: number;
  nome: string;
  ativa: boolean;
  saldoAtual: number;
  meiosPagamento: MeioPagamento[];
  consideraImpostoVenda?: boolean;
  percentualImpostoVenda?: number | null;
}

export interface TaxaMeioPagamentoCarteira {
  id: number;
  idCarteira: number;
  meioPagamento: MeioPagamento;
  percentual: number;
  ativa: boolean;
  carteira?: Carteira;
}

export interface Despesa {
  id: number;
  dataLancamento: string;
  descricao: string;
  valor: number;
  idCategoria: number;
  categoria: CategoriaDespesa;
  meioPagamento: MeioPagamento;
  idCarteira: number;
  idFeira?: number;
  observacao?: string;
  carteira?: Carteira;
  feira?: Feira | null;
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
  valorLiquido?: number;
  tipo: TipoVenda;
  meioPagamento: MeioPagamento;
  desconto: number;
  percentualTaxa?: number | null;
  valorTaxa?: number | null;
  percentualImposto?: number | null;
  valorImposto?: number | null;
  idFeira?: number;
  idCarteira: number;
  feira?: Feira | null;
  carteira?: Carteira | null;
  itens: VendaItem[];
}

export interface Orcamento {
  id: number;
  nomeCliente: string;
  telefoneCliente?: string;
  descricao?: string;
  linkSTL?: string;
  dataInclusao: string;
  status: StatusOrcamento;
  tipo: TipoVenda;
  idFeira?: number;
  valor?: number;
  quantidade?: number;
  feira?: Feira | null;
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
  idsCategorias?: number[];
}

export interface PesquisaPaginadaVendas extends PesquisaPaginada {
  tipo?: TipoVenda;
  idFeira?: number;
  idCarteira?: number;
  meioPagamento?: MeioPagamento;
  dataInicio?: string;
  dataFim?: string;
}

export type PesquisaPaginadaFeiras = PesquisaPaginada;

export interface PesquisaPaginadaDespesas extends PesquisaPaginada {
  dataInicio?: string;
  dataFim?: string;
  idsCategorias?: number[];
  idFeira?: number;
}

export type PesquisaPaginadaOrcamentos = PesquisaPaginada;

export interface CarteiraInput {
  nome: string;
  ativa?: boolean;
  meiosPagamento?: MeioPagamento[];
  consideraImpostoVenda?: boolean;
  percentualImpostoVenda?: number | null;
}

export interface TaxaMeioPagamentoCarteiraInput {
  idCarteira: number;
  meioPagamento: MeioPagamento;
  percentual: number;
  ativa?: boolean;
}

export interface CategoriaDespesaInput {
  nome: string;
}

export interface DespesaInput {
  dataLancamento: string;
  descricao: string;
  valor: number;
  idCategoria: number;
  meioPagamento: MeioPagamento;
  idCarteira: number;
  idFeira?: number;
  observacao?: string;
}

export interface OrcamentoInput {
  nomeCliente: string;
  telefoneCliente?: string;
  descricao?: string;
  linkSTL?: string;
  status?: StatusOrcamento;
  tipo: TipoVenda;
  idFeira?: number;
  valor?: number;
  quantidade?: number;
}

export interface AtualizarOrcamentoInput {
  nomeCliente?: string;
  telefoneCliente?: string;
  descricao?: string;
  linkSTL?: string;
  status?: StatusOrcamento;
  tipo?: TipoVenda;
  idFeira?: number;
  valor?: number;
  quantidade?: number;
}

// ── Assinatura ───────────────────────────────────────────────────────────────

export type StatusAssinante = 'ATIVO' | 'PAUSADO' | 'CANCELADO';
export type StatusCiclo =
  | 'PENDENTE'
  | 'EM_PREPARO'
  | 'ENVIADO'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface PlanoAssinatura {
  id: number;
  nome: string;
  descricao?: string;
  valor: number;
  ativo: boolean;
  dataInclusao: string;
}

export interface PlanoAssinaturaInput {
  nome: string;
  descricao?: string;
  valor: number;
  ativo: boolean;
}

export interface Assinante {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  enderecoEntrega?: string;
  status: StatusAssinante;
  idPlano: number;
  plano?: PlanoAssinatura;
  dataInclusao: string;
}

export interface AssinanteInput {
  nome: string;
  email?: string;
  telefone?: string;
  enderecoEntrega?: string;
  idPlano: number;
  status: StatusAssinante;
}

export interface ItemCicloAssinatura {
  id: number;
  idCiclo: number;
  nomeProduto: string;
  quantidade: number;
  observacao?: string;
}

export interface ItemCicloAssinaturaInput {
  nomeProduto: string;
  quantidade: number;
  observacao?: string;
}

export interface CicloAssinatura {
  id: number;
  idAssinante: number;
  assinante?: Assinante;
  mesReferencia: number;
  anoReferencia: number;
  status: StatusCiclo;
  codigoRastreio?: string;
  dataEnvio?: string;
  observacao?: string;
  dataInclusao: string;
  itens: ItemCicloAssinatura[];
}

export interface CicloAssinaturaInput {
  idAssinante: number;
  mesReferencia: number;
  anoReferencia: number;
  status?: StatusCiclo;
  codigoRastreio?: string;
  observacao?: string;
  itens: ItemCicloAssinaturaInput[];
}

export interface AlterarCicloAssinaturaInput {
  status: StatusCiclo;
  codigoRastreio?: string;
  observacao?: string;
  itens: ItemCicloAssinaturaInput[];
}

export interface PesquisarAssinantesInput {
  pagina?: number;
  tamanhoPagina?: number;
  termo?: string;
  status?: StatusAssinante;
  idPlano?: number;
}

export interface PesquisarCiclosInput {
  pagina?: number;
  tamanhoPagina?: number;
  idAssinante?: number;
  status?: StatusCiclo;
  mes?: number;
  ano?: number;
}

export interface ItemKitMensal {
  id: number;
  idKit: number;
  nomeProduto: string;
  quantidade: number;
  observacao?: string;
}

export interface ItemKitMensalInput {
  nomeProduto: string;
  quantidade: number;
  observacao?: string;
}

export interface KitMensal {
  id: number;
  idPlano: number;
  plano?: PlanoAssinatura;
  mesReferencia: number;
  anoReferencia: number;
  dataInclusao: string;
  itens: ItemKitMensal[];
}

export interface KitMensalInput {
  idPlano: number;
  mesReferencia: number;
  anoReferencia: number;
  itens: ItemKitMensalInput[];
}

export interface AlterarKitMensalInput {
  itens: ItemKitMensalInput[];
}

export interface GerarCiclosResult {
  criados: number;
  ignorados: number;
}

export interface PesquisarKitsInput {
  pagina?: number;
  tamanhoPagina?: number;
  idPlano?: number;
  mes?: number;
  ano?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ResultadoPaginado<T> {
  itens: T[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
}

export interface TotalizadoresVendas {
  valorTotal: number;
  descontoTotal: number;
  valorLiquido: number;
}

export interface ResultadoPaginadoVendas extends ResultadoPaginado<Venda> {
  totalizadores: TotalizadoresVendas;
}

export interface TotalizadoresDespesas {
  valorTotal: number;
}

export interface ResultadoPaginadoDespesas extends ResultadoPaginado<Despesa> {
  totalizadores: TotalizadoresDespesas;
}
