import { httpClient } from '@/shared/lib/api/http-client';

export interface AdminUser {
  id: number;
  login: string;
  name: string;
  isActive: boolean;
  idPapel: number;
  papel: string;
  quantidadePermissoes: number;
  quantidadeAjustes: number;
}

export interface AvailablePermission {
  name: string;
  description?: string;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  description?: string;
  permissoes: string[];
  quantidadeUsuarios: number;
  /** Papéis do sistema não podem ser renomeados nem excluídos. */
  protegido: boolean;
}

export interface SaveRoleInput {
  name: string;
  description?: string;
  /** Conjunto final de permissões do papel. */
  permissoes: string[];
}

export interface UserPermissions {
  id: number;
  login: string;
  name: string;
  isActive: boolean;
  idPapel: number;
  papel: string;
  permissoesEfetivas: string[];
  concedidas: string[];
  revogadas: string[];
}

export interface SetUserPermissionsInput {
  idPapel: number;
  /** Conjunto final de permissões do usuário. */
  permissoes: string[];
}

const BASE_PATH = '/auth/administracao';

export function listAdminUsers(): Promise<AdminUser[]> {
  return httpClient.get<AdminUser[]>(`${BASE_PATH}/usuarios`);
}

export function listAvailablePermissions(): Promise<AvailablePermission[]> {
  return httpClient.get<AvailablePermission[]>(`${BASE_PATH}/permissoes`);
}

export function listRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  return httpClient.get<RoleWithPermissions[]>(`${BASE_PATH}/papeis`);
}

export function getUserPermissions(userId: number): Promise<UserPermissions> {
  return httpClient.get<UserPermissions>(
    `${BASE_PATH}/usuarios/${userId}/permissoes`,
  );
}

export function setUserPermissions(
  userId: number,
  input: SetUserPermissionsInput,
): Promise<UserPermissions> {
  return httpClient.put<UserPermissions>(
    `${BASE_PATH}/usuarios/${userId}/permissoes`,
    input,
  );
}

export function createRole(input: SaveRoleInput): Promise<RoleWithPermissions> {
  return httpClient.post<RoleWithPermissions>(`${BASE_PATH}/papeis`, input);
}

export function updateRole(
  roleId: number,
  input: SaveRoleInput,
): Promise<RoleWithPermissions> {
  return httpClient.put<RoleWithPermissions>(
    `${BASE_PATH}/papeis/${roleId}`,
    input,
  );
}

export function deleteRole(roleId: number): Promise<void> {
  return httpClient.delete<void>(`${BASE_PATH}/papeis/${roleId}`);
}
