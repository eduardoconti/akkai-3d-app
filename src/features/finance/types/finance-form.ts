import type { MeioPagamento } from '@/shared/lib/types/domain';

export type WalletFormState = {
  nome: string;
  ativa: boolean;
  meiosPagamento: MeioPagamento[];
};

export type WalletFormErrors = {
  nome?: string;
};

export const initialWalletFormState: WalletFormState = {
  nome: '',
  ativa: true,
  meiosPagamento: [],
};

export const ALL_MEIOS_PAGAMENTO: MeioPagamento[] = ['DIN', 'DEB', 'CRE', 'PIX'];

export const MEIO_PAGAMENTO_LABEL: Record<MeioPagamento, string> = {
  DIN: 'Dinheiro',
  DEB: 'Débito',
  CRE: 'Crédito',
  PIX: 'PIX',
};

export type ExpenseFormState = {
  dataLancamento: string;
  descricao: string;
  valor: number;
  idCategoria: number | '';
  meioPagamento: MeioPagamento;
  idCarteira: number | '';
  observacao: string;
};

export type ExpenseFormErrors = {
  dataLancamento?: string;
  descricao?: string;
  valor?: string;
  idCategoria?: string;
  idCarteira?: string;
  observacao?: string;
};

function getCurrentDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const initialExpenseFormState: ExpenseFormState = {
  dataLancamento: getCurrentDateInput(),
  descricao: '',
  valor: 0,
  idCategoria: '',
  meioPagamento: 'PIX',
  idCarteira: '',
  observacao: '',
};

export function convertDateToApiDateFormat(value: string): string | null {
  return value || null;
}

export function convertDateToApiDateTimeFormat(value: string): string | null {
  if (!value) {
    return null;
  }

  return `${value}T00:00:00-03:00`;
}

export function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
