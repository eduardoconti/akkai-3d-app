import { httpClient } from '@/shared/lib/api/http-client';
import type {
  AlterarCicloAssinaturaInput,
  AlterarKitMensalInput,
  Assinante,
  CicloAssinatura,
  CicloAssinaturaInput,
  GerarCiclosResult,
  KitMensal,
  KitMensalInput,
  PesquisarAssinantesInput,
  PesquisarCiclosInput,
  PesquisarKitsInput,
  PlanoAssinatura,
  PlanoAssinaturaInput,
  ResultadoPaginado,
} from '@/shared';

export function listPlanos(): Promise<PlanoAssinatura[]> {
  return httpClient.get<PlanoAssinatura[]>('/assinatura/planos');
}

export function getPlanoById(id: number): Promise<PlanoAssinatura> {
  return httpClient.get<PlanoAssinatura>(`/assinatura/planos/${id}`);
}

export function createPlano(
  input: PlanoAssinaturaInput,
): Promise<PlanoAssinatura> {
  return httpClient.post<PlanoAssinatura>('/assinatura/planos', input);
}

export function updatePlano(
  id: number,
  input: PlanoAssinaturaInput,
): Promise<PlanoAssinatura> {
  return httpClient.put<PlanoAssinatura>(`/assinatura/planos/${id}`, input);
}

export function deletePlano(id: number): Promise<void> {
  return httpClient.delete<void>(`/assinatura/planos/${id}`);
}

export function listAssinantes(
  query?: PesquisarAssinantesInput,
): Promise<ResultadoPaginado<Assinante>> {
  return httpClient.get<ResultadoPaginado<Assinante>>(
    '/assinatura/assinantes',
    query,
  );
}

export function getAssinanteById(id: number): Promise<Assinante> {
  return httpClient.get<Assinante>(`/assinatura/assinantes/${id}`);
}

export function createAssinante(input: {
  nome: string;
  email?: string;
  telefone?: string;
  enderecoEntrega?: string;
  idPlano: number;
  status?: string;
}): Promise<Assinante> {
  return httpClient.post<Assinante>('/assinatura/assinantes', input);
}

export function updateAssinante(
  id: number,
  input: {
    nome: string;
    email?: string;
    telefone?: string;
    enderecoEntrega?: string;
    idPlano: number;
    status: string;
  },
): Promise<Assinante> {
  return httpClient.put<Assinante>(`/assinatura/assinantes/${id}`, input);
}

export function deleteAssinante(id: number): Promise<void> {
  return httpClient.delete<void>(`/assinatura/assinantes/${id}`);
}

export function listCiclos(
  query?: PesquisarCiclosInput,
): Promise<ResultadoPaginado<CicloAssinatura>> {
  return httpClient.get<ResultadoPaginado<CicloAssinatura>>(
    '/assinatura/ciclos',
    query,
  );
}

export function getCicloById(id: number): Promise<CicloAssinatura> {
  return httpClient.get<CicloAssinatura>(`/assinatura/ciclos/${id}`);
}

export function createCiclo(
  input: CicloAssinaturaInput,
): Promise<CicloAssinatura> {
  return httpClient.post<CicloAssinatura>('/assinatura/ciclos', input);
}

export function updateCiclo(
  id: number,
  input: AlterarCicloAssinaturaInput,
): Promise<CicloAssinatura> {
  return httpClient.put<CicloAssinatura>(`/assinatura/ciclos/${id}`, input);
}

export function deleteCiclo(id: number): Promise<void> {
  return httpClient.delete<void>(`/assinatura/ciclos/${id}`);
}

export function listKits(
  query?: PesquisarKitsInput,
): Promise<ResultadoPaginado<KitMensal>> {
  return httpClient.get<ResultadoPaginado<KitMensal>>(
    '/assinatura/kits',
    query,
  );
}

export function getKitById(id: number): Promise<KitMensal> {
  return httpClient.get<KitMensal>(`/assinatura/kits/${id}`);
}

export function createKit(input: KitMensalInput): Promise<KitMensal> {
  return httpClient.post<KitMensal>('/assinatura/kits', input);
}

export function updateKit(
  id: number,
  input: AlterarKitMensalInput,
): Promise<KitMensal> {
  return httpClient.put<KitMensal>(`/assinatura/kits/${id}`, input);
}

export function deleteKit(id: number): Promise<void> {
  return httpClient.delete<void>(`/assinatura/kits/${id}`);
}

export function gerarCiclosMensais(id: number): Promise<GerarCiclosResult> {
  return httpClient.post<GerarCiclosResult>(
    `/assinatura/kits/${id}/gerar-ciclos`,
    {},
  );
}
