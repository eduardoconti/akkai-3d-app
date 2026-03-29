export type ProductFormState = {
  nome: string;
  codigo: string;
  descricao: string;
  idCategoria: number | '';
  valor: number;
};

export type ProductFormErrors = Partial<
  Record<'nome' | 'codigo' | 'idCategoria' | 'valor', string>
>;

export const initialProductFormState: ProductFormState = {
  nome: '',
  codigo: '',
  descricao: '',
  idCategoria: '',
  valor: 0,
};
