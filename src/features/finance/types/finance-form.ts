import type {
  CategoriaDespesa,
  MeioPagamento,
} from '@/shared/lib/types/domain';

export type WalletFormState = {
  nome: string;
  ativa: boolean;
};

export type WalletFormErrors = {
  nome?: string;
};

export const initialWalletFormState: WalletFormState = {
  nome: '',
  ativa: true,
};

export type ExpenseFormState = {
  dataLancamento: string;
  descricao: string;
  valor: number;
  categoria: CategoriaDespesa;
  meioPagamento: MeioPagamento;
  idCarteira: number | '';
  observacao: string;
};

export type ExpenseFormErrors = {
  dataLancamento?: string;
  descricao?: string;
  valor?: string;
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
  categoria: 'DESPESA_FIXA',
  meioPagamento: 'PIX',
  idCarteira: '',
  observacao: '',
};

export function convertDateToApiFormat(value: string): string | null {
  return value || null;
}

export function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
