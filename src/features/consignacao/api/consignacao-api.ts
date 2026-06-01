import { httpClient } from '@/shared/lib/api/http-client';
import type {
  Consignacao,
  InserirConsignacaoInput,
  PesquisaPaginadaConsignacoes,
  PesquisaPaginadaRevendedores,
  RegistrarDevolucaoConsignadaInput,
  RegistrarVendasConsignadasInput,
  ResultadoPaginado,
  Revendedor,
  RevendedorInput,
} from '@/shared/lib/types/domain';

export function listarRevendedores(
  query: PesquisaPaginadaRevendedores,
): Promise<ResultadoPaginado<Revendedor>> {
  const { pagina, tamanhoPagina, termo, status, ordenarPor } = query;

  return httpClient.get<ResultadoPaginado<Revendedor>>(
    '/consignacao/revendedores',
    { pagina, tamanhoPagina, termo, status, ordenarPor },
  );
}

export async function listarTodosRevendedoresAtivos(): Promise<Revendedor[]> {
  const revendedores: Revendedor[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const resposta = await listarRevendedores({
      pagina,
      tamanhoPagina: 50,
      termo: '',
      status: 'ATIVO',
      ordenarPor: 'nome',
    });
    revendedores.push(...resposta.itens);
    totalPaginas = resposta.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return revendedores;
}

export function obterRevendedorPorId(id: number): Promise<Revendedor> {
  return httpClient.get<Revendedor>(`/consignacao/revendedores/${id}`);
}

export function criarRevendedor(dados: RevendedorInput): Promise<Revendedor> {
  return httpClient.post<Revendedor>('/consignacao/revendedores', dados);
}

export function atualizarRevendedor(
  id: number,
  dados: RevendedorInput,
): Promise<Revendedor> {
  return httpClient.put<Revendedor>(`/consignacao/revendedores/${id}`, dados);
}

export function listarConsignacoes(
  query: PesquisaPaginadaConsignacoes,
): Promise<ResultadoPaginado<Consignacao>> {
  const { pagina, tamanhoPagina, termo, idRevendedor, status, ordenarPor } =
    query;

  return httpClient.get<ResultadoPaginado<Consignacao>>('/consignacao', {
    pagina,
    tamanhoPagina,
    termo,
    idRevendedor,
    status,
    ordenarPor,
  });
}

export function obterConsignacaoPorId(id: number): Promise<Consignacao> {
  return httpClient.get<Consignacao>(`/consignacao/${id}`);
}

export function criarConsignacao(
  dados: InserirConsignacaoInput,
): Promise<Consignacao> {
  return httpClient.post<Consignacao>('/consignacao', dados);
}

export function registrarVendasConsignadas(
  id: number,
  dados: RegistrarVendasConsignadasInput,
): Promise<Consignacao> {
  return httpClient.post<Consignacao>(`/consignacao/${id}/vendas`, dados);
}

export function registrarVendasRevendedorConsignado(
  idRevendedor: number,
  dados: RegistrarVendasConsignadasInput,
): Promise<Consignacao[]> {
  return httpClient.post<Consignacao[]>(
    `/consignacao/revendedores/${idRevendedor}/vendas`,
    dados,
  );
}

export function registrarDevolucaoConsignada(
  idConsignacao: number,
  idItem: number,
  dados: RegistrarDevolucaoConsignadaInput,
): Promise<Consignacao> {
  return httpClient.post<Consignacao>(
    `/consignacao/${idConsignacao}/itens/${idItem}/devolucoes`,
    dados,
  );
}
