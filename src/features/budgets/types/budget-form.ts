import type {
  CanalAtendimentoOrcamento,
  StatusOrcamento,
  TipoVenda,
} from '@/shared/lib/types/domain';

/** Limites do backend (mesmos de uma venda). */
export const MAX_BUDGET_ITEMS = 12;
export const MAX_BUDGET_ITEM_QUANTITY = 500;

export type BudgetFormItem = {
  idProduto: number | null;
  quantidade: number;
};

export type BudgetFormState = {
  nomeCliente: string;
  telefoneCliente: string;
  descricao: string;
  linkSTL: string;
  status: StatusOrcamento;
  tipo: TipoVenda;
  canalAtendimento: CanalAtendimentoOrcamento | '';
  idFeira: number | '';
  valor: number;
  itens: BudgetFormItem[];
};

export type BudgetFormErrors = {
  nomeCliente?: string;
  telefoneCliente?: string;
  descricao?: string;
  linkSTL?: string;
  tipo?: string;
  canalAtendimento?: string;
  idFeira?: string;
  valor?: string;
  itens?: string;
};

export const initialBudgetFormState: BudgetFormState = {
  nomeCliente: '',
  telefoneCliente: '',
  descricao: '',
  linkSTL: '',
  status: 'PENDENTE',
  tipo: 'LOJA',
  canalAtendimento: '',
  idFeira: '',
  valor: 0,
  itens: [],
};

export const ALL_STATUSES_ORCAMENTO: StatusOrcamento[] = [
  'PENDENTE',
  'ATENDIMENTO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'PRODUZIDO',
  'FINALIZADO',
  'CANCELADO',
];

export const STATUSES_ALTERAVEIS_ORCAMENTO = ALL_STATUSES_ORCAMENTO;

/**
 * Status exibidos na pesquisa de orçamentos quando nenhum filtro é escolhido:
 * orçamentos encerrados (finalizados ou cancelados) ficam de fora, mas podem ser
 * incluídos pelo filtro de status.
 */
export const STATUSES_PADRAO_PESQUISA_ORCAMENTO: StatusOrcamento[] =
  ALL_STATUSES_ORCAMENTO.filter(
    (status) => status !== 'FINALIZADO' && status !== 'CANCELADO',
  );

export const STATUS_ORCAMENTO_LABEL: Record<StatusOrcamento, string> = {
  ATENDIMENTO: 'Em atendimento',
  PENDENTE: 'Pendente',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  PRODUZIDO: 'Produzido',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export const ALL_CANAIS_ATENDIMENTO_ORCAMENTO: CanalAtendimentoOrcamento[] = [
  'WPP',
  'INSTAGRAM',
];

export const CANAL_ATENDIMENTO_ORCAMENTO_LABEL: Record<
  CanalAtendimentoOrcamento,
  string
> = {
  WPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
};
