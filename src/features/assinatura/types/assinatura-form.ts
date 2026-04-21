import type { StatusAssinante, StatusCiclo } from '@/shared';

// ── Plano ────────────────────────────────────────────────────────────────────

export type PlanoFormState = {
  nome: string;
  descricao: string;
  valor: number | '';
  ativo: boolean;
};

export type PlanoFormErrors = {
  nome?: string;
  valor?: string;
};

export const initialPlanoFormState: PlanoFormState = {
  nome: '',
  descricao: '',
  valor: '',
  ativo: true,
};

// ── Assinante ────────────────────────────────────────────────────────────────

export type AssinanteFormState = {
  nome: string;
  email: string;
  telefone: string;
  enderecoEntrega: string;
  idPlano: number | '';
  status: StatusAssinante;
};

export type AssinanteFormErrors = {
  nome?: string;
  idPlano?: string;
};

export const initialAssinanteFormState: AssinanteFormState = {
  nome: '',
  email: '',
  telefone: '',
  enderecoEntrega: '',
  idPlano: '',
  status: 'ATIVO',
};

export const STATUS_ASSINANTE_LABEL: Record<StatusAssinante, string> = {
  ATIVO: 'Ativo',
  PAUSADO: 'Pausado',
  CANCELADO: 'Cancelado',
};

export const STATUS_ASSINANTE_COLOR: Record<
  StatusAssinante,
  'success' | 'warning' | 'error' | 'default'
> = {
  ATIVO: 'success',
  PAUSADO: 'warning',
  CANCELADO: 'error',
};

// ── Ciclo ────────────────────────────────────────────────────────────────────

export type ItemCicloFormState = {
  idProduto: number | '';
  quantidade: number | '';
  observacao: string;
};

export type CicloFormState = {
  idAssinante: number | '';
  mesReferencia: number;
  anoReferencia: number;
  status: StatusCiclo;
  codigoRastreio: string;
  observacao: string;
  itens: ItemCicloFormState[];
};

export type CicloFormErrors = {
  idAssinante?: string;
  itens?: string;
};

export const initialItemCicloFormState: ItemCicloFormState = {
  idProduto: '',
  quantidade: '',
  observacao: '',
};

export const initialCicloFormState: CicloFormState = {
  idAssinante: '',
  mesReferencia: new Date().getMonth() + 1,
  anoReferencia: new Date().getFullYear(),
  status: 'PENDENTE',
  codigoRastreio: '',
  observacao: '',
  itens: [{ ...initialItemCicloFormState }],
};

export const STATUS_CICLO_LABEL: Record<StatusCiclo, string> = {
  PENDENTE: 'Pendente',
  EM_PREPARO: 'Em preparo',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const STATUS_CICLO_COLOR: Record<
  StatusCiclo,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  PENDENTE: 'default',
  EM_PREPARO: 'warning',
  ENVIADO: 'info',
  ENTREGUE: 'success',
  CANCELADO: 'error',
};

// ── Kit Mensal ───────────────────────────────────────────────────────────────

export type KitFormState = {
  idPlano: number | '';
  mesReferencia: number;
  anoReferencia: number;
  itens: ItemCicloFormState[];
};

export type KitFormErrors = {
  idPlano?: string;
  itens?: string;
};

export const initialKitFormState: KitFormState = {
  idPlano: '',
  mesReferencia: new Date().getMonth() + 1,
  anoReferencia: new Date().getFullYear(),
  itens: [{ ...initialItemCicloFormState }],
};

// ─────────────────────────────────────────────────────────────────────────────

export const MESES_LABEL: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};
