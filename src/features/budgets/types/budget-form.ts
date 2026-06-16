import type {
  CanalAtendimentoOrcamento,
  StatusOrcamento,
  TipoVenda,
} from '@/shared/lib/types/domain';

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
  quantidade: number | '';
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
  quantidade?: string;
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
  quantidade: '',
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

export const STATUSES_ALTERAVEIS_ORCAMENTO = ALL_STATUSES_ORCAMENTO.filter(
  (status) => status !== 'FINALIZADO',
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
