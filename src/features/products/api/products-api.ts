import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Categoria,
  DetalheProduto,
  EstoqueProduto,
  EstoqueInput,
  MovimentacaoEstoque,
  OrigemEntradaEstoque,
  OrigemSaidaEstoque,
  PesquisaPaginada,
  Produto,
  ProdutoInput,
  ResultadoPaginado,
} from '@/shared/lib/types/domain';

export interface CategoriaInput {
  nome: string;
  idAscendente?: number;
}

export function listProducts(
  query: PesquisaPaginada,
): Promise<ResultadoPaginado<Produto>> {
  return httpClient.get<ResultadoPaginado<Produto>>('/produto', query);
}

export function listStock(
  query: PesquisaPaginada,
): Promise<ResultadoPaginado<EstoqueProduto>> {
  return httpClient.get<ResultadoPaginado<EstoqueProduto>>('/produto/estoque', query);
}

export function listStockMovements(
  id: number,
  query: PesquisaPaginada,
): Promise<ResultadoPaginado<MovimentacaoEstoque>> {
  return httpClient.get<ResultadoPaginado<MovimentacaoEstoque>>(
    `/produto/${id}/estoque/movimentacoes`,
    query,
  );
}

export async function listAllProducts(): Promise<Produto[]> {
  const produtos: Produto[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const resposta = await listProducts({
      pagina,
      tamanhoPagina: 50,
      termo: '',
      ordenarPor: 'nome',
      direcao: 'asc',
    });
    produtos.push(...resposta.itens);
    totalPaginas = resposta.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return produtos;
}

export function listCategories(
  query: PesquisaPaginada,
): Promise<ResultadoPaginado<Categoria>> {
  return httpClient.get<ResultadoPaginado<Categoria>>('/produto/categorias', query);
}

export async function listAllCategories(): Promise<Categoria[]> {
  const categorias: Categoria[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const resposta = await listCategories({ pagina, tamanhoPagina: 50 });
    categorias.push(...resposta.itens);
    totalPaginas = resposta.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return categorias;
}

export function getCategoryById(id: number): Promise<Categoria> {
  return httpClient.get<Categoria>(`/produto/categorias/${id}`);
}

export function getProductById(id: number): Promise<DetalheProduto> {
  return httpClient.get<DetalheProduto>(`/produto/${id}`);
}

export function createProduct(input: ProdutoInput): Promise<Produto> {
  return httpClient.post<Produto>('/produto', input);
}

export function updateProduct(id: number, input: ProdutoInput): Promise<Produto> {
  return httpClient.put<Produto>(`/produto/${id}`, input);
}

export function deleteProduct(id: number): Promise<void> {
  return httpClient.delete<void>(`/produto/${id}`);
}

export function addProductStockEntry(
  id: number,
  input: EstoqueInput<OrigemEntradaEstoque>,
): Promise<void> {
  return httpClient.post<void>(`/produto/${id}/estoque/entrada`, input);
}

export function addProductStockExit(
  id: number,
  input: EstoqueInput<OrigemSaidaEstoque>,
): Promise<void> {
  return httpClient.post<void>(`/produto/${id}/estoque/saida`, input);
}

export function createCategory(input: CategoriaInput): Promise<Categoria> {
  return httpClient.post<Categoria>('/produto/categorias', input);
}

export function updateCategory(
  id: number,
  input: CategoriaInput,
): Promise<Categoria> {
  return httpClient.put<Categoria>(`/produto/categorias/${id}`, input);
}

export function deleteCategory(id: number): Promise<void> {
  return httpClient.delete<void>(`/produto/categorias/${id}`);
}
