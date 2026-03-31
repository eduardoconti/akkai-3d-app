export type ProductFormState = {
  nome: string;
  codigo: string;
  descricao: string;
  estoqueMinimo: number | '';
  idCategoria: number | '';
  valor: number;
};

export type ProductFormErrors = Partial<
  Record<'nome' | 'codigo' | 'estoqueMinimo' | 'idCategoria' | 'valor', string>
>;

export const initialProductFormState: ProductFormState = {
  nome: '',
  codigo: '',
  descricao: '',
  estoqueMinimo: '',
  idCategoria: '',
  valor: 0,
};
