import type { StatusOrcamento, TipoVenda } from '@/shared/lib/types/domain';

export type BudgetFormState = {
  nomeCliente: string;
  telefoneCliente: string;
  descricao: string;
  linkSTL: string;
  status: StatusOrcamento;
  tipo: TipoVenda;
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
  idFeira: '',
  valor: 0,
  quantidade: '',
};

export const ALL_STATUSES_ORCAMENTO: StatusOrcamento[] = [
  'PENDENTE',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'PRODUZIDO',
  'FINALIZADO',
];

export const STATUS_ORCAMENTO_LABEL: Record<StatusOrcamento, string> = {
  PENDENTE: 'Pendente',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  PRODUZIDO: 'Produzido',
  FINALIZADO: 'Finalizado',
};
