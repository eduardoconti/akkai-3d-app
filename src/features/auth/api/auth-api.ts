import { httpClient } from '@/shared/lib/api/http-client';

export interface AuthUser {
  id: number;
  name: string;
  login: string;
  role: string;
  permissions: string[];
}

export interface LoginInput {
  login: string;
  password: string;
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
