export type CategoryFormState = {
  nome: string;
  idAscendente: number | '';
};

export type CategoryFormErrors = Partial<
  Record<'nome' | 'idAscendente', string>
>;

export const initialCategoryFormState: CategoryFormState = {
  nome: '',
  idAscendente: '',
};
