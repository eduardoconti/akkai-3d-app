export type BudgetFormState = {
  nomeCliente: string;
  telefoneCliente: string;
  descricao: string;
  linkSTL: string;
};

export type BudgetFormErrors = {
  nomeCliente?: string;
  telefoneCliente?: string;
  descricao?: string;
  linkSTL?: string;
};

export const initialBudgetFormState: BudgetFormState = {
  nomeCliente: '',
  telefoneCliente: '',
  descricao: '',
  linkSTL: '',
};
