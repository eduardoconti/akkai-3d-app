import { httpClient } from '@/shared/lib/api/http-client';

export interface AuthUser {
  id: number;
  name: string;
  login: string;
  isActive: boolean;
  roleId: number;
  role: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  login: string;
  password: string;
}

export interface AuthRole {
  id: number;
  name: string;
  description?: string;
}

export interface UpdateProfileInput {
  name: string;
  login: string;
  isActive: boolean;
  roleId: number;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function login(input: LoginInput): Promise<AuthUser> {
  return httpClient.post<AuthUser>('/auth/login', input);
}

export function refresh(): Promise<AuthUser> {
  return httpClient.post<AuthUser>('/auth/refresh', {});
}

export function logout(): Promise<void> {
  return httpClient.post<void>('/auth/logout', {});
}

export function me(): Promise<AuthUser> {
  return httpClient.get<AuthUser>('/auth/me');
}

export function listRoles(): Promise<AuthRole[]> {
  return httpClient.get<AuthRole[]>('/auth/roles');
}

export function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return httpClient.put<AuthUser>('/auth/me', input);
}

export function updatePassword(input: UpdatePasswordInput): Promise<void> {
  return httpClient.put<void>('/auth/me/password', input);
}
